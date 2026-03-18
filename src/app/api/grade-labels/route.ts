import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export type GradeItem = { code: string; label: string; sortOrder: number };

export const DEFAULT_GRADES: GradeItem[] = [
  { code: "S", label: "秀", sortOrder: 0 },
  { code: "A", label: "優", sortOrder: 1 },
  { code: "B", label: "良", sortOrder: 2 },
  { code: "X", label: "規格外", sortOrder: 3 },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const saved = await prisma.gradeLabel.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
  });

  if (saved.length === 0) return NextResponse.json(DEFAULT_GRADES);
  return NextResponse.json(saved.map(r => ({ code: r.code, label: r.label, sortOrder: r.sortOrder })));
}

// グレード一覧を丸ごと置き換える
export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const grades: GradeItem[] = await req.json();
  if (!Array.isArray(grades) || grades.length === 0) {
    return NextResponse.json({ error: "grades must be a non-empty array" }, { status: 400 });
  }
  if (grades.some(g => !g.code?.trim() || !g.label?.trim())) {
    return NextResponse.json({ error: "各グレードにコードと名称が必要です" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.gradeLabel.deleteMany({ where: { userId: user.id } }),
    prisma.gradeLabel.createMany({
      data: grades.map((g, i) => ({
        userId: user.id,
        code: g.code.trim(),
        label: g.label.trim(),
        sortOrder: i,
      })),
    }),
  ]);

  return NextResponse.json(grades.map((g, i) => ({ ...g, sortOrder: i })));
}
