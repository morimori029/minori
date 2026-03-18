import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { InvoiceSchema, badRequest } from "@/lib/validate";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const invoices = await prisma.invoice.findMany({
    where: { userId: user.id },
    orderBy: { issueDate: "desc" },
  });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = InvoiceSchema.safeParse(await req.json());
  if (!parsed.success) return badRequest(parsed.error.issues);
  const { clientName, clientAddress, bankInfo, issueDate, dueDate, items, memo } = parsed.data;

  const subtotal = items.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  // 請求書番号：YYYY-MM-連番（重複時はリトライで競合回避）
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let invoice;
  for (let attempt = 1; attempt <= 5; attempt++) {
    const count = await prisma.invoice.count({
      where: { userId: user.id, invoiceNumber: { startsWith: prefix } },
    });
    const invoiceNumber = `${prefix}-${String(count + attempt).padStart(3, "0")}`;
    try {
      invoice = await prisma.invoice.create({
        data: {
          userId: user.id,
          invoiceNumber,
          clientName: clientName.trim(),
          clientAddress: clientAddress?.trim() || null,
          bankInfo: bankInfo?.trim() || null,
          issueDate: new Date(issueDate),
          dueDate: new Date(dueDate),
          subtotal,
          tax,
          total,
          memo: memo?.trim() || null,
          items: {
            create: items.map((i: { description: string; quantity: number; unitPrice: number; amount: number }) => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              amount: i.amount,
            })),
          },
        },
        include: { items: true },
      });
      break;
    } catch (e: unknown) {
      const isUniqueViolation = e instanceof Error && e.message.includes("Unique constraint");
      if (!isUniqueViolation || attempt === 5) throw e;
    }
  }
  return NextResponse.json(invoice, { status: 201 });
}
