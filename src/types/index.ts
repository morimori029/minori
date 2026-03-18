import type {
  User,
  Route,
  FeeTier,
  Crop,
  SalesRecord,
  Inventory,
  ShipmentPlan,
  Invoice,
  InvoiceItem,
  FeeType,
  FeeBasis,
  ShipmentStatus,
  InvoiceStatus,
} from "@/generated/prisma";

// Prisma 型をそのまま再エクスポート
export type {
  User,
  Route,
  FeeTier,
  Crop,
  SalesRecord,
  Inventory,
  ShipmentPlan,
  Invoice,
  InvoiceItem,
  FeeType,
  FeeBasis,
  ShipmentStatus,
  InvoiceStatus,
};

// リレーション付き型
export type RouteWithFeeTiers = Route & { feeTiers: FeeTier[] };

export type SalesRecordWithRelations = SalesRecord & {
  route: Route;
  crop: Crop;
};

export type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

// 販路の選択肢（プリセット）
export const ROUTE_PRESETS = [
  { name: "JA出荷", color: "#16a34a" },
  { name: "道の駅", color: "#ea580c" },
  { name: "ポケマル", color: "#7c3aed" },
  { name: "食べチョク", color: "#db2777" },
  { name: "飲食店直取引", color: "#0891b2" },
  { name: "ふるさと納税", color: "#d97706" },
] as const;

// 単位の選択肢
export const UNIT_OPTIONS = ["kg", "個", "箱", "パック"] as const;
export type Unit = (typeof UNIT_OPTIONS)[number];
