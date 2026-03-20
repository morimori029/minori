"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Trash2, FileText, PlusCircle, Printer } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

// ---- Types ----

type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  total: number;
  status: InvoiceStatus;
};

// ---- Status badge ----

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "下書き",
  SENT: "送付済み",
  PAID: "支払済み",
  OVERDUE: "期限超過",
};

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  SENT: "bg-blue-50 text-blue-600",
  PAID: "bg-green-50 text-green-700",
  OVERDUE: "bg-red-50 text-red-600",
};

// ---- Create modal ----

type ItemInput = { description: string; quantity: string; unitPrice: string };

function CreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [bankInfo, setBankInfo] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<ItemInput[]>([{ description: "", quantity: "1", unitPrice: "" }]);
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setClientName(""); setClientAddress(""); setBankInfo(""); setMemo("");
    setIssueDate(new Date().toISOString().slice(0, 10));
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    setDueDate(d.toISOString().slice(0, 10));
    setItems([{ description: "", quantity: "1", unitPrice: "" }]);
    setError("");
  }

  function updateItem(i: number, field: keyof ItemInput, val: string) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  function addItem() {
    setItems(prev => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  }

  function removeItem(i: number) {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  const parsedItems = items.map(i => ({
    description: i.description,
    quantity: parseFloat(i.quantity) || 0,
    unitPrice: parseInt(i.unitPrice) || 0,
    amount: Math.round((parseFloat(i.quantity) || 0) * (parseInt(i.unitPrice) || 0)),
  }));
  const subtotal = parsedItems.reduce((s, i) => s + i.amount, 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  async function handleSave() {
    if (!clientName.trim()) { setError("請求先名を入力してください"); return; }
    if (parsedItems.some(i => !i.description)) { setError("明細の品目を入力してください"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, clientAddress, bankInfo, issueDate, dueDate, items: parsedItems, memo }),
      });
      if (!res.ok) throw new Error();
      reset(); onCreated(); onClose();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={() => { reset(); onClose(); }} />
      <div
        style={{ position: "relative", zIndex: 1 }}
        className="w-96 bg-white rounded-xl shadow-xl p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">請求書を作成</h2>
          <button onClick={() => { reset(); onClose(); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 請求先 */}
          <div>
            <label className="text-sm font-medium mb-1 block">請求先名 <span className="text-red-500">*</span></label>
            <Input placeholder="例：〇〇農協" value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">請求先住所</label>
            <Input placeholder="例：東京都〇〇区〇〇 1-2-3" value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">発行日</label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">支払期限</label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>

          {/* 明細 */}
          <div>
            <label className="text-sm font-medium mb-2 block">明細 <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground px-1">
                <span className="col-span-5">品目</span>
                <span className="col-span-2 text-right">数量</span>
                <span className="col-span-3 text-right">単価（円）</span>
                <span className="col-span-2" />
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-1 items-center">
                  <Input
                    className="col-span-5 text-sm h-8"
                    placeholder="品目"
                    value={item.description}
                    onChange={e => updateItem(i, "description", e.target.value)}
                  />
                  <Input
                    className="col-span-2 text-sm h-8 text-right"
                    type="number" min="0" step="0.1"
                    value={item.quantity}
                    onChange={e => updateItem(i, "quantity", e.target.value)}
                  />
                  <Input
                    className="col-span-3 text-sm h-8 text-right"
                    type="number" min="0"
                    placeholder="0"
                    value={item.unitPrice}
                    onChange={e => updateItem(i, "unitPrice", e.target.value)}
                  />
                  <button
                    className="col-span-2 flex justify-center text-muted-foreground hover:text-red-500 disabled:opacity-30"
                    onClick={() => removeItem(i)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-1"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                明細を追加
              </button>
            </div>
          </div>

          {/* 合計 */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">小計</span>
              <span>¥{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">消費税（10%）</span>
              <span>¥{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t mt-1">
              <span>合計</span>
              <span>¥{total.toLocaleString()}</span>
            </div>
          </div>

          {/* 振込先 */}
          <div>
            <label className="text-sm font-medium mb-1 block">振込先</label>
            <Input placeholder="例：〇〇銀行 〇〇支店 普通 1234567" value={bankInfo} onChange={e => setBankInfo(e.target.value)} />
          </div>

          {/* メモ */}
          <div>
            <label className="text-sm font-medium mb-1 block">備考</label>
            <Input placeholder="備考・連絡事項など" value={memo} onChange={e => setMemo(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="outline" className="flex-1" onClick={() => { reset(); onClose(); }}>キャンセル</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "作成"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ---- Main page ----

export default function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/invoice");
    if (res.ok) setInvoices(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: InvoiceStatus) {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
    await fetch(`/api/invoice/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteInvoice(id: string) {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    setDeleteTarget(null);
    await fetch(`/api/invoice/${id}`, { method: "DELETE" });
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">請求書</h1>
          <p className="text-muted-foreground text-sm mt-1">取引先への請求書を作成・管理します</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          請求書を作成
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-16 text-center text-muted-foreground text-sm">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">請求書がありません</p>
          <p className="mt-1">「請求書を作成」から作成しましょう</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">請求書番号</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">請求先</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">発行日</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">支払期限</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">合計金額</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">ステータス</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 font-medium">{inv.clientName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(inv.issueDate).toLocaleDateString("ja-JP")}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString("ja-JP")}</td>
                    <td className="px-4 py-3 text-right font-medium">¥{inv.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <select
                        value={inv.status}
                        onChange={e => updateStatus(inv.id, e.target.value as InvoiceStatus)}
                        className={`text-xs px-2 py-1 rounded-full border-0 font-medium cursor-pointer ${STATUS_CLASS[inv.status]}`}
                      >
                        {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map(s => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <a
                          href={`/invoice/${inv.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors inline-flex"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => setDeleteTarget(inv.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />
      <ConfirmModal
        open={deleteTarget !== null}
        title="請求書を削除"
        description="この操作は取り消せません。"
        onConfirm={() => deleteTarget && deleteInvoice(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
