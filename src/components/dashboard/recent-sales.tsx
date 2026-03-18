import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RecentSaleItem = {
  id: string;
  date: string;
  routeName: string;
  routeColor: string;
  cropName: string;
  grade: string;
  gradeLabel: string;
  totalAmount: number;
  netProfit: number;
};

export function RecentSales({ items }: { items: RecentSaleItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">最近の売上記録</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-2 h-8 rounded-full shrink-0"
                  style={{ backgroundColor: item.routeColor }}
                />
                <div>
                  <p className="text-sm font-medium">
                    {item.cropName}
                    <span className="text-xs text-muted-foreground ml-1.5">
                      ({item.gradeLabel})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.date} · {item.routeName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  ¥{item.totalAmount.toLocaleString("ja-JP")}
                </p>
                <p className="text-xs text-green-600">
                  手取 ¥{item.netProfit.toLocaleString("ja-JP")}
                </p>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              売上記録がありません
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
