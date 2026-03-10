export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { calculateDetailedStats } from "@/lib/calculations/detailed-stats";
import { DetailedStatsCard } from "@/components/reports/detailed-stats-card";

export default async function DetailedReportsPage() {
  const trades = await prisma.trade.findMany({
    where: { status: "CLOSED" },
    orderBy: { entryDate: "asc" },
    select: {
      pnl: true,
      entryDate: true,
      exitDate: true,
      totalQuantity: true,
      avgEntryPrice: true,
      avgExitPrice: true,
    },
  });

  const stats = calculateDetailedStats(trades);

  return <DetailedStatsCard stats={stats} totalTrades={trades.length} />;
}
