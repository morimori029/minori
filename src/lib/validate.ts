import { z } from "zod";
import { NextResponse } from "next/server";

export function badRequest(errors: z.ZodIssue[]) {
  const messages = errors.map((e) => `${e.path.join(".")}: ${e.message}`);
  return NextResponse.json({ error: messages.join(", ") }, { status: 400 });
}

// ---- スキーマ定義 ----

export const RouteSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3b82f6"),
  feeType: z.enum(["FIXED", "TIER"]),
  feeRate: z.number().min(0).max(1).nullable().optional(),
  feeBasis: z.enum(["MONTHLY", "PER_TRANSACTION", "ANNUAL"]).default("MONTHLY"),
  resetDay: z.number().int().min(1).max(31).default(1),
  monthlyFee: z.number().int().min(0).nullable().optional(),
  feeTiers: z.array(
    z.object({
      minAmount: z.number().int().min(0),
      maxAmount: z.number().int().min(0).nullable().optional(),
      feeRate: z.number().min(0).max(1),
    })
  ).optional(),
});

export const CropSchema = z.object({
  name: z.string().min(1).max(50),
  unit: z.enum(["kg", "個", "箱", "パック"]).default("kg"),
});

export const SalesSchema = z.object({
  routeId: z.string().uuid(),
  cropId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grade: z.string().min(1).max(10),
  unitPrice: z.number().int().min(0),
  quantity: z.number().min(0),
  totalAmount: z.number().int().min(0),
  feeRate: z.number().min(0).max(1).default(0),
  feeAmount: z.number().int().min(0).default(0),
  netProfit: z.number().int(),
  memo: z.string().max(200).nullable().optional(),
});

export const InvoiceSchema = z.object({
  clientName: z.string().min(1).max(100),
  clientAddress: z.string().max(200).nullable().optional(),
  bankInfo: z.string().max(500).nullable().optional(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  memo: z.string().max(500).nullable().optional(),
  items: z.array(
    z.object({
      description: z.string().min(1).max(100),
      quantity: z.number().min(0),
      unitPrice: z.number().int().min(0),
      amount: z.number().int().min(0),
    })
  ).min(1),
});

export const ShipmentSchema = z.object({
  routeId: z.string().uuid(),
  cropId: z.string().uuid(),
  plannedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  plannedAmount: z.number().min(0),
  memo: z.string().max(200).nullable().optional(),
});
