"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, TrendingUp } from "lucide-react";
import { useGradeLabelMap } from "@/lib/use-grade-labels";

type SalesRecord = {
  id: string;
  date: string;
  grade: string;
  unitPrice: number;
  quantity: string;
  totalAmount: number;
  feeAmount: number;
  netProfit: number;
  memo: string | null;
  route: { id: string; name: string; color: string };
  crop: { id: string; name: string; unit: string };
};

// 月の選択肢を生成（今月から過去12か月）
function buildMonthOptions() {
  const options: { value: string; label: string }[] = [{ value: "", label: "全期間" }];
  const now = new Date();
  for (let i = 0; i < 13; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return options;
}

function exportCSV(records: SalesRecord[], monthLabel: string, gradeLabels: Record<string, string>) {
  const BOM = "\uFEFF";
  const header = "日付,販路,作物,グレード,数量,単位,単価(円),売上金額(円),手数料(円),手取り(円),メモ";
  const rows = records.map(r =>
    [
      new Date(r.date).toLocaleDateString("ja-JP"),
      r.route.name,
      r.crop.name,
      gradeLabels[r.grade],
      parseFloat(r.quantity),
      r.crop.unit,
      r.unitPrice,
      r.totalAmount,
      r.feeAmount,
      r.netProfit,
      r.memo ?? "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")
  );
  const csv = BOM + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `売上履歴_${monthLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const gradeLabels = useGradeLabelMap();
  const [month, setMonth] = useState(defaultMonth);
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;
  const monthOptions = buildMonthOptions();

  async function load(p = page) {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(limit), page: String(p) });
    if (month) params.set("month", month);
    const res = await fetch(`/api/sales?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
    }
    setLoading(false);
  }

  useEffect(() => { setPage(1); load(1); }, [month]);
  useEffect(() => { if (page > 1) load(page); }, [page]);

  async function handleDelete(id: string) {
    if (!confirm("この売上記録を削除しますか？")) return;
    await fetch(`/api/sales/${id}`, { method: "DELETE" });
    setRecords(prev => prev.filter(r => r.id !== id));
  }

  const totalSales = records.reduce((s, r) => s + r.totalAmount, 0);
  const totalFee = records.reduce((s, r) => s + r.feeAmount, 0);
  const totalProfit = records.reduce((s, r) => s + r.netProfit, 0);
  const monthLabel = monthOptions.find(o => o.value === month)?.label ?? "全期間";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">売上履歴</h1>
          <p className="text-muted-foreground text-sm mt-1">過去の売上記録を確認・削除できます</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button
            variant="outline"
            disabled={records.length === 0}
            onClick={() => exportCSV(records, monthLabel, gradeLabels)}
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      {records.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "売上合計", value: totalSales },
            { label: "手数料合計", value: totalFee },
            { label: "手取り合計", value: totalProfit, highlight: true },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-xl font-bold mt-1 ${item.highlight ? "text-green-600" : ""}`}>
                  ¥{item.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* テーブル */}
      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>
      ) : records.length === 0 ? (
        <div className="rounded-lg border bg-muted/30 py-16 text-center text-muted-foreground text-sm">
          <TrendingUp className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">売上データがありません</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-175">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">日付</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">販路</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">作物</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">等級</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">数量</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">売上</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">手取り</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map(r => {
                  const d = new Date(r.date);
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {d.getMonth() + 1}/{d.getDate()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: r.route.color }}
                        >
                          {r.route.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{r.crop.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-muted">
                          {gradeLabels[r.grade]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {parseFloat(r.quantity)}{r.crop.unit}
                      </td>
                      <td className="px-4 py-3 text-right">¥{r.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        ¥{r.netProfit.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ページネーション */}
      {total > limit && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{total}件中 {(page - 1) * limit + 1}〜{Math.min(page * limit, total)}件</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              前へ
            </Button>
            <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>
              次へ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
