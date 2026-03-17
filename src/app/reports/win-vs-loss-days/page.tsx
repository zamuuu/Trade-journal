export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { calculateWinLossDaysStats } from "@/lib/calculations/win-loss-days-stats";
import { WinLossDaysCard } from "@/components/reports/win-loss-days-card";
import { getDateCutoff } from "@/lib/date-range";

interface PageProps {
  searchParams: Promise<{ range?: string }>;
}

export default async function WinVsLossDaysPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cutoff = getDateCutoff(params.range);
  const dateFilter = cutoff ? { gte: cutoff } : undefined;

  const trades = await prisma.trade.findMany({
    where: {
      status: "CLOSED",
      ...(dateFilter && { entryDate: dateFilter }),
    },
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
