"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNIT_OPTIONS } from "@/types";
import { useGradeLabels } from "@/lib/use-grade-labels";
import type { RouteWithFeeTiers } from "@/types";
import { AlertCircle, CheckCircle2, Camera, Loader2, Sparkles } from "lucide-react";

type Crop = { id: string; name: string; unit: string };

type FeeTierData = { minAmount: number; maxAmount: number | null; feeRate: number };

function calcFeeRate(route: RouteWithFeeTiers, totalAmount: number, monthlyCumulative: number): number {
  if (route.feeType === "FIXED") return route.feeRate ? Number(route.feeRate) : 0;
  const base = route.feeBasis === "MONTHLY" ? monthlyCumulative : 0;
  const effective = base + totalAmount;
  const tiers: FeeTierData[] = route.feeTiers.map((t) => ({
    minAmount: t.minAmount,
    maxAmount: t.maxAmount,
    feeRate: Number(t.feeRate),
  }));
  const tier = tiers.slice().reverse().find((t) => effective >= t.minAmount);
  return tier?.feeRate ?? 0;
}

function nextTierInfo(route: RouteWithFeeTiers, totalAmount: number, monthlyCumulative: number): string | null {
  if (route.feeType !== "TIER") return null;
  const base = route.feeBasis === "MONTHLY" ? monthlyCumulative : 0;
  const effective = base + totalAmount;
  const tiers: FeeTierData[] = route.feeTiers.map((t) => ({
    minAmount: t.minAmount,
    maxAmount: t.maxAmount,
    feeRate: Number(t.feeRate),
  }));
  const nextTier = tiers.find((t) => t.minAmount > effective);
  if (!nextTier) return null;
  const remaining = nextTier.minAmount - effective;
  return `あと¥${remaining.toLocaleString("ja-JP")}売ると手数料が${(nextTier.feeRate * 100).toFixed(0)}%になります`;
}

export default function SalesPage() {
  const gradeLabels = useGradeLabels();
  const [routes, setRoutes] = useState<RouteWithFeeTiers[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [monthlyCumulative, setMonthlyCumulative] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractSuccess, setExtractSuccess] = useState(false);

  const [routeId, setRouteId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cropId, setCropId] = useState("");
  const [grade, setGrade] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [unitPrice, setUnitPrice] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/routes").then((r) => r.json()),
      fetch("/api/crops").then((r) => r.json()),
      fetch("/api/sales?dashboard=1").then((r) => r.json()),
    ]).then(([routeData, cropData, dashData]) => {
      setRoutes(routeData);
      setCrops(cropData);
      // 今月の累計売上（段階手数料計算用）
      setMonthlyCumulative(dashData.kpi?.totalSales ?? 0);
      setLoading(false);
    });
  }, []);

  const route = routes.find((r) => r.id === routeId);
  const crop = crops.find((c) => c.id === cropId);

  const totalAmount = Math.round((parseFloat(quantity) || 0) * (parseInt(unitPrice) || 0));
  const feeRate = route ? calcFeeRate(route, totalAmount, monthlyCumulative) : 0;
  const feeAmount = Math.round(totalAmount * feeRate);
  const netProfit = totalAmount - feeAmount;
  const profitRate = totalAmount > 0 ? ((netProfit / totalAmount) * 100).toFixed(1) : "—";
  const tierAlert = route && totalAmount > 0 ? nextTierInfo(route, totalAmount, monthlyCumulative) : null;

  useEffect(() => {
    if (crop) setUnit(crop.unit);
  }, [crop]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > 5 * 1024 * 1024) {
      setExtractError("画像サイズは5MB以下にしてください");
      return;
    }

    const supportedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      setExtractError("対応形式は JPEG / PNG / WebP です");
      return;
    }

    setExtracting(true);
    setExtractError("");
    setExtractSuccess(false);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/sales/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "読み取りに失敗しました");

      if (data.date) setDate(data.date);
      if (data.grade) setGrade(data.grade);
      if (data.quantity != null) setQuantity(String(data.quantity));
      if (data.unitPrice != null) setUnitPrice(String(data.unitPrice));
      if (data.memo) setMemo(data.memo);

      if (data.cropName) {
        const matched = crops.find(c =>
          c.name === data.cropName ||
          c.name.includes(data.cropName) ||
          data.cropName.includes(c.name)
        );
        if (matched) setCropId(matched.id);
      }

      setExtractSuccess(true);
      setTimeout(() => setExtractSuccess(false), 4000);
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : "読み取りに失敗しました");
    } finally {
      setExtracting(false);
    }
  }

  const canSubmit = !submitting && routeId && cropId && grade && quantity && unitPrice && totalAmount > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, cropId, date, grade, unitPrice: parseInt(unitPrice), quantity: parseFloat(quantity), totalAmount, feeRate, feeAmount, netProfit, memo }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      setSubmitted(true);
      setRouteId(""); setCropId(""); setGrade(""); setQuantity(""); setUnitPrice(""); setMemo("");
      setDate(new Date().toISOString().slice(0, 10));
      setTimeout(() => setSubmitted(false), 3000);
      // 累計を更新
      setMonthlyCumulative((prev) => prev + totalAmount);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground text-sm">読み込み中…</div>;

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">売上入力</h1>
        <p className="text-muted-foreground text-sm mt-1">
          販路・作物・数量を入力すると手取り利益を自動計算します
        </p>
      </div>

      {submitted && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          売上を記録しました
        </div>
      )}

      {/* 伝票画像読み取り */}
      <div className="flex items-center gap-3">
        <label className={extracting ? "cursor-not-allowed" : "cursor-pointer"}>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            capture="environment"
            className="hidden"
            onChange={handleImageUpload}
            disabled={extracting}
          />
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors select-none ${
            extracting
              ? "border-muted bg-muted text-muted-foreground"
              : "border-input hover:bg-muted"
          }`}>
            {extracting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                読み取り中…
              </>
            ) : (
              <>
                <Camera className="h-4 w-4" />
                伝票を読み取る
              </>
            )}
          </div>
        </label>
        {extractSuccess && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Sparkles className="h-4 w-4" />
            読み取り完了 — 内容を確認してください
          </span>
        )}
        {extractError && (
          <span className="text-sm text-red-500">{extractError}</span>
        )}
      </div>

      {routes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            先に「販路管理」で販路を登録してください
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 販路・日付 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">販路</label>
              <Select value={routeId} onValueChange={(v) => v && setRouteId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="販路を選択" />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">日付</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {/* 作物・グレード */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">作物</label>
              <Select value={cropId} onValueChange={(v) => v && setCropId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="作物を選択" />
                </SelectTrigger>
                <SelectContent>
                  {crops.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">品質グレード</label>
              <Select value={grade} onValueChange={(v) => v && setGrade(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="グレードを選択" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLabels.map((g) => (
                    <SelectItem key={g.code} value={g.code}>
                      {g.label}（{g.code}）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 数量・単位・単価 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">数量</label>
              <Input type="number" min="0" step="0.1" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">単位</label>
              <Select value={unit} onValueChange={(v) => v && setUnit(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">単価（円/{unit}）</label>
              <Input type="number" min="0" step="1" placeholder="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          </div>

          {/* メモ */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">メモ（任意）</label>
            <Input placeholder="備考・特記事項" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>

          {/* リアルタイム計算結果 */}
          {totalAmount > 0 && (
            <Card className="bg-muted/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">計算結果</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">売上金額</span>
                  <span className="font-medium">¥{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">手数料（{(feeRate * 100).toFixed(1)}%）</span>
                  <span className="text-red-600">−¥{feeAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span>手取り利益</span>
                  <span className="text-green-600 text-base">
                    ¥{netProfit.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      （利益率 {profitRate}%）
                    </span>
                  </span>
                </div>

                {tierAlert && (
                  <div className="flex items-start gap-2 mt-2 text-xs text-amber-700 bg-amber-50 rounded p-2">
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{tierAlert}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={!canSubmit} className="w-full">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            売上を記録する
          </Button>
        </form>
      )}
    </div>
  );
}
