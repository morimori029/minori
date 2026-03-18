"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Plus, Pencil, Trash2, Leaf } from "lucide-react";
import type { Crop } from "@/types";
import { UNIT_OPTIONS } from "@/types";

// ---- Add / Edit modal ----

type CropModalProps = {
  open: boolean;
  initial?: Crop | null;
  onClose: () => void;
  onSaved: () => void;
};

function CropModal({ open, initial, onClose, onSaved }: CropModalProps) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<string>("kg");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setUnit(initial?.unit ?? "kg");
      setError("");
    }
  }, [open, initial]);

  async function handleSave() {
    if (!name.trim()) { setError("作物名を入力してください"); return; }
    setSaving(true); setError("");
    try {
      const method = initial ? "PUT" : "POST";
      const url = initial ? `/api/crops/${initial.id}` : "/api/crops";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), unit }),
      });
      if (!res.ok) throw new Error();
      onSaved(); onClose();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "作物を編集" : "作物を追加"}>
      <div className="space-y-4">
        <div>
          <label htmlFor="crop-name" className="text-sm font-medium mb-1 block">作物名</label>
          <Input
            id="crop-name"
            placeholder="例：トマト、きゅうり"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="crop-unit" className="text-sm font-medium mb-1 block">単位</label>
          <select
            id="crop-unit"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {UNIT_OPTIONS.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
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

export default function CropsPage() {
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Crop | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Crop | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/crops");
    if (res.ok) {
      const data = await res.json();
      setCrops(data);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/crops/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error ?? "削除に失敗しました");
      return;
    }
    setDeleteTarget(null);
    setDeleteError("");
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">作物管理</h1>
          <p className="text-muted-foreground text-sm mt-1">売上入力で使う作物を登録します</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          作物を追加
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>
      ) : crops.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-16 text-center text-muted-foreground text-sm">
          <Leaf className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">作物が登録されていません</p>
          <p className="mt-1">「作物を追加」から登録しましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {crops.map(crop => (
            <Card key={crop.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{crop.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">単位：{crop.unit}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditTarget(crop)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(crop)}
                    className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CropModal
        open={addOpen}
        initial={null}
        onClose={() => setAddOpen(false)}
        onSaved={load}
      />
      <CropModal
        open={!!editTarget}
        initial={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={load}
      />
      <ConfirmModal
        open={deleteTarget !== null}
        title="作物を削除"
        description={deleteTarget ? `「${deleteTarget.name}」を削除しますか？関連する売上データは変更されません。${deleteError ? `\n${deleteError}` : ""}` : ""}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(""); }}
      />
    </div>
  );
}
