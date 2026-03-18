import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";
import { ShipmentSchema, badRequest } from "@/lib/validate";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.shipmentPlan.findMany({
    where: { userId: user.id },
    include: {
      route: { select: { id: true, name: true, color: true } },
      crop: { select: { id: true, name: true, unit: true } },
    },
    orderBy: { plannedDate: "asc" },
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ShipmentSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { routeId, cropId, plannedDate, plannedAmount, memo } = parsed.data;

  const plan = await prisma.shipmentPlan.create({
    data: {
      userId: user.id,
      routeId,
      cropId,
      plannedDate: new Date(plannedDate),
      plannedAmount: new Prisma.Decimal(plannedAmount),
      memo: memo?.trim() || null,
    },
    include: {
      route: { select: { id: true, name: true, color: true } },
      crop: { select: { id: true, name: true, unit: true } },
    },
  });
  return NextResponse.json(plan, { status: 201 });
}
