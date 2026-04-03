export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { calculateMetrics } from "@/lib/calculations/metrics";
import { getDashboardConfig } from "@/actions/dashboard-actions";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
import { SetupStats, DailyPnl, DayOfWeekPnl, PriceRangePnl, HourRangePnl } from "@/types";
import { getDateFilter } from "@/lib/date-range";

// ── Constants ────────────────────────────────────────────────────
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_START = 7;
const HOUR_END = 19;

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

function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function findPriceRangeIndex(price: number): number {
  for (let i = 0; i < PRICE_RANGES.length; i++) {
    if (price >= PRICE_RANGES[i].min && price < PRICE_RANGES[i].max) return i;
  }
  return -1;
}

// ── Page ─────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ range?: string; dateFrom?: string; dateTo?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dateFilter = getDateFilter(params);

  // Two parallel queries: trades + widget config (removed redundant recentTrades query)
  const [trades, widgetConfig] = await Promise.all([
    prisma.trade.findMany({
      where: {
        status: "CLOSED",
        ...(dateFilter && { entryDate: dateFilter }),
      },
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
    getDashboardConfig(),
  ]);

  const metrics = calculateMetrics(trades);

  // ── Single-pass aggregation ──────────────────────────────────
  // Instead of 8 separate loops over trades, compute everything in one pass.

  // Pre-allocate buckets
  const dailyPnlMap: Record<string, number> = {};
  const setupMap = new Map<
    string,
    { netPnl: number; wins: number; losses: number; total: number }
  >();
  const dowBuckets = DAY_LABELS.map((label, i) => ({
    day: i, label, pnl: 0, tradeCount: 0,
  }));
  const priceBuckets = PRICE_RANGES.map((r) => ({ ...r, pnl: 0, tradeCount: 0 }));
  const hourBuckets = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => ({
    hour: HOUR_START + i, label: hourLabel(HOUR_START + i), pnl: 0, tradeCount: 0,
  }));

  // Last 7 days setup
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last7Days: DailyPnl[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7Days.push({ date: d.toISOString().slice(0, 10), pnl: 0, tradeCount: 0 });
  }
  const last7Map = new Map(last7Days.map((d) => [d.date, d]));

  // Cumulative / drawdown tracking
  let cumulative = 0;
  let ddPeak = 0;

  const pnlData: { date: string; pnl: number; cumulative: number }[] = [];
  const drawdownData: { date: string; drawdown: number }[] = [];

  // ── The single loop ──────────────────────────────────────────
  for (const t of trades) {
    const dateObj = new Date(t.entryDate);
    const dateIso = t.entryDate.toISOString();
    const dateKey = dateIso.slice(0, 10); // YYYY-MM-DD
    const pnl = t.pnl;

    // Cumulative PnL
    cumulative += pnl;
    pnlData.push({ date: dateIso, pnl, cumulative: r2(cumulative) });

    // Drawdown
    if (cumulative > ddPeak) ddPeak = cumulative;
    const drawdown = ddPeak > 0 ? ((ddPeak - cumulative) / ddPeak) * 100 : 0;
    drawdownData.push({ date: dateIso, drawdown: r2(drawdown) });

    // Daily PnL
    dailyPnlMap[dateKey] = (dailyPnlMap[dateKey] ?? 0) + pnl;

    // Setup aggregation
    if (t.setup) {
      const entry = setupMap.get(t.setup) ?? { netPnl: 0, wins: 0, losses: 0, total: 0 };
      entry.netPnl += pnl;
      entry.total++;
      if (pnl > 0) entry.wins++;
      else if (pnl < 0) entry.losses++;
      setupMap.set(t.setup, entry);
    }

    // Last 7 days
    const bucket7 = last7Map.get(dateKey);
    if (bucket7) {
      bucket7.pnl = r2(bucket7.pnl + pnl);
      bucket7.tradeCount++;
    }

    // Day of week
    const dow = dateObj.getDay();
    dowBuckets[dow].pnl = r2(dowBuckets[dow].pnl + pnl);
    dowBuckets[dow].tradeCount++;

    // Price range (direct index lookup instead of Array.find)
    const priceIdx = findPriceRangeIndex(t.avgEntryPrice);
    if (priceIdx >= 0) {
      priceBuckets[priceIdx].pnl = r2(priceBuckets[priceIdx].pnl + pnl);
      priceBuckets[priceIdx].tradeCount++;
    }

    // Hour range (direct index instead of Array.find)
    const h = dateObj.getHours();
    const hourIdx = h - HOUR_START;
    if (hourIdx >= 0 && hourIdx < hourBuckets.length) {
      hourBuckets[hourIdx].pnl = r2(hourBuckets[hourIdx].pnl + pnl);
      hourBuckets[hourIdx].tradeCount++;
    }
  }

  // ── Post-processing ──────────────────────────────────────────

  const dailyPnl = Object.entries(dailyPnlMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, pnl]) => ({ date, pnl: r2(pnl) }));

  const setupStats: SetupStats[] = Array.from(setupMap.entries())
    .map(([setup, s]) => ({
      setup,
      netPnl: r2(s.netPnl),
      tradeCount: s.total,
      winCount: s.wins,
      lossCount: s.losses,
      winRate: s.total > 0 ? Math.round((s.wins / s.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.netPnl - a.netPnl);

  const totalAbsPnl = dowBuckets.reduce((sum, d) => sum + Math.abs(d.pnl), 0);
  const dayOfWeekPnl: DayOfWeekPnl[] = dowBuckets.map((d) => ({
    ...d,
    percent: totalAbsPnl > 0 ? r2((Math.abs(d.pnl) / totalAbsPnl) * 100) : 0,
  }));

  const totalAbsPricePnl = priceBuckets.reduce((sum, b) => sum + Math.abs(b.pnl), 0);
  const priceRangePnl: PriceRangePnl[] = priceBuckets.map((b) => ({
    label: b.label,
    min: b.min,
    max: b.max,
    pnl: b.pnl,
    percent: totalAbsPricePnl > 0 ? r2((Math.abs(b.pnl) / totalAbsPricePnl) * 100) : 0,
    tradeCount: b.tradeCount,
  }));

  const totalAbsHourPnl = hourBuckets.reduce((sum, b) => sum + Math.abs(b.pnl), 0);
  const hourRangePnl: HourRangePnl[] = hourBuckets.map((b) => ({
    hour: b.hour,
    label: b.label,
    pnl: b.pnl,
    percent: totalAbsHourPnl > 0 ? r2((Math.abs(b.pnl) / totalAbsHourPnl) * 100) : 0,
    tradeCount: b.tradeCount,
  }));

  // Recent trades: slice from already-loaded trades (no extra DB query)
  const recentTrades = trades.slice(-10).reverse().map((t) => ({
    id: t.id,
    symbol: t.symbol,
    side: t.side,
    entryDate: t.entryDate.toISOString(),
    pnl: t.pnl,
    totalQuantity: t.totalQuantity,
  }));

  return (
    <WidgetGrid
      initialConfig={widgetConfig}
      data={{
        metrics,
        pnlData,
        dailyPnl,
        drawdownData,
        recentTrades,
        setupStats,
        last7Days,
        dayOfWeekPnl,
        priceRangePnl,
        hourRangePnl,
      }}
    />
  );
}
