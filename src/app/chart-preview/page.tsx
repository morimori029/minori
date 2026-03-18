"use client";

import {
  BarChart, Bar,
  AreaChart, Area,
  LineChart, Line,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const DATA = [
  { month: "10月", JA出荷: 82000, 道の駅: 45000, ポケマル: 28000, 食べチョク: 15000, 飲食店: 32000, 合計: 202000, 手取り: 171700 },
  { month: "11月", JA出荷: 95000, 道の駅: 52000, ポケマル: 33000, 食べチョク: 18000, 飲食店: 41000, 合計: 239000, 手取り: 203150 },
  { month: "12月", JA出荷: 110000, 道の駅: 68000, ポケマル: 41000, 食べチョク: 22000, 飲食店: 55000, 合計: 296000, 手取り: 251600 },
  { month: "1月",  JA出荷: 78000,  道の駅: 38000, ポケマル: 25000, 食べチョク: 12000, 飲食店: 28000, 合計: 181000, 手取り: 153850 },
  { month: "2月",  JA出荷: 88000,  道の駅: 42000, ポケマル: 29000, 食べチョク: 14000, 飲食店: 35000, 合計: 208000, 手取り: 176800 },
  { month: "3月",  JA出荷: 102000, 道の駅: 61000, ポケマル: 38000, 食べチョク: 19000, 飲食店: 48000, 合計: 268000, 手取り: 227800 },
];

const ROUTES = [
  { key: "JA出荷",  color: "#4ade80" },
  { key: "道の駅",  color: "#fb923c" },
  { key: "ポケマル", color: "#a78bfa" },
  { key: "食べチョク", color: "#f472b6" },
  { key: "飲食店",  color: "#38bdf8" },
];

const fmt = (v: number) => v >= 10000 ? `${(v/10000).toFixed(0)}万` : `${v}`;

function Section({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-5 bg-white space-y-2">
      <div>
        <h2 className="text-base font-bold">{label}</h2>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      {children}
    </div>
  );
}

export default function ChartPreview() {
  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold">チャートパターン比較</h1>

      {/* A: 積み上げ棒（現在） */}
      <Section label="A. 積み上げ棒グラフ（現在）" desc="全体売上と販路内訳が一度に分かる。">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12 }} width={44} />
            <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} />
            <Legend />
            {ROUTES.map(r => <Bar key={r.key} dataKey={r.key} stackId="a" fill={r.color} />)}
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* B: グループ棒 */}
      <Section label="B. グループ棒グラフ" desc="販路ごとに並べる。月をまたいで同じ販路を比べやすい。">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={DATA} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12 }} width={44} />
            <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} />
            <Legend />
            {ROUTES.map(r => <Bar key={r.key} dataKey={r.key} fill={r.color} radius={[3,3,0,0]} />)}
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* C: エリアチャート */}
      <Section label="C. 積み上げエリアチャート" desc="なめらかな曲線でトレンドが見やすく、自然な雰囲気。">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12 }} width={44} />
            <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} />
            <Legend />
            {ROUTES.map(r => (
              <Area key={r.key} type="monotone" dataKey={r.key} stackId="a"
                stroke={r.color} fill={r.color} fillOpacity={0.7} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </Section>

      {/* D: 棒+折れ線 */}
      <Section label="D. 棒グラフ（合計）＋折れ線（手取り利益）" desc="稼いだ額と実際の手取りを一画面で比較。シンプルで分かりやすい。">
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 12 }} width={44} />
            <Tooltip formatter={(v) => typeof v === "number" ? `¥${v.toLocaleString()}` : v} />
            <Legend />
            <Bar dataKey="合計" fill="#86efac" radius={[4,4,0,0]} name="総売上" />
            <Line type="monotone" dataKey="手取り" stroke="#16a34a" strokeWidth={2.5}
              dot={{ r: 4 }} name="手取り利益" />
          </ComposedChart>
        </ResponsiveContainer>
      </Section>
    </div>
  );
}
