"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Plus, Pencil, TrendingUp, Wallet, Percent, Trash2 } from "lucide-react";
import type { RouteWithFeeTiers } from "@/types";
import { ROUTE_PRESETS } from "@/types";

type RouteWithStats = RouteWithFeeTiers & {
  monthlySales: number;
  netProfit: number;
};

type FeeTierInput = { minAmount: string; maxAmount: string; feeRate: string };

function AddRouteDialog({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [feeType, setFeeType] = useState<"FIXED" | "TIER">("FIXED");
  const [feeRate, setFeeRate] = useState("");
  const [feeBasis, setFeeBasis] = useState<"MONTHLY" | "PER_TRANSACTION" | "ANNUAL">("PER_TRANSACTION");
  const [feeTiers, setFeeTiers] = useState<FeeTierInput[]>([
    { minAmount: "0", maxAmount: "100000", feeRate: "" },
    { minAmount: "100000", maxAmount: "", feeRate: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setName(""); setColor("#3b82f6"); setFeeType("FIXED"); setFeeRate(""); setFeeBasis("PER_TRANSACTION");
    setFeeTiers([{ minAmount: "0", maxAmount: "100000", feeRate: "" }, { minAmount: "100000", maxAmount: "", feeRate: "" }]);
    setError("");
  }

  async function handleSave() {
    if (!name.trim()) { setError("販路名を入力してください"); return; }
    if (feeType === "FIXED" && !feeRate) { setError("手数料率を入力してください"); return; }
    if (feeType === "TIER" && feeTiers.some(t => !t.feeRate)) { setError("全ての段階の手数料率を入力してください"); return; }

    setSaving(true); setError("");
    try {
      const body = {
        name: name.trim(), color, feeType, feeBasis,
        feeRate: feeType === "FIXED" ? parseFloat(feeRate) / 100 : null,
        feeTiers: feeType === "TIER" ? feeTiers.map(t => ({
          minAmount: parseInt(t.minAmount) || 0,
          maxAmount: t.maxAmount ? parseInt(t.maxAmount) : null,
          feeRate: parseFloat(t.feeRate) / 100,
        })) : [],
      };
      const res = await fetch("/api/routes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error("保存に失敗しました");
      reset(); onAdded(); onClose();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  function updateTier(i: number, field: keyof FeeTierInput, value: string) {
    setFeeTiers(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  }

  function handleClose() { reset(); onClose(); }

  return (
    <Modal open={open} onClose={handleClose} title="販路を追加">
      <div className="space-y-4">
        {/* 販路名 */}
        <div className="space-y-1.5">
          <label htmlFor="route-name" className="text-sm font-medium">販路名</label>
          <div className="flex gap-2 flex-wrap">
            {ROUTE_PRESETS.map(p => (
              <button key={p.name} onClick={() => { setName(p.name); setColor(p.color); }}
                className="text-xs px-2 py-1 rounded border hover:bg-muted transition-colors">
                {p.name}
              </button>
            ))}
          </div>
          <Input id="route-name" placeholder="例：道の駅" value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* 手数料タイプ */}
        <div className="space-y-1.5">
          <label htmlFor="route-fee-type" className="text-sm font-medium">手数料タイプ</label>
          <select id="route-fee-type" value={feeType} onChange={e => setFeeType(e.target.value as "FIXED" | "TIER")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="FIXED">固定率</option>
            <option value="TIER">段階手数料</option>
          </select>
        </div>

        {/* 集計単位 */}
        <div className="space-y-1.5">
          <label htmlFor="route-fee-basis" className="text-sm font-medium">手数料の集計単位</label>
          <select id="route-fee-basis" value={feeBasis} onChange={e => setFeeBasis(e.target.value as typeof feeBasis)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="PER_TRANSACTION">取引ごと</option>
            <option value="MONTHLY">月次累計</option>
            <option value="ANNUAL">年次累計</option>
          </select>
        </div>

        {/* 固定率 */}
        {feeType === "FIXED" && (
          <div className="space-y-1.5">
            <label htmlFor="route-fee-rate" className="text-sm font-medium">手数料率（%）</label>
            <Input id="route-fee-rate" type="number" min="0" max="100" step="0.1" placeholder="例：10" value={feeRate} onChange={e => setFeeRate(e.target.value)} />
          </div>
        )}

        {/* 段階手数料 */}
        {feeType === "TIER" && (
          <div className="space-y-2">
            <label className="text-sm font-medium">段階手数料テーブル</label>
            {feeTiers.map((tier, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Input className="w-28" type="number" placeholder="下限¥" value={tier.minAmount} onChange={e => updateTier(i, "minAmount", e.target.value)} />
                <span className="text-muted-foreground shrink-0">〜</span>
                <Input className="w-28" type="number" placeholder="上限¥（空=∞）" value={tier.maxAmount} onChange={e => updateTier(i, "maxAmount", e.target.value)} />
                <Input className="w-20" type="number" placeholder="%" value={tier.feeRate} onChange={e => updateTier(i, "feeRate", e.target.value)} />
                <span className="text-muted-foreground shrink-0">%</span>
                {feeTiers.length > 1 && (
                  <button onClick={() => setFeeTiers(prev => prev.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                  </button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => setFeeTiers(prev => [...prev, { minAmount: "", maxAmount: "", feeRate: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> 段階を追加
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={handleClose}>キャンセル</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "保存中…" : "保存"}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  function loadRoutes() {
    Promise.all([
      fetch("/api/routes").then((r) => r.json()),
      fetch("/api/sales?dashboard=1").then((r) => r.json()),
    ]).then(([routeData, dashData]) => {
      const breakdownMap = new Map<string, { sales: number; profit: number }>(
        (dashData.routeBreakdown ?? []).map((b: { id: string; sales: number; profit: number }) => [
          b.id,
          { sales: b.sales, profit: b.profit },
        ])
      );
      setRoutes(
        routeData.map((r: RouteWithFeeTiers) => ({
          ...r,
          monthlySales: breakdownMap.get(r.id)?.sales ?? 0,
          netProfit: breakdownMap.get(r.id)?.profit ?? 0,
        }))
      );
      setLoading(false);
    });
  }

  useEffect(() => { loadRoutes(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">販路管理</h1>
          <p className="text-muted-foreground text-sm mt-1">
            各販路の売上・手数料・利益率を管理します
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          販路を追加
        </Button>
        <AddRouteDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdded={loadRoutes} />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">読み込み中…</p>
      ) : routes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>販路がまだ登録されていません</p>
            <p className="text-sm mt-1">「販路を追加」から最初の販路を登録しましょう</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 販路カード一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {routes.map((route) => {
              const profitRate =
                route.monthlySales > 0
                  ? ((route.netProfit / route.monthlySales) * 100).toFixed(1)
                  : "0.0";
              const feeRateNum = route.feeRate ? Number(route.feeRate) : null;

              return (
                <Card key={route.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: route.color }}
                        />
                        <CardTitle className="text-base">{route.name}</CardTitle>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {route.feeType === "FIXED" ? "固定率" : "段階手数料"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {route.feeBasis === "MONTHLY"
                          ? "月次累計"
                          : route.feeBasis === "ANNUAL"
                          ? "年次累計"
                          : "取引ごと"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-0.5">
                          <TrendingUp className="h-3 w-3" />
                          今月売上
                        </div>
                        <p className="font-semibold">
                          ¥{route.monthlySales.toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-0.5">
                          <Wallet className="h-3 w-3" />
                          手取り
                        </div>
                        <p className="font-semibold text-green-600">
                          ¥{route.netProfit.toLocaleString("ja-JP")}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-0.5">
                          <Percent className="h-3 w-3" />
                          利益率
                        </div>
                        <p className="font-semibold">{profitRate}%</p>
                      </div>
                    </div>

                    {route.feeType === "FIXED" ? (
                      <div className="text-sm bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground">手数料率：</span>
                        <span className="font-medium">
                          {feeRateNum != null ? (feeRateNum * 100).toFixed(1) : "—"}%
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs bg-muted/50 rounded p-2 space-y-1">
                        <p className="text-muted-foreground font-medium mb-1">段階手数料テーブル</p>
                        {route.feeTiers.map((tier, i) => (
                          <div key={i} className="flex justify-between">
                            <span className="text-muted-foreground">
                              {tier.maxAmount
                                ? `〜¥${tier.maxAmount.toLocaleString()}`
                                : `¥${tier.minAmount.toLocaleString()}〜`}
                            </span>
                            <span className="font-medium">
                              {(Number(tier.feeRate) * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* 販路比較テーブル */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">販路比較</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs border-b">
                    <th className="text-left py-2 pr-4">販路</th>
                    <th className="text-right py-2 pr-4">今月売上</th>
                    <th className="text-right py-2 pr-4">手数料</th>
                    <th className="text-right py-2 pr-4">手取り</th>
                    <th className="text-right py-2">利益率</th>
                  </tr>
                </thead>
                <tbody>
                  {routes
                    .slice()
                    .sort((a, b) =>
                      b.monthlySales > 0 && a.monthlySales > 0
                        ? b.netProfit / b.monthlySales - a.netProfit / a.monthlySales
                        : b.monthlySales - a.monthlySales
                    )
                    .map((route) => {
                      const fee = route.monthlySales - route.netProfit;
                      const profitRate =
                        route.monthlySales > 0
                          ? ((route.netProfit / route.monthlySales) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <tr key={route.id} className="border-b last:border-0">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: route.color }}
                              />
                              {route.name}
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            ¥{route.monthlySales.toLocaleString()}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-red-600">
                            −¥{fee.toLocaleString()}
                          </td>
                          <td className="py-2.5 pr-4 text-right text-green-600 font-medium">
                            ¥{route.netProfit.toLocaleString()}
                          </td>
                          <td className="py-2.5 text-right font-medium">{profitRate}%</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
