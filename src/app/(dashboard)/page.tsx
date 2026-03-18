import { KpiCards } from "@/components/dashboard/kpi-cards";
import { MonthlyChart } from "@/components/dashboard/monthly-chart";
import { RouteDonut } from "@/components/dashboard/route-donut";
import { CropRanking } from "@/components/dashboard/crop-ranking";
import { RecentSales } from "@/components/dashboard/recent-sales";
import { createClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

async function getDashboardData(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [currentMonth, trend, activeRoutes, gradeRows] = await Promise.all([
    prisma.salesRecord.findMany({
      where: { userId, date: { gte: startOfMonth } },
      include: {
        route: { select: { id: true, name: true, color: true } },
        crop: { select: { id: true, name: true } },
      },
    }),
    prisma.salesRecord.findMany({
      where: { userId, date: { gte: sixMonthsAgo } },
      include: { route: { select: { id: true, name: true, color: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.route.findMany({
      where: { userId, isActive: true },
      select: { id: true, name: true, color: true },
    }),
    prisma.gradeLabel.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // グレードコード → 表示名マップ（未設定ならコードをそのまま使用）
  const gradeLabelMap: Record<string, string> = gradeRows.length > 0
    ? Object.fromEntries(gradeRows.map(g => [g.code, g.label]))
    : { S: "秀", A: "優", B: "良", X: "規格外" };

  const totalSales = currentMonth.reduce((s, r) => s + r.totalAmount, 0);
  const totalProfit = currentMonth.reduce((s, r) => s + r.netProfit, 0);
  const activeRouteIds = new Set(currentMonth.map((r) => r.routeId));

  // Route breakdown
  const routeMap = new Map<string, { name: string; color: string; sales: number; profit: number }>();
  for (const r of currentMonth) {
    const e = routeMap.get(r.routeId) ?? { name: r.route.name, color: r.route.color, sales: 0, profit: 0 };
    e.sales += r.totalAmount;
    e.profit += r.netProfit;
    routeMap.set(r.routeId, e);
  }
  const routeBreakdown = [...routeMap.values()].map((v) => ({
    name: v.name,
    color: v.color,
    amount: v.sales,
    profitRate: v.sales > 0 ? Math.round((v.profit / v.sales) * 1000) / 10 : 0,
  }));
  const bestRoute = [...routeBreakdown].sort((a, b) => b.profitRate - a.profitRate)[0] ?? null;

  // Monthly trend
  const monthlyMap = new Map<string, Map<string, number>>();
  for (const r of trend) {
    const d = new Date(r.date);
    const label = `${d.getMonth() + 1}月`;
    if (!monthlyMap.has(label)) monthlyMap.set(label, new Map());
    const m = monthlyMap.get(label)!;
    m.set(r.route.name, (m.get(r.route.name) ?? 0) + r.totalAmount);
  }
  const monthlyTrend = [...monthlyMap.entries()].map(([month, rm]) => ({
    month,
    ...Object.fromEntries(rm),
  }));

  // Crop ranking
  const gradeOrder = gradeRows.length > 0
    ? gradeRows.map(g => g.code)
    : ["S", "A", "B", "X"];
  const cropMap = new Map<string, { name: string; sales: number; profit: number; routeName: string; bestGrade: string }>();
  for (const r of currentMonth) {
    const e = cropMap.get(r.cropId) ?? { name: r.crop.name, sales: 0, profit: 0, routeName: r.route.name, bestGrade: r.grade };
    e.sales += r.totalAmount;
    e.profit += r.netProfit;
    const newIdx = gradeOrder.indexOf(r.grade);
    const curIdx = gradeOrder.indexOf(e.bestGrade);
    if (newIdx !== -1 && (curIdx === -1 || newIdx < curIdx)) e.bestGrade = r.grade;
    cropMap.set(r.cropId, e);
  }
  const cropRanking = [...cropMap.values()]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5)
    .map((v, i) => ({
      rank: i + 1,
      cropName: v.name,
      grade: v.bestGrade,
      gradeLabel: gradeLabelMap[v.bestGrade] ?? v.bestGrade,
      routeName: v.routeName,
      totalSales: v.sales,
      profitRate: v.sales > 0 ? Math.round((v.profit / v.sales) * 1000) / 10 : 0,
    }));

  // Recent sales
  const recentSales = [...currentMonth]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)
    .map((r) => {
      const d = new Date(r.date);
      return {
        id: r.id,
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        routeName: r.route.name,
        routeColor: r.route.color,
        cropName: r.crop.name,
        grade: r.grade,
        gradeLabel: gradeLabelMap[r.grade] ?? r.grade,
        totalAmount: r.totalAmount,
        netProfit: r.netProfit,
      };
    });

  return {
    totalSales,
    totalProfit,
    activeRoutes: activeRouteIds.size,
    bestRoute,
    monthlyTrend,
    routeBreakdown,
    cropRanking,
    recentSales,
    activeRouteList: activeRoutes,
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const now = new Date();
  const label = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  if (!user) return null;

  const data = await getDashboardData(user.id);
  const isEmpty = data.totalSales === 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground text-sm mt-1">{label}</p>
      </div>

      <KpiCards
        totalSales={data.totalSales}
        netProfit={data.totalProfit}
        activeRoutes={data.activeRoutes}
        topRouteName={data.bestRoute?.name ?? "—"}
        topRouteProfitRate={data.bestRoute?.profitRate ?? 0}
      />

      {isEmpty ? (
        <div className="rounded-lg border bg-muted/30 py-16 text-center text-muted-foreground text-sm">
          <p className="font-medium">まだ売上データがありません</p>
          <p className="mt-1">「売上入力」から今月の売上を記録しましょう</p>
        </div>
      ) : (
        <>
          <MonthlyChart data={data.monthlyTrend} routes={data.activeRouteList} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RouteDonut data={data.routeBreakdown} total={data.totalSales} />
            <RecentSales items={data.recentSales} />
          </div>

          <CropRanking items={data.cropRanking} />
        </>
      )}
    </div>
  );
}
