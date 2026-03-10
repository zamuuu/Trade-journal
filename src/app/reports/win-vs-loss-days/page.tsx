export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { calculateWinLossDaysStats } from "@/lib/calculations/win-loss-days-stats";
import { WinLossDaysCard } from "@/components/reports/win-loss-days-card";

export default async function WinVsLossDaysPage() {
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

  const stats = calculateWinLossDaysStats(trades);

  return <WinLossDaysCard winning={stats.winning} losing={stats.losing} />;
}
