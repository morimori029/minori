import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { name, color, feeType, feeRate, feeBasis, resetDay, monthlyFee, isActive, feeTiers } = await req.json();

  const route = await prisma.$transaction(async (tx) => {
    if (feeTiers !== undefined) {
      await tx.feeTier.deleteMany({ where: { routeId: id } });
    }
    return tx.route.update({
      where: { id, userId: user.id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(feeType && { feeType }),
        ...(feeRate != null && { feeRate: new Prisma.Decimal(feeRate) }),
        ...(feeBasis && { feeBasis }),
        ...(resetDay != null && { resetDay }),
        ...(monthlyFee != null && { monthlyFee }),
        ...(isActive != null && { isActive }),
        ...(feeTiers?.length > 0 && {
          feeTiers: {
            create: feeTiers.map((t: { minAmount: number; maxAmount?: number | null; feeRate: number }) => ({
              minAmount: t.minAmount,
              maxAmount: t.maxAmount ?? null,
              feeRate: new Prisma.Decimal(t.feeRate),
            })),
          },
        }),
      },
      include: { feeTiers: { orderBy: { minAmount: "asc" } } },
    });
  });
  return NextResponse.json(route);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.route.delete({ where: { id, userId: user.id } });
  return new NextResponse(null, { status: 204 });
}
