import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CropRankItem = {
  rank: number;
  cropName: string;
  grade: string;
  gradeLabel: string;
  routeName: string;
  totalSales: number;
  profitRate: number;
};

export function CropRanking({ items }: { items: CropRankItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">作物別ランキング</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground text-xs border-b">
              <th className="text-left py-2 pr-3 w-8">#</th>
              <th className="text-left py-2 pr-3">作物</th>
              <th className="text-left py-2 pr-3">グレード</th>
              <th className="text-left py-2 pr-3">販路</th>
              <th className="text-right py-2 pr-3">売上</th>
              <th className="text-right py-2">利益率</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.rank} className="border-b last:border-0">
                <td className="py-2 pr-3 text-muted-foreground">{item.rank}</td>
                <td className="py-2 pr-3 font-medium">{item.cropName}</td>
                <td className="py-2 pr-3">
                  <span className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                    {item.gradeLabel}
                  </span>
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{item.routeName}</td>
                <td className="py-2 pr-3 text-right">
                  ¥{item.totalSales.toLocaleString("ja-JP")}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${Math.min(item.profitRate, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs w-10 text-right">
                      {item.profitRate.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  売上データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
