"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { DEFAULT_GRADES, invalidateGradeCache, type GradeItem } from "@/lib/use-grade-labels";
import { readThreshold, writeThreshold, DEFAULT_THRESHOLD, type InventoryThreshold } from "@/lib/use-inventory-threshold";

type Profile = { name: string; farmName: string; location: string; invoiceNumber: string };

// ---- プロフィールカード ----

function ProfileCard() {
  const [profile, setProfile] = useState<Profile>({ name: "", farmName: "", location: "", invoiceNumber: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d =>
      setProfile({ name: d.name ?? "", farmName: d.farmName ?? "", location: d.location ?? "", invoiceNumber: d.invoiceNumber ?? "" })
    ).finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (!res.ok) throw new Error();
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch { setError("保存に失敗しました"); } finally { setSaving(false); }
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">基本情報</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div><label className="text-sm font-medium mb-1 block">氏名</label>
          <Input placeholder="例：田中 みのり" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
        <div><label className="text-sm font-medium mb-1 block">農園名</label>
          <Input placeholder="例：田中農園" value={profile.farmName} onChange={e => setProfile(p => ({ ...p, farmName: e.target.value }))} /></div>
        <div><label className="text-sm font-medium mb-1 block">所在地</label>
          <Input placeholder="例：長野県松本市〇〇 123-4" value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} /></div>
        <div>
          <label className="text-sm font-medium mb-1 block">インボイス登録番号<span className="ml-2 text-xs text-muted-foreground font-normal">（T番号）</span></label>
          <Input placeholder="例：T1234567890123" value={profile.invoiceNumber} onChange={e => setProfile(p => ({ ...p, invoiceNumber: e.target.value }))} />
          <p className="text-xs text-muted-foreground mt-1">インボイス制度に登録していない場合は空欄で構いません</p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          {saved && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" />保存しました</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- グレード編集カード ----

function GradeCard() {
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/grade-labels").then(r => r.json()).then(data => {
      setGrades(Array.isArray(data) && data.length > 0 ? data : DEFAULT_GRADES);
    }).finally(() => setLoading(false));
  }, []);

  function update(i: number, field: "code" | "label", val: string) {
    setGrades(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: val } : g));
  }

  function moveUp(i: number) {
    if (i === 0) return;
    setGrades(prev => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function moveDown(i: number) {
    setGrades(prev => {
      if (i >= prev.length - 1) return prev;
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  }

  function addGrade() {
    setGrades(prev => [...prev, { code: "", label: "", sortOrder: prev.length }]);
  }

  function removeGrade(i: number) {
    setGrades(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (grades.length === 0) { setError("グレードを1つ以上設定してください"); return; }
    if (grades.some(g => !g.code.trim() || !g.label.trim())) { setError("コードと名称をすべて入力してください"); return; }
    const codes = grades.map(g => g.code.trim());
    if (new Set(codes).size !== codes.length) { setError("コードが重複しています"); return; }

    setSaving(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/grade-labels", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(grades) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      invalidateGradeCache();
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : "保存に失敗しました"); } finally { setSaving(false); }
  }

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">グレード設定</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">グレードの追加・削除・名称変更・並び替えができます</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ヘッダー行 */}
        <div className="grid grid-cols-[32px_1fr_2fr_32px] gap-2 text-xs text-muted-foreground px-1">
          <span />
          <span>コード</span>
          <span>表示名</span>
          <span />
        </div>

        {grades.map((g, i) => (
          <div key={i} className="grid grid-cols-[32px_1fr_2fr_32px] gap-2 items-center">
            {/* 並び替えボタン */}
            <div className="flex flex-col gap-0.5">
              <button onClick={() => moveUp(i)} disabled={i === 0}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20">
                <ArrowUp className="h-3 w-3" />
              </button>
              <button onClick={() => moveDown(i)} disabled={i === grades.length - 1}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20">
                <ArrowDown className="h-3 w-3" />
              </button>
            </div>

            <Input
              value={g.code}
              onChange={e => update(i, "code", e.target.value)}
              placeholder="S"
              maxLength={10}
              className="font-mono text-sm"
            />
            <Input
              value={g.label}
              onChange={e => update(i, "label", e.target.value)}
              placeholder="秀"
            />
            <button onClick={() => removeGrade(i)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <button onClick={addGrade}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1 w-full py-1.5 border border-dashed rounded-lg justify-center transition-colors hover:bg-muted/30">
          <Plus className="h-3.5 w-3.5" />
          グレードを追加
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>{saving ? "保存中..." : "保存"}</Button>
          {saved && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" />保存しました</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- 在庫閾値カード ----

function ThresholdCard() {
  const [threshold, setThreshold] = useState<InventoryThreshold>(DEFAULT_THRESHOLD);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setThreshold(readThreshold());
  }, []);

  function handleSave() {
    const low = threshold.low;
    const high = threshold.high;
    if (isNaN(low) || isNaN(high) || low < 0) { setError("0以上の数値を入力してください"); return; }
    if (high <= low) { setError("上限は下限より大きい値を入力してください"); return; }
    writeThreshold({ low, high });
    setError("");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">在庫アラート閾値</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">在庫量に応じて「少ない／適量／多め」を判定する基準値です</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="threshold-low" className="text-sm font-medium mb-1 block">
              下限（少ない）
            </label>
            <Input
              id="threshold-low"
              type="number"
              min="0"
              step="1"
              value={threshold.low}
              onChange={e => setThreshold(prev => ({ ...prev, low: parseFloat(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground mt-1">この値未満が「少ない」</p>
          </div>
          <div>
            <label htmlFor="threshold-high" className="text-sm font-medium mb-1 block">
              上限（多め）
            </label>
            <Input
              id="threshold-high"
              type="number"
              min="0"
              step="1"
              value={threshold.high}
              onChange={e => setThreshold(prev => ({ ...prev, high: parseFloat(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground mt-1">この値以上が「多め」</p>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave}>保存</Button>
          {saved && <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" />保存しました</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- ページ ----

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-6 max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">農園設定</h1>
        <p className="text-muted-foreground text-sm mt-1">農園プロフィールや各種名称を設定します</p>
      </div>
      <ProfileCard />
      <GradeCard />
      <ThresholdCard />
    </div>
  );
}
