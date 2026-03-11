export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ReportCharts } from "@/components/reports/report-charts";
import { format } from "date-fns";

export default async function ReportsPage() {
  const trades = await prisma.trade.findMany({
    where: { status: "CLOSED" },
    orderBy: { entryDate: "asc" },
    select: {
      id: true,
      entryDate: true,
      pnl: true,
      symbol: true,
      side: true,
    },
  });

  // Cumulative PnL over time
  let cumulative = 0;
  const cumulativePnl = trades.map((t) => {
    cumulative += t.pnl;
    return {
      date: t.entryDate.toISOString(),
      cumulative: Math.round(cumulative * 100) / 100,
    };
  });

  // Daily PnL
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

  // Win/Loss days
  const winDays = dailyPnl.filter((d) => d.pnl > 0).length;
  const lossDays = dailyPnl.filter((d) => d.pnl < 0).length;
  const breakEvenDays = dailyPnl.filter((d) => d.pnl === 0).length;

  // Drawdown calculation
  let peak = 0;
  let cumulativeForDD = 0;
  const drawdownData = trades.map((t) => {
    cumulativeForDD += t.pnl;
    if (cumulativeForDD > peak) peak = cumulativeForDD;
    const drawdown = peak > 0 ? ((peak - cumulativeForDD) / peak) * 100 : 0;
    return {
      date: t.entryDate.toISOString(),
      drawdown: Math.round(drawdown * 100) / 100,
    };
  });

  return (
    <ReportCharts
      cumulativePnl={cumulativePnl}
      dailyPnl={dailyPnl}
      drawdownData={drawdownData}
      winLossDays={{ winDays, lossDays, breakEvenDays }}
    />
  );
}
