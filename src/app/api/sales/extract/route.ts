import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMimeType = typeof SUPPORTED_MIME_TYPES[number];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageBase64, mimeType } = await req.json();
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "imageBase64 and mimeType are required" }, { status: 400 });
  }
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return NextResponse.json({ error: "対応形式は JPEG / PNG / GIF / WebP です" }, { status: 400 });
  }

  // base64は元ファイルの約1.33倍サイズになるため、5MBの上限をサーバー側でも検証
  if (imageBase64.length > 7 * 1024 * 1024) {
    return NextResponse.json({ error: "画像サイズが大きすぎます（5MB以下にしてください）" }, { status: 413 });
  }

  // ユーザーの作物・グレード一覧を取得（AIへのヒントとして使う）
  const [crops, grades] = await Promise.all([
    prisma.crop.findMany({ where: { userId: user.id }, select: { name: true } }),
    prisma.gradeLabel.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } }),
  ]);
  const cropNames = crops.map(c => c.name).join("、");
  const gradeHint = grades.length > 0
    ? grades.map(g => `"${g.code}"=${g.label}`).join("、")
    : `"S"=秀、"A"=優、"B"=良、"X"=規格外`;
  const defaultGradeCode = grades[0]?.code ?? "A";

  const message = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType as SupportedMimeType, data: imageBase64 },
          },
          {
            type: "text",
            text: `この画像は農産物の売上伝票・精算書です。以下の情報をJSON形式で抽出してください。

登録済みの作物: ${cropNames || "不明"}
利用可能なグレードコード: ${gradeHint}

抽出する項目:
- date: 日付（YYYY-MM-DD形式）
- cropName: 作物名（登録済みの作物名と最も近いものを選んでください）
- grade: 品質グレード（上記のグレードコードから最も近いものを選んでください。判断できない場合は"${defaultGradeCode}"）
- quantity: 数量（数値のみ、単位なし）
- unitPrice: 単価（円、数値のみ）
- memo: 伝票番号や特記事項（あれば）

見つからない項目は null にしてください。余分な説明は不要です。JSONのみ返してください。`,
          },
        ],
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "伝票から情報を読み取れませんでした" }, { status: 422 });
  }

  try {
    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json(extracted);
  } catch {
    return NextResponse.json({ error: "解析に失敗しました" }, { status: 422 });
  }
}
