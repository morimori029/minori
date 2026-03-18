import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.user.findUnique({ where: { id: user.id } });
  if (!profile) {
    // 未作成なら空のプロフィールを返す
    return NextResponse.json({ id: user.id, email: user.email, name: null, farmName: null, location: null, invoiceNumber: null });
  }
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, farmName, location, invoiceNumber } = await req.json();

  const profile = await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email ?? "",
      name: name?.trim() || null,
      farmName: farmName?.trim() || null,
      location: location?.trim() || null,
      invoiceNumber: invoiceNumber?.trim() || null,
    },
    update: {
      name: name?.trim() || null,
      farmName: farmName?.trim() || null,
      location: location?.trim() || null,
      invoiceNumber: invoiceNumber?.trim() || null,
    },
  });
  return NextResponse.json(profile);
}
