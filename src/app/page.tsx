export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { calculateMetrics } from "@/lib/calculations/metrics";
import { getDashboardConfig } from "@/actions/dashboard-actions";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { SetupStats, DailyPnl, DayOfWeekPnl, PriceRangePnl } from "@/types";
import { format } from "date-fns";

export default async function DashboardPage() {
  const [trades, recentTrades, widgetConfig] = await Promise.all([
    prisma.trade.findMany({
      where: { status: "CLOSED" },
      orderBy: { entryDate: "asc" },
      select: {
        id: true,
        symbol: true,
        side: true,
        status: true,
        entryDate: true,
        pnl: true,
        totalQuantity: true,
        avgEntryPrice: true,
        avgExitPrice: true,
        setup: true,
      },
    }),
    prisma.trade.findMany({
      orderBy: { entryDate: "desc" },
      take: 10,
      select: {
        id: true,
        symbol: true,
        side: true,
        entryDate: true,
        pnl: true,
        totalQuantity: true,
      },
    }),
    getDashboardConfig(),
  ]);

  const metrics = calculateMetrics(trades);

  // Build cumulative PnL data for chart
  let cumulative = 0;
  const pnlData = trades.map((t) => {
    cumulative += t.pnl;
    return {
      date: t.entryDate.toISOString(),
      pnl: t.pnl,
      cumulative: Math.round(cumulative * 100) / 100,
    };
  });

  // Daily PnL (aggregated by day) for bar chart widget
  const dailyPnlMap: Record<string, number> = {};
  for (const t of trades) {
    const day = format(new Date(t.entryDate), "yyyy-MM-dd");
    dailyPnlMap[day] = (dailyPnlMap[day] ?? 0) + t.pnl;
  }
  const dailyPnl = Object.entries(dailyPnlMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({
      date,
      pnl: Math.round(pnl * 100) / 100,
    }));

  // Drawdown % (peak-to-trough as percentage of peak equity)
  let ddPeak = 0;
  let ddCumulative = 0;
  const drawdownData = trades.map((t) => {
    ddCumulative += t.pnl;
    if (ddCumulative > ddPeak) ddPeak = ddCumulative;
    const drawdown = ddPeak > 0 ? ((ddPeak - ddCumulative) / ddPeak) * 100 : 0;
    return {
      date: t.entryDate.toISOString(),
      drawdown: Math.round(drawdown * 100) / 100,
    };
  });

  // Aggregate P&L by setup
  const setupMap = new Map<
    string,
    { netPnl: number; wins: number; losses: number; total: number }
  >();
  for (const t of trades) {
    if (!t.setup) continue;
    const key = t.setup;
    const entry = setupMap.get(key) ?? { netPnl: 0, wins: 0, losses: 0, total: 0 };
    entry.netPnl += t.pnl;
    entry.total++;
    if (t.pnl > 0) entry.wins++;
    else if (t.pnl < 0) entry.losses++;
    setupMap.set(key, entry);
  }
  const setupStats: SetupStats[] = Array.from(setupMap.entries())
    .map(([setup, s]) => ({
      setup,
      netPnl: Math.round(s.netPnl * 100) / 100,
      tradeCount: s.total,
      winCount: s.wins,
      lossCount: s.losses,
      winRate: s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.netPnl - a.netPnl);

  // Build last 7 calendar days with aggregated PnL
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last7Days: DailyPnl[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    last7Days.push({ date: dateStr, pnl: 0, tradeCount: 0 });
  }
  // Map trades into the 7-day buckets
  const dayMap = new Map(last7Days.map((d) => [d.date, d]));
  for (const t of trades) {
    const key = t.entryDate.toISOString().slice(0, 10);
    const bucket = dayMap.get(key);
    if (bucket) {
      bucket.pnl = Math.round((bucket.pnl + t.pnl) * 100) / 100;
      bucket.tradeCount++;
    }
  }

  // Aggregate P&L by day of week
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowBuckets = DAY_LABELS.map((label, i) => ({
    day: i,
    label,
    pnl: 0,
    tradeCount: 0,
  }));
  for (const t of trades) {
    const dow = new Date(t.entryDate).getDay(); // 0=Sun
    dowBuckets[dow].pnl = Math.round((dowBuckets[dow].pnl + t.pnl) * 100) / 100;
    dowBuckets[dow].tradeCount++;
  }
  const totalAbsPnl = dowBuckets.reduce((sum, d) => sum + Math.abs(d.pnl), 0);
  const dayOfWeekPnl: DayOfWeekPnl[] = dowBuckets.map((d) => ({
    ...d,
    percent: totalAbsPnl > 0 ? Math.round((Math.abs(d.pnl) / totalAbsPnl) * 10000) / 100 : 0,
  }));

  // Aggregate P&L by stock price range (based on avgEntryPrice)
  const PRICE_RANGES: { label: string; min: number; max: number }[] = [
    { label: "< $0.50", min: 0, max: 0.5 },
    { label: "$0.50 - $0.99", min: 0.5, max: 1 },
    { label: "$1 - $2.99", min: 1, max: 3 },
    { label: "$3 - $4.99", min: 3, max: 5 },
    { label: "$5 - $9.99", min: 5, max: 10 },
    { label: "$10 - $19.99", min: 10, max: 20 },
    { label: "$20 - $50", min: 20, max: 50 },
    { label: "> $50", min: 50, max: Infinity },
  ];
  const priceBuckets = PRICE_RANGES.map((r) => ({
    ...r,
    pnl: 0,
    tradeCount: 0,
  }));
  for (const t of trades) {
    const price = t.avgEntryPrice;
    const bucket = priceBuckets.find((b) => price >= b.min && price < b.max);
    if (bucket) {
      bucket.pnl = Math.round((bucket.pnl + t.pnl) * 100) / 100;
      bucket.tradeCount++;
    }
  }
  const totalAbsPricePnl = priceBuckets.reduce((sum, b) => sum + Math.abs(b.pnl), 0);
  const priceRangePnl: PriceRangePnl[] = priceBuckets.map((b) => ({
    label: b.label,
    min: b.min,
    max: b.max,
    pnl: b.pnl,
    percent: totalAbsPricePnl > 0 ? Math.round((Math.abs(b.pnl) / totalAbsPricePnl) * 10000) / 100 : 0,
    tradeCount: b.tradeCount,
  }));

  return (
    <WidgetGrid
      initialConfig={widgetConfig}
      data={{
        metrics,
        pnlData,
        dailyPnl,
        drawdownData,
        recentTrades: recentTrades.map((t) => ({
          ...t,
          entryDate: t.entryDate.toISOString(),
        })),
        setupStats,
        last7Days,
        dayOfWeekPnl,
        priceRangePnl,
      }}
    />
  );
}
