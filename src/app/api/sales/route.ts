import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { SalesSchema, badRequest } from "@/lib/validate";

async function ensureUser(id: string, email: string) {
  await prisma.user.upsert({
    where: { id },
    create: { id, email },
    update: {},
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const dashboard = searchParams.get("dashboard") === "1";
  const month = searchParams.get("month"); // YYYY-MM
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));

  if (dashboard) return getDashboardData(user.id);

  const where: Prisma.SalesRecordWhereInput = { userId: user.id };
  if (month) {
    const [year, m] = month.split("-").map(Number);
    where.date = { gte: new Date(year, m - 1, 1), lt: new Date(year, m, 1) };
  }

  const [records, total] = await Promise.all([
    prisma.salesRecord.findMany({
      where,
      include: {
        route: { select: { id: true, name: true, color: true } },
        crop: { select: { id: true, name: true, unit: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.salesRecord.count({ where }),
  ]);
  return NextResponse.json({ records, total, page, limit });
}

// 売上入力ページ用: 今月の累計売上のみ返す軽量エンドポイント
async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const result = await prisma.salesRecord.aggregate({
    where: { userId, date: { gte: startOfMonth } },
    _sum: { totalAmount: true },
  });
  return NextResponse.json({
    kpi: { totalSales: result._sum.totalAmount ?? 0 },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUser(user.id, user.email ?? "");

  const parsed = SalesSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { routeId, cropId, date, grade, unitPrice, quantity, totalAmount, feeRate, feeAmount, netProfit, memo } = parsed.data;

  const record = await prisma.salesRecord.create({
    data: {
      userId: user.id,
      routeId,
      cropId,
      date: new Date(date),
      grade,
      unitPrice,
      quantity: new Prisma.Decimal(quantity),
      totalAmount,
      feeRate: new Prisma.Decimal(feeRate),
      feeAmount,
      netProfit,
      memo: memo ?? null,
    },
    include: {
      route: { select: { id: true, name: true, color: true } },
      crop: { select: { id: true, name: true, unit: true } },
    },
  });
  return NextResponse.json(record, { status: 201 });
}
