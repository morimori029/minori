import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

type Props = { searchParams: Promise<{ month?: string; routeId?: string }> };

export default async function SalesReportPrintPage({ searchParams }: Props) {
  const { month, routeId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // 期間の計算
  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  let periodLabel = "全期間";

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    dateFrom = new Date(y, m - 1, 1);
    dateTo   = new Date(y, m, 0); // 月末
    periodLabel = `${y}年${m}月`;
  }

  const [records, profile, gradeRows] = await Promise.all([
    prisma.salesRecord.findMany({
      where: {
        userId: user.id,
        ...(dateFrom ? { date: { gte: dateFrom, lte: dateTo } } : {}),
        ...(routeId && routeId !== "all" ? { routeId } : {}),
      },
      include: {
        route: { select: { id: true, name: true, feeType: true, feeRate: true } },
        crop:  { select: { name: true, unit: true } },
      },
      orderBy: [{ routeId: "asc" }, { date: "asc" }],
    }),
    prisma.user.findUnique({ where: { id: user.id } }),
    prisma.gradeLabel.findMany({ where: { userId: user.id }, orderBy: { sortOrder: "asc" } }),
  ]);

  const gradeLabelMap: Record<string, string> =
    gradeRows.length > 0
      ? Object.fromEntries(gradeRows.map(g => [g.code, g.label]))
      : { S: "秀", A: "優", B: "良", X: "規格外" };

  // 販路ごとにグループ化
  const routeMap = new Map<string, {
    name: string;
    feeType: string;
    feeRate: number | null;
    records: typeof records;
    totalAmount: number;
    totalFee: number;
    totalProfit: number;
  }>();

  for (const r of records) {
    if (!routeMap.has(r.routeId)) {
      routeMap.set(r.routeId, {
        name: r.route.name,
        feeType: r.route.feeType,
        feeRate: r.route.feeRate ? Number(r.route.feeRate) : null,
        records: [],
        totalAmount: 0,
        totalFee: 0,
        totalProfit: 0,
      });
    }
    const entry = routeMap.get(r.routeId)!;
    entry.records.push(r);
    entry.totalAmount += r.totalAmount;
    entry.totalFee    += r.feeAmount;
    entry.totalProfit += r.netProfit;
  }

  const routes = [...routeMap.values()];
  const grandTotal   = records.reduce((s, r) => s + r.totalAmount, 0);
  const grandFee     = records.reduce((s, r) => s + r.feeAmount,   0);
  const grandProfit  = records.reduce((s, r) => s + r.netProfit,   0);
  const profitRate   = grandTotal > 0 ? ((grandProfit / grandTotal) * 100).toFixed(1) : "—";

  const farmName  = profile?.farmName ?? profile?.name ?? "農園名未設定";
  const issueDate = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;
  const fmtDate = (d: Date | string) => {
    const dt = new Date(d);
    return `${dt.getMonth() + 1}/${dt.getDate()}`;
  };

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{`売上帳票_${periodLabel}_${farmName}`}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif; font-size: 12px; color: #111; background: #fff; padding: 24px; }
          .page { max-width: 900px; margin: 0 auto; }

          /* ヘッダー */
          .doc-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #166534; }
          .doc-title { font-size: 22px; font-weight: 700; color: #166534; }
          .doc-meta { text-align: right; font-size: 11px; color: #555; line-height: 1.8; }
          .doc-meta .farm { font-size: 14px; font-weight: 700; color: #111; }

          /* サマリー */
          .summary { display: flex; gap: 16px; margin-bottom: 28px; }
          .summary-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; }
          .summary-card .label { font-size: 10px; color: #888; margin-bottom: 4px; }
          .summary-card .value { font-size: 18px; font-weight: 700; }
          .summary-card.profit .value { color: #166534; }

          /* 販路セクション */
          .route-section { margin-bottom: 28px; }
          .route-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #d1fae5; }
          .route-name { font-size: 14px; font-weight: 700; color: #166534; }
          .route-fee-badge { font-size: 10px; background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; border-radius: 4px; padding: 2px 6px; }

          /* テーブル */
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f8fafc; text-align: right; padding: 6px 8px; font-weight: 600; color: #555; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
          th.left { text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; text-align: right; white-space: nowrap; }
          td.left { text-align: left; }
          td.grade { text-align: center; font-weight: 600; background: #f8fafc; border-radius: 2px; }
          tr:last-child td { border-bottom: none; }
          tr.subtotal td { background: #f0fdf4; font-weight: 700; border-top: 1px solid #bbf7d0; }
          tr.subtotal td.left { color: #166534; }

          /* 合計 */
          .grand-total { margin-top: 24px; border: 2px solid #166534; border-radius: 8px; padding: 16px 20px; }
          .grand-total-title { font-size: 13px; font-weight: 700; color: #166534; margin-bottom: 12px; }
          .grand-total-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
          .grand-total-row .label { color: #555; }
          .grand-total-row.main { font-size: 15px; font-weight: 700; padding-top: 10px; border-top: 1px solid #bbf7d0; margin-top: 6px; }
          .grand-total-row.main .label { color: #111; }
          .grand-total-row.main .value { color: #166534; }

          /* 印刷ボタン */
          .print-btn { position: fixed; top: 16px; right: 16px; background: #166534; color: #fff; border: none; border-radius: 6px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer; z-index: 100; }
          .print-btn:hover { background: #14532d; }
          .no-data { text-align: center; padding: 48px; color: #888; }

          @media print {
            .print-btn { display: none; }
            body { padding: 16px; }
            .route-section { page-break-inside: avoid; }
          }
        `}</style>
      </head>
      <body>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <button className="print-btn" onClick={() => window.print()}>印刷 / PDF保存</button>

        <div className="page">
          {/* ヘッダー */}
          <div className="doc-header">
            <div>
              <div className="doc-title">売上帳票</div>
              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>{periodLabel}</div>
            </div>
            <div className="doc-meta">
              <div className="farm">{farmName}</div>
              <div>発行日：{issueDate}</div>
              <div>件数：{records.length}件</div>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="no-data">この期間の売上データがありません</div>
          ) : (
            <>
              {/* サマリー */}
              <div className="summary">
                <div className="summary-card">
                  <div className="label">売上合計</div>
                  <div className="value">{yen(grandTotal)}</div>
                </div>
                <div className="summary-card">
                  <div className="label">手数料合計</div>
                  <div className="value">{yen(grandFee)}</div>
                </div>
                <div className="summary-card profit">
                  <div className="label">手取り合計</div>
                  <div className="value">{yen(grandProfit)}</div>
                </div>
                <div className="summary-card">
                  <div className="label">利益率</div>
                  <div className="value">{profitRate}%</div>
                </div>
              </div>

              {/* 販路ごとの明細 */}
              {routes.map(route => (
                <div key={route.name} className="route-section">
                  <div className="route-header">
                    <span className="route-name">{route.name}</span>
                    {route.feeRate !== null && (
                      <span className="route-fee-badge">
                        手数料 {(route.feeRate * 100).toFixed(1)}%
                        {route.feeType === "TIER" ? "（段階）" : "（固定）"}
                      </span>
                    )}
                    {route.feeType === "TIER" && route.feeRate === null && (
                      <span className="route-fee-badge">段階手数料</span>
                    )}
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th className="left" style={{ width: 52 }}>日付</th>
                        <th className="left">作物</th>
                        <th style={{ width: 36 }}>等級</th>
                        <th style={{ width: 80 }}>数量</th>
                        <th style={{ width: 70 }}>単価</th>
                        <th style={{ width: 88 }}>売上金額</th>
                        <th style={{ width: 70 }}>手数料</th>
                        <th style={{ width: 88 }}>手取り</th>
                      </tr>
                    </thead>
                    <tbody>
                      {route.records.map(r => (
                        <tr key={r.id}>
                          <td className="left">{fmtDate(r.date)}</td>
                          <td className="left">{r.crop.name}</td>
                          <td className="grade">{gradeLabelMap[r.grade] ?? r.grade}</td>
                          <td>{Number(r.quantity).toLocaleString()}{r.crop.unit}</td>
                          <td>¥{r.unitPrice.toLocaleString()}</td>
                          <td>{yen(r.totalAmount)}</td>
                          <td style={{ color: "#dc2626" }}>−¥{r.feeAmount.toLocaleString()}</td>
                          <td style={{ color: "#166534", fontWeight: 600 }}>{yen(r.netProfit)}</td>
                        </tr>
                      ))}
                      <tr className="subtotal">
                        <td className="left" colSpan={5}>小計（{route.records.length}件）</td>
                        <td>{yen(route.totalAmount)}</td>
                        <td style={{ color: "#dc2626" }}>−¥{route.totalFee.toLocaleString()}</td>
                        <td style={{ color: "#166534" }}>{yen(route.totalProfit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}

              {/* 合計 */}
              <div className="grand-total">
                <div className="grand-total-title">合　計</div>
                <div className="grand-total-row">
                  <span className="label">売上合計</span>
                  <span>{yen(grandTotal)}</span>
                </div>
                <div className="grand-total-row">
                  <span className="label">手数料合計</span>
                  <span style={{ color: "#dc2626" }}>−{yen(grandFee)}</span>
                </div>
                <div className="grand-total-row main">
                  <span className="label">手取り合計</span>
                  <span className="value">{yen(grandProfit)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </body>
    </html>
  );
}
