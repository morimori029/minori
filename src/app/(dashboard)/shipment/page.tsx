"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useGradeLabels } from "@/lib/use-grade-labels";
import { Plus, Truck, Trash2 } from "lucide-react";

type RouteOption = { id: string; name: string; color: string };
type CropOption = { id: string; name: string; unit: string };
type ShipmentStatus = "PLANNED" | "SHIPPED" | "CANCELLED";

type Plan = {
  id: string;
  plannedDate: string;
  plannedAmount: string;
  status: ShipmentStatus;
  memo: string | null;
  route: RouteOption;
  crop: CropOption;
};

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  PLANNED: "予定",
  SHIPPED: "出荷済み",
  CANCELLED: "キャンセル",
};

const STATUS_CLASS: Record<ShipmentStatus, string> = {
  PLANNED: "bg-blue-50 text-blue-600",
  SHIPPED: "bg-green-50 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

// ---- 出荷記録モーダル ----

function ShipRecordModal({
  plan,
  onClose,
  onConfirmed,
}: {
  plan: Plan | null;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const gradeLabels = useGradeLabels();
  const [date, setDate] = useState("");
  const [grade, setGrade] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (plan) {
      setDate(plan.plannedDate);
      setGrade(gradeLabels[0]?.code ?? "");
      setUnitPrice("");
      setMemo(plan.memo ?? "");
      setError("");
    }
  }, [plan, gradeLabels]);

  if (!plan) return null;

  const currentPlan = plan;
  const quantity = parseFloat(currentPlan.plannedAmount);
  const price = parseInt(unitPrice);
  const totalAmount = !isNaN(quantity) && !isNaN(price) ? Math.round(quantity * price) : null;

  async function handleSave() {
    const n = parseInt(unitPrice);
    if (isNaN(n) || n <= 0) { setError("単価を入力してください"); return; }
    if (!grade) { setError("グレードを選択してください"); return; }

    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/shipment/${currentPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SHIPPED",
          salesData: { grade, unitPrice: n, date, memo: memo || null },
        }),
      });
      if (!res.ok) throw new Error();
      onConfirmed();
      onClose();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="出荷記録を登録">
      <p className="text-sm text-muted-foreground mb-4">
        出荷済みにすると売上記録が自動作成されます
      </p>
      <div className="space-y-3">
        {/* 作物・数量（表示のみ） */}
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm flex justify-between">
          <span className="text-muted-foreground">作物</span>
          <span className="font-medium">{currentPlan.crop.name}　{quantity}{currentPlan.crop.unit}</span>
        </div>

        <div>
          <label htmlFor="ship-rec-date" className="text-sm font-medium mb-1 block">出荷日</label>
          <Input id="ship-rec-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div>
          <label htmlFor="ship-rec-grade" className="text-sm font-medium mb-1 block">グレード</label>
          <select
            id="ship-rec-grade"
            value={grade}
            onChange={e => setGrade(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {gradeLabels.map(g => (
              <option key={g.code} value={g.code}>{g.label}（{g.code}）</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ship-rec-price" className="text-sm font-medium mb-1 block">単価（円）</label>
          <Input
            id="ship-rec-price"
            type="number"
            min="0"
            placeholder="例：500"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            autoFocus
          />
          {totalAmount !== null && (
            <p className="text-xs text-muted-foreground mt-1">
              合計：¥{totalAmount.toLocaleString()}（手数料は自動計算）
            </p>
          )}
        </div>

        <div>
          <label htmlFor="ship-rec-memo" className="text-sm font-medium mb-1 block">メモ</label>
          <Input id="ship-rec-memo" placeholder="備考" value={memo} onChange={e => setMemo(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "出荷済みにする"}
        </Button>
      </div>
    </Modal>
  );
}

// ---- 追加モーダル ----

function AddModal({
  open,
  routes,
  crops,
  onClose,
  onAdded,
}: {
  open: boolean;
  routes: RouteOption[];
  crops: CropOption[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [routeId, setRouteId] = useState("");
  const [cropId, setCropId] = useState("");
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().slice(0, 10));
  const [plannedAmount, setPlannedAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setRouteId(routes[0]?.id ?? "");
      setCropId(crops[0]?.id ?? "");
      setPlannedAmount("");
      setMemo("");
      setError("");
    }
  }, [open, routes, crops]);

  const selectedCrop = crops.find(c => c.id === cropId);

  async function handleSave() {
    if (!routeId || !cropId) { setError("販路と作物を選択してください"); return; }
    const n = parseFloat(plannedAmount);
    if (isNaN(n) || n <= 0) { setError("出荷予定量を入力してください"); return; }

    setSaving(true); setError("");
    try {
      const res = await fetch("/api/shipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, cropId, plannedDate, plannedAmount: n, memo }),
      });
      if (!res.ok) throw new Error();
      onAdded(); onClose();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="出荷計画を追加">
      <div className="space-y-3">
        <div>
          <label htmlFor="ship-date" className="text-sm font-medium mb-1 block">予定日</label>
          <Input id="ship-date" type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ship-route" className="text-sm font-medium mb-1 block">販路</label>
          <select id="ship-route" value={routeId} onChange={e => setRouteId(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ship-crop" className="text-sm font-medium mb-1 block">作物</label>
          <select id="ship-crop" value={cropId} onChange={e => setCropId(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            {crops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="ship-amount" className="text-sm font-medium mb-1 block">
            出荷予定量
            <span className="ml-1 text-xs text-muted-foreground font-normal">（{selectedCrop?.unit ?? ""}）</span>
          </label>
          <Input id="ship-amount" type="number" min="0" step="0.1" placeholder="0"
            value={plannedAmount} onChange={e => setPlannedAmount(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ship-memo" className="text-sm font-medium mb-1 block">メモ</label>
          <Input id="ship-memo" placeholder="備考・連絡事項" value={memo} onChange={e => setMemo(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "追加"}
        </Button>
      </div>
    </Modal>
  );
}

// ---- メインページ ----

export default function ShipmentPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [crops, setCrops] = useState<CropOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<ShipmentStatus | "ALL">("ALL");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [shipTarget, setShipTarget] = useState<Plan | null>(null);

  async function load() {
    setLoading(true);
    const [pRes, rRes, cRes] = await Promise.all([
      fetch("/api/shipment"),
      fetch("/api/routes"),
      fetch("/api/crops"),
    ]);
    if (pRes.ok) setPlans(await pRes.json());
    if (rRes.ok) setRoutes(await rRes.json());
    if (cRes.ok) setCrops(await cRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: ShipmentStatus) {
    await fetch(`/api/shipment/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPlans(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/shipment/${id}`, { method: "DELETE" });
    setPlans(prev => prev.filter(p => p.id !== id));
    setDeleteTarget(null);
  }

  const filtered = filter === "ALL" ? plans : plans.filter(p => p.status === filter);

  const upcoming = plans.filter(p => {
    if (p.status !== "PLANNED") return false;
    const diff = new Date(p.plannedDate).getTime() - Date.now();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">出荷計画</h1>
          <p className="text-muted-foreground text-sm mt-1">
            いつ・どこに・何を出荷するかの予定を管理します
            {upcoming > 0 && (
              <span className="ml-2 text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                7日以内 {upcoming}件
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={routes.length === 0 || crops.length === 0}>
          <Plus className="h-4 w-4 mr-1" />
          計画を追加
        </Button>
      </div>

      {/* フィルタータブ */}
      <div className="flex gap-1">
        {(["ALL", "PLANNED", "SHIPPED", "CANCELLED"] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {s === "ALL" ? "すべて" : STATUS_LABEL[s]}
            <span className="ml-1 text-xs opacity-70">
              {s === "ALL" ? plans.length : plans.filter(p => p.status === s).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>
      ) : routes.length === 0 || crops.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-16 text-center text-muted-foreground text-sm">
          <Truck className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">販路と作物を先に登録してください</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-16 text-center text-muted-foreground text-sm">
          <Truck className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">出荷計画がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(plan => {
            const d = new Date(plan.plannedDate);
            const isUpcoming = plan.status === "PLANNED" &&
              d.getTime() - Date.now() >= 0 &&
              d.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000;
            return (
              <Card key={plan.id} className={isUpcoming ? "border-amber-200 bg-amber-50/30" : ""}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* 日付 */}
                    <div className="text-center shrink-0">
                      <p className="text-xs text-muted-foreground">{d.getMonth() + 1}月</p>
                      <p className="text-2xl font-bold leading-none">{d.getDate()}</p>
                      <p className="text-xs text-muted-foreground">
                        {["日", "月", "火", "水", "木", "金", "土"][d.getDay()]}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: plan.route.color }}
                        >
                          {plan.route.name}
                        </span>
                        <span className="font-medium">{plan.crop.name}</span>
                        <span className="text-muted-foreground text-sm">
                          {parseFloat(plan.plannedAmount)}{plan.crop.unit}
                        </span>
                      </div>
                      {plan.memo && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{plan.memo}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={plan.status}
                      onChange={e => {
                        const next = e.target.value as ShipmentStatus;
                        if (next === "SHIPPED" && plan.status !== "SHIPPED") {
                          setShipTarget(plan);
                        } else {
                          updateStatus(plan.id, next);
                        }
                      }}
                      className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${STATUS_CLASS[plan.status]}`}
                    >
                      {(Object.keys(STATUS_LABEL) as ShipmentStatus[]).map(s => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setDeleteTarget(plan.id)}
                      className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddModal
        open={addOpen}
        routes={routes}
        crops={crops}
        onClose={() => setAddOpen(false)}
        onAdded={load}
      />
      <ShipRecordModal
        plan={shipTarget}
        onClose={() => setShipTarget(null)}
        onConfirmed={() => {
          setPlans(prev => prev.map(p => p.id === shipTarget?.id ? { ...p, status: "SHIPPED" } : p));
        }}
      />
      <ConfirmModal
        open={deleteTarget !== null}
        title="出荷計画を削除"
        description="この操作は取り消せません。"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
