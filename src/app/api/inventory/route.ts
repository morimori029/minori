import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const inventory = await prisma.inventory.findMany({
    where: { userId: user.id },
    include: { crop: { select: { id: true, name: true, unit: true } } },
    orderBy: { crop: { name: "asc" } },
  });
  return NextResponse.json(inventory);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cropId, stockAmount } = await req.json();
  if (!cropId || stockAmount == null) {
    return NextResponse.json({ error: "cropId and stockAmount are required" }, { status: 400 });
  }

  const record = await prisma.inventory.upsert({
    where: { userId_cropId: { userId: user.id, cropId } },
    create: { userId: user.id, cropId, stockAmount: new Prisma.Decimal(stockAmount) },
    update: { stockAmount: new Prisma.Decimal(stockAmount) },
    include: { crop: { select: { id: true, name: true, unit: true } } },
  });
  return NextResponse.json(record);
}
