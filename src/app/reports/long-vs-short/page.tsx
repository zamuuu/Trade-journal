export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { calculateLongShortStats } from "@/lib/calculations/long-short-stats";
import { LongShortCard } from "@/components/reports/long-short-card";

export default async function LongVsShortPage() {
  const trades = await prisma.trade.findMany({
    where: { status: "CLOSED" },
    orderBy: { entryDate: "asc" },
    select: {
      side: true,
      pnl: true,
      entryDate: true,
      exitDate: true,
      totalQuantity: true,
      avgEntryPrice: true,
      avgExitPrice: true,
    },
  });

  const stats = calculateLongShortStats(trades);

  return <LongShortCard long={stats.long} short={stats.short} />;
}
