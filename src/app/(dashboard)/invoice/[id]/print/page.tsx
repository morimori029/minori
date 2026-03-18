import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export default async function InvoicePrintPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [invoice, profile] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, userId: user.id },
      include: { items: true },
    }),
    prisma.user.findUnique({ where: { id: user.id } }),
  ]);

  if (!invoice) notFound();

  const STATUS_LABEL: Record<string, string> = {
    DRAFT: "下書き", SENT: "送付済み", PAID: "支払済み", OVERDUE: "期限超過",
  };

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <title>請求書 {invoice.invoiceNumber}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: "Hiragino Kaku Gothic Pro", "Meiryo", sans-serif; color: #111; background: #fff; }
          .page { max-width: 210mm; margin: 0 auto; padding: 24mm 20mm; }
          .title { font-size: 28px; font-weight: bold; text-align: center; margin-bottom: 24px; letter-spacing: 4px; }
          .meta-row { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .to-block { flex: 1; }
          .to-name { font-size: 20px; font-weight: bold; border-bottom: 2px solid #111; padding-bottom: 4px; margin-bottom: 4px; }
          .to-sub { font-size: 12px; color: #444; }
          .from-block { font-size: 12px; text-align: right; line-height: 1.8; }
          .from-block .farm { font-size: 15px; font-weight: bold; }
          .dates { display: flex; gap: 24px; font-size: 13px; margin-bottom: 24px; }
          .dates span { color: #555; }
          .number { font-size: 12px; color: #555; text-align: right; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          th { background: #f0f0f0; padding: 8px 12px; text-align: left; border: 1px solid #ccc; font-size: 12px; }
          td { padding: 8px 12px; border: 1px solid #ccc; }
          .text-right { text-align: right; }
          .totals { margin-left: auto; width: 260px; font-size: 13px; }
          .totals-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #e0e0e0; }
          .totals-row.total { font-size: 16px; font-weight: bold; border-bottom: 2px solid #111; padding-top: 8px; }
          .bank { margin-top: 28px; font-size: 13px; }
          .bank-title { font-size: 12px; color: #555; margin-bottom: 4px; }
          .memo { margin-top: 16px; font-size: 12px; color: #555; }
          .invoice-number { font-size: 12px; color: #555; margin-top: 4px; }
          @media print {
            .no-print { display: none !important; }
            body { background: #fff; }
            .page { padding: 15mm 15mm; }
          }
        `}</style>
      </head>
      <body>
        {/* 印刷ボタン（印刷時は非表示） */}
        <div className="no-print" style={{ textAlign: "center", padding: "16px", background: "#f9f9f9", borderBottom: "1px solid #e0e0e0" }}>
          <button
            onClick={() => window.print()}
            style={{ padding: "8px 24px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
          >
            印刷 / PDF保存
          </button>
        </div>

        <div className="page">
          <div className="title">請　求　書</div>

          <div className="number">
            請求書番号：{invoice.invoiceNumber}　/　ステータス：{STATUS_LABEL[invoice.status]}
          </div>

          <div className="meta-row">
            {/* 請求先 */}
            <div className="to-block">
              <div className="to-name">{invoice.clientName}　御中</div>
              {invoice.clientAddress && (
                <div className="to-sub">{invoice.clientAddress}</div>
              )}
            </div>

            {/* 発行者（農園情報） */}
            <div className="from-block">
              {profile?.farmName && <div className="farm">{profile.farmName}</div>}
              {profile?.name && <div>{profile.name}</div>}
              {profile?.location && <div>{profile.location}</div>}
              {profile?.invoiceNumber && <div>登録番号：{profile.invoiceNumber}</div>}
            </div>
          </div>

          <div className="dates">
            <div><span>発行日：</span>{new Date(invoice.issueDate).toLocaleDateString("ja-JP")}</div>
            <div><span>支払期限：</span>{new Date(invoice.dueDate).toLocaleDateString("ja-JP")}</div>
          </div>

          {/* 明細 */}
          <table>
            <thead>
              <tr>
                <th style={{ width: "45%" }}>品目</th>
                <th className="text-right" style={{ width: "15%" }}>数量</th>
                <th className="text-right" style={{ width: "20%" }}>単価（円）</th>
                <th className="text-right" style={{ width: "20%" }}>金額（円）</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map(item => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td className="text-right">{parseFloat(item.quantity.toString())}</td>
                  <td className="text-right">{item.unitPrice.toLocaleString()}</td>
                  <td className="text-right">{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 合計 */}
          <div className="totals">
            <div className="totals-row">
              <span>小計</span>
              <span>¥{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="totals-row">
              <span>消費税（10%）</span>
              <span>¥{invoice.tax.toLocaleString()}</span>
            </div>
            <div className="totals-row total">
              <span>合計</span>
              <span>¥{invoice.total.toLocaleString()}</span>
            </div>
          </div>

          {/* 振込先 */}
          {invoice.bankInfo && (
            <div className="bank">
              <div className="bank-title">【お振込先】</div>
              <div>{invoice.bankInfo}</div>
            </div>
          )}

          {/* 備考 */}
          {invoice.memo && (
            <div className="memo">
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>備考</div>
              <div>{invoice.memo}</div>
            </div>
          )}
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelector("button") && document.querySelector("button").addEventListener("click", function() {
            window.print();
          });
        ` }} />
      </body>
    </html>
  );
}
