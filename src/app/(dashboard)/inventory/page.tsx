"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useInventoryThreshold } from "@/lib/use-inventory-threshold";
import { Pencil, Package } from "lucide-react";

type CropOption = { id: string; name: string; unit: string };
type InventoryItem = {
  id: string;
  cropId: string;
  stockAmount: string;
  crop: CropOption;
};

// ---- Edit modal ----

function EditModal({
  item,
  crops,
  onClose,
  onSaved,
}: {
  item: InventoryItem | null;
  newCropId?: string;
  crops: CropOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [cropId, setCropId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (item) {
      setCropId(item.cropId);
      setAmount(String(item.stockAmount));
    } else {
      setCropId(crops[0]?.id ?? "");
      setAmount("");
    }
    setError("");
  }, [item, crops]);

  const isEdit = !!item;
  const selectedCrop = crops.find(c => c.id === (isEdit ? item.cropId : cropId));

  async function handleSave() {
    const n = parseFloat(amount);
    if (isNaN(n) || n < 0) { setError("0以上の数値を入力してください"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cropId: isEdit ? item.cropId : cropId, stockAmount: n }),
      });
      if (!res.ok) throw new Error();
      onSaved(); onClose();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (!item && crops.length === 0) return null;

  return (
    <Modal open={true} onClose={onClose} title={`在庫を${isEdit ? "更新" : "登録"}`}>
      <div className="space-y-4">
        {!isEdit && (
          <div>
            <label htmlFor="inv-crop" className="text-sm font-medium mb-1 block">作物</label>
            <select
              id="inv-crop"
              value={cropId}
              onChange={e => setCropId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {crops.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {isEdit && (
          <p className="text-sm font-medium">{item.crop.name}</p>
        )}

        <div>
          <label htmlFor="inv-amount" className="text-sm font-medium mb-1 block">
            在庫数量
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              （{selectedCrop?.unit ?? ""}）
            </span>
          </label>
          <Input
            id="inv-amount"
            type="number"
            min="0"
            step="0.1"
            placeholder="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="flex gap-2 mt-5">
        <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>
    </Modal>
  );
}

// ---- Main page ----

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allCrops, setAllCrops] = useState<CropOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const threshold = useInventoryThreshold();

  async function load() {
    setLoading(true);
    const [invRes, cropRes] = await Promise.all([
      fetch("/api/inventory"),
      fetch("/api/crops"),
    ]);
    if (invRes.ok) setInventory(await invRes.json());
    if (cropRes.ok) setAllCrops(await cropRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // 在庫未登録の作物（追加ダイアログ用）
  const registeredCropIds = new Set(inventory.map(i => i.cropId));
  const unregisteredCrops = allCrops.filter(c => !registeredCropIds.has(c.id));

  function getStockLevel(amount: number): "low" | "ok" | "high" {
    if (amount < threshold.low) return "low";
    if (amount >= threshold.high) return "high";
    return "ok";
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">在庫管理</h1>
          <p className="text-muted-foreground text-sm mt-1">作物ごとの現在の在庫量を管理します</p>
        </div>
        {unregisteredCrops.length > 0 && (
          <Button onClick={() => setAddOpen(true)}>
            在庫を追加
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>
      ) : allCrops.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-16 text-center text-muted-foreground text-sm">
          <Package className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">作物が登録されていません</p>
          <p className="mt-1">「作物管理」から作物を登録してください</p>
        </div>
      ) : inventory.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-16 text-center text-muted-foreground text-sm">
          <Package className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">在庫データがありません</p>
          <p className="mt-1">「在庫を追加」から現在の在庫量を登録しましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inventory.map(item => {
            const amount = parseFloat(item.stockAmount);
            const level = getStockLevel(amount);
            return (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.crop.name}</p>
                      <p className="text-2xl font-bold mt-1">
                        {amount % 1 === 0 ? amount : amount.toFixed(1)}
                        <span className="text-sm font-normal text-muted-foreground ml-1">{item.crop.unit}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={
                        level === "low"
                          ? "text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium"
                          : level === "high"
                          ? "text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium"
                          : "text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium"
                      }>
                        {level === "low" ? "少ない" : level === "high" ? "多め" : "適量"}
                      </span>
                      <button
                        onClick={() => setEditTarget(item)}
                        className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 新規追加モーダル */}
      {addOpen && (
        <EditModal
          item={null}
          crops={unregisteredCrops}
          onClose={() => setAddOpen(false)}
          onSaved={load}
        />
      )}

      {/* 編集モーダル */}
      {editTarget && (
        <EditModal
          item={editTarget}
          crops={allCrops}
          onClose={() => setEditTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
