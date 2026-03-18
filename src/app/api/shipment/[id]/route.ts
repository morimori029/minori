import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { Prisma, ShipmentStatus } from "@/generated/prisma";

type Params = { params: Promise<{ id: string }> };

function calcFeeRate(
  route: {
    feeType: string;
    feeRate: Prisma.Decimal | null;
    feeBasis: string;
    feeTiers: { minAmount: number; maxAmount: number | null; feeRate: Prisma.Decimal }[];
  },
  totalAmount: number,
  monthlyCumulative: number
): number {
  if (route.feeType === "FIXED") return route.feeRate ? Number(route.feeRate) : 0;
  const base = route.feeBasis === "MONTHLY" ? monthlyCumulative : 0;
  const effective = base + totalAmount;
  const tier = [...route.feeTiers]
    .sort((a, b) => a.minAmount - b.minAmount)
    .reverse()
    .find((t) => effective >= t.minAmount);
  return tier ? Number(tier.feeRate) : 0;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { status, salesData } = body as {
    status: ShipmentStatus;
    salesData?: { grade: string; unitPrice: number; date: string; memo?: string };
  };

  if (!status) return NextResponse.json({ error: "status is required" }, { status: 400 });

  // 出荷済みへの変更 + 売上記録の作成
  if (status === "SHIPPED" && salesData) {
    const plan = await prisma.shipmentPlan.findFirst({
      where: { id, userId: user.id },
      include: {
        route: { include: { feeTiers: { orderBy: { minAmount: "asc" } } } },
        crop: true,
      },
    });
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const quantity = Number(plan.plannedAmount);
    const totalAmount = Math.round(salesData.unitPrice * quantity);

    // 今月の累計（段階手数料計算用）
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const cumResult = await prisma.salesRecord.aggregate({
      where: { userId: user.id, routeId: plan.routeId, date: { gte: startOfMonth } },
      _sum: { totalAmount: true },
    });
    const monthlyCumulative = cumResult._sum.totalAmount ?? 0;

    const feeRate = calcFeeRate(plan.route, totalAmount, monthlyCumulative);
    const feeAmount = Math.round(totalAmount * feeRate);
    const netProfit = totalAmount - feeAmount;

    await prisma.$transaction([
      prisma.shipmentPlan.updateMany({ where: { id, userId: user.id }, data: { status: "SHIPPED" } }),
      prisma.salesRecord.create({
        data: {
          userId: user.id,
          routeId: plan.routeId,
          cropId: plan.cropId,
          date: new Date(salesData.date),
          grade: salesData.grade,
          unitPrice: salesData.unitPrice,
          quantity: new Prisma.Decimal(quantity),
          totalAmount,
          feeRate: new Prisma.Decimal(feeRate),
          feeAmount,
          netProfit,
          memo: salesData.memo ?? null,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  // 通常のステータス更新
  const updated = await prisma.shipmentPlan.updateMany({
    where: { id, userId: user.id },
    data: { status },
  });
  if (updated.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const deleted = await prisma.shipmentPlan.deleteMany({ where: { id, userId: user.id } });
  if (deleted.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
