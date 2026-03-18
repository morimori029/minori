import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { CropSchema, badRequest } from "@/lib/validate";

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

  const crops = await prisma.crop.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(crops);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureUser(user.id, user.email ?? "");

  const parsed = CropSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { name, unit } = parsed.data;

  const crop = await prisma.crop.create({
    data: { userId: user.id, name: name.trim(), unit },
  });
  return NextResponse.json(crop, { status: 201 });
}
