export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { CalendarView } from "@/components/calendar/calendar-view";
import { format } from "date-fns";

interface SearchParams {
  year?: string;
  month?: string;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = parseInt(params.year ?? now.getFullYear().toString(), 10);
  // month param is optional — if present, drill into that month
  const month = params.month ? parseInt(params.month, 10) : null;

  // Load all trades for the entire year
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);

  const trades = await prisma.trade.findMany({
    where: {
      status: "CLOSED",
      entryDate: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
    select: {
      id: true,
      symbol: true,
      side: true,
      entryDate: true,
      pnl: true,
      totalQuantity: true,
    },
    orderBy: { entryDate: "asc" },
  });

  // Group by day
  const dayMap: Record<
    string,
    {
      pnl: number;
      tradeCount: number;
      trades: {
        id: string;
        symbol: string;
        side: string;
        entryDate: string;
        pnl: number;
        totalQuantity: number;
      }[];
    }
  > = {};

  for (const trade of trades) {
    const dayKey = format(new Date(trade.entryDate), "yyyy-MM-dd");
    if (!dayMap[dayKey]) {
      dayMap[dayKey] = { pnl: 0, tradeCount: 0, trades: [] };
    }
    dayMap[dayKey].pnl += trade.pnl;
    dayMap[dayKey].tradeCount++;
    dayMap[dayKey].trades.push({
      ...trade,
      entryDate: trade.entryDate.toISOString(),
    });
  }

  // Round PnL values
  for (const day of Object.values(dayMap)) {
    day.pnl = Math.round(day.pnl * 100) / 100;
  }

  return (
    <div className="space-y-4">
      <CalendarView year={year} month={month} dayData={dayMap} />
    </div>
  );
}
