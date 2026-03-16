export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { calculateDetailedStats } from "@/lib/calculations/detailed-stats";
import { DetailedStatsCard } from "@/components/reports/detailed-stats-card";
import { ReportCharts } from "@/components/reports/report-charts";
import { format } from "date-fns";

export default async function ReportsPage() {
  const trades = await prisma.trade.findMany({
    where: { status: "CLOSED" },
    orderBy: { entryDate: "asc" },
    select: {
      id: true,
      pnl: true,
      entryDate: true,
      exitDate: true,
      totalQuantity: true,
      avgEntryPrice: true,
      avgExitPrice: true,
    },
  });

  // Detailed stats (24-metric table)
  const stats = calculateDetailedStats(trades);

  // Daily PnL (aggregated by day)
  const dailyMap: Record<string, number> = {};
  for (const t of trades) {
    const day = format(new Date(t.entryDate), "yyyy-MM-dd");
    dailyMap[day] = (dailyMap[day] ?? 0) + t.pnl;
  }
  const dailyPnl = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({
      date,
      pnl: Math.round(pnl * 100) / 100,
    }));

  // Drawdown % (peak-to-trough as percentage of peak equity)
  let peak = 0;
  let cumulative = 0;
  const drawdownData = trades.map((t) => {
    cumulative += t.pnl;
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
    return {
      date: t.entryDate.toISOString(),
      drawdown: Math.round(drawdown * 100) / 100,
    };
  });

  return (
    <div className="space-y-4">
      <DetailedStatsCard stats={stats} totalTrades={trades.length} />
      <ReportCharts dailyPnl={dailyPnl} drawdownData={drawdownData} />
    </div>
  );
}
