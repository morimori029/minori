"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthlyData = {
  month: string;
  [routeName: string]: string | number;
};

type MonthlyChartProps = {
  data: MonthlyData[];
  routes: { name: string; color: string }[];
};

function formatYen(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
  return `¥${value.toLocaleString("ja-JP")}`;
}

export function MonthlyChart({ data, routes }: MonthlyChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">販路別月次売上（過去6ヶ月）</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 4, right: 48, left: 8, bottom: 0 }} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="4 4" stroke="#f5f5f5" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatYen} tick={{ fontSize: 12, fill: "#9ca3af" }} width={48} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
              contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.10)", fontSize: 12 }}
              wrapperStyle={{ zIndex: 50 }}
              allowEscapeViewBox={{ x: true, y: true }}
              offset={16}
              formatter={(value) => [
                typeof value === "number"
                  ? `¥${value.toLocaleString("ja-JP")}`
                  : value,
              ]}
            />
            <Legend iconType="circle" iconSize={8} />
            {routes.map((route, i) => (
              <Bar
                key={route.name}
                dataKey={route.name}
                stackId="a"
                fill={route.color}
                fillOpacity={0.75}
                radius={i === routes.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
