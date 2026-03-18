import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { RouteSchema, badRequest } from "@/lib/validate";

async function ensureUser(id: string, email: string) {
  await prisma.user.upsert({
    where: { id },
    create: { id, email },
    update: {},
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const routes = await prisma.route.findMany({
    where: { userId: user.id },
    include: { feeTiers: { orderBy: { minAmount: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(routes);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUser(user.id, user.email ?? "");

  const parsed = RouteSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { name, color, feeType, feeRate, feeBasis, resetDay, monthlyFee, feeTiers } = parsed.data;

  const route = await prisma.route.create({
    data: {
      userId: user.id,
      name: name.trim(),
      color,
      feeType,
      feeRate: feeRate != null ? new Prisma.Decimal(feeRate) : null,
      feeBasis,
      resetDay,
      monthlyFee: monthlyFee ?? null,
      feeTiers: feeTiers?.length ? {
        create: feeTiers.map((t) => ({
          minAmount: t.minAmount,
          maxAmount: t.maxAmount ?? null,
          feeRate: new Prisma.Decimal(t.feeRate),
        })),
      } : undefined,
    },
    include: { feeTiers: { orderBy: { minAmount: "asc" } } },
  });
  return NextResponse.json(route, { status: 201 });
}
