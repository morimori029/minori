"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RouteShare = {
  name: string;
  amount: number;
  color: string;
};

type RouteDonutProps = {
  data: RouteShare[];
  total: number;
};

export function RouteDonut({ data, total }: RouteDonutProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">今月の販路別内訳</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
                dataKey="amount"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  typeof value === "number"
                    ? `¥${value.toLocaleString("ja-JP")}`
                    : value,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* 凡例 */}
          <div className="flex-1 space-y-2">
            {data.map((item) => {
              const pct = total > 0 ? ((item.amount / total) * 100).toFixed(1) : "0.0";
              return (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">
                      ¥{item.amount.toLocaleString("ja-JP")}
                    </span>
                    <span className="text-muted-foreground ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
