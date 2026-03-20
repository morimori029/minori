import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, Store, Trophy } from "lucide-react";

type KpiCardsProps = {
  totalSales: number;
  netProfit: number;
  activeRoutes: number;
  topRouteName: string;
  topRouteProfitRate: number;
};

function formatYen(amount: number) {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function KpiCards({
  totalSales,
  netProfit,
  activeRoutes,
  topRouteName,
  topRouteProfitRate,
}: KpiCardsProps) {
  const profitRate = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* 総売上 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            今月の総売上
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-lg md:text-2xl font-bold">{formatYen(totalSales)}</p>
        </CardContent>
      </Card>

      {/* 手取り利益 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            手取り利益
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-lg md:text-2xl font-bold text-green-600">{formatYen(netProfit)}</p>
          <p className="text-xs text-muted-foreground mt-1">利益率 {profitRate}%</p>
        </CardContent>
      </Card>

      {/* 稼働販路数 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            稼働中の販路
          </CardTitle>
          <Store className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-lg md:text-2xl font-bold">{activeRoutes}</p>
          <p className="text-xs text-muted-foreground mt-1">販路</p>
        </CardContent>
      </Card>

      {/* 最高利益率販路 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            最高利益率の販路
          </CardTitle>
          <Trophy className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-lg md:text-2xl font-bold truncate">{topRouteName || "—"}</p>
          {topRouteName && (
            <p className="text-xs text-muted-foreground mt-1">
              利益率 {topRouteProfitRate.toFixed(1)}%
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
