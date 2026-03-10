import { WinLossDaySideStats } from "@/types";
import { format } from "date-fns";

interface TradeForStats {
  side: string;
  pnl: number;
  entryDate: Date;
  exitDate: Date | null;
  totalQuantity: number;
  avgEntryPrice: number;
  avgExitPrice: number | null;
}

// ── helpers ──────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const sumSq = values.reduce((s, v) => s + (v - avg) ** 2, 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

function holdTimeMs(t: TradeForStats): number | null {
  if (!t.exitDate) return null;
  return t.exitDate.getTime() - t.entryDate.getTime();
}

function avgMs(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function computeKRatio(trades: TradeForStats[]): number | null {
  const n = trades.length;
  if (n < 3) return null;

  const y: number[] = [];
  let cumulative = 0;
  for (const t of trades) {
    cumulative += t.pnl;
    y.push(cumulative);
  }

  const xMean = (n - 1) / 2;
  const yMean = mean(y);

  let ssXY = 0;
  let ssXX = 0;
  for (let i = 0; i < n; i++) {
    ssXY += (i - xMean) * (y[i] - yMean);
    ssXX += (i - xMean) ** 2;
  }
  if (ssXX === 0) return null;
  const slope = ssXY / ssXX;

  let ssResidual = 0;
  for (let i = 0; i < n; i++) {
    const predicted = yMean + slope * (i - xMean);
    ssResidual += (y[i] - predicted) ** 2;
  }
  const df = n - 2;
  const mse = ssResidual / df;
  const seBeta = Math.sqrt(mse / ssXX);
  if (seBeta === 0) return null;

  return (slope / seBeta) / Math.sqrt(df);
}

function computeProbabilityOfRandomChance(
  totalTrades: number,
  winningTrades: number
): number | null {
  if (totalTrades < 5) return null;

  const p0 = 0.5;
  const pHat = winningTrades / totalTrades;
  const se = Math.sqrt((p0 * (1 - p0)) / totalTrades);
  if (se === 0) return null;

  const z = (pHat - p0) / se;
  const absZ = Math.abs(z);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absZ / Math.SQRT2);
  const erf =
    1 -
    (a1 * t + a2 * t ** 2 + a3 * t ** 3 + a4 * t ** 4 + a5 * t ** 5) *
      Math.exp(-1 * (absZ / Math.SQRT2) ** 2);

  const pValue = 1 - erf;
  return pValue * 100;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

// ── compute stats for a set of trades belonging to one side ─────

function computeSideStats(
  trades: TradeForStats[],
  dayCount: number
): WinLossDaySideStats {
  const sorted = [...trades].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  );
  const n = sorted.length;

  if (n === 0) {
    return {
      dayCount,
      totalGainLoss: 0,
      averageDailyGainLoss: 0,
      averageDailyVolume: 0,
      averagePerShareGainLoss: 0,
      averageTradeGainLoss: null,
      totalNumberOfTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      scratchTrades: 0,
      averageWinningTrade: null,
      averageLosingTrade: null,
      tradePnlStdDeviation: null,
      probabilityOfRandomChance: null,
      kRatio: null,
      sqn: null,
      kellyPercentage: null,
      avgHoldTimeWinningMs: null,
      avgHoldTimeLosingMs: null,
      avgHoldTimeScratchMs: null,
      profitFactor: null,
      largestGain: 0,
    };
  }

  const winners = sorted.filter((t) => t.pnl > 0);
  const losers = sorted.filter((t) => t.pnl < 0);
  const scratches = sorted.filter((t) => t.pnl === 0);

  const pnls = sorted.map((t) => t.pnl);
  const totalGainLoss = pnls.reduce((s, v) => s + v, 0);
  const totalShares = sorted.reduce((s, t) => s + t.totalQuantity, 0);

  // Daily aggregations
  const dailyMap: Record<string, { pnl: number; volume: number }> = {};
  for (const t of sorted) {
    const day = format(t.entryDate, "yyyy-MM-dd");
    if (!dailyMap[day]) dailyMap[day] = { pnl: 0, volume: 0 };
    dailyMap[day].pnl += t.pnl;
    dailyMap[day].volume += t.totalQuantity;
  }
  const dailyValues = Object.values(dailyMap);
  const numDays = dailyValues.length || 1;

  const avgDailyGainLoss =
    dailyValues.reduce((s, d) => s + d.pnl, 0) / numDays;
  const avgDailyVolume =
    dailyValues.reduce((s, d) => s + d.volume, 0) / numDays;

  const avgPerShare = totalShares > 0 ? totalGainLoss / totalShares : 0;

  const grossWins = winners.reduce((s, t) => s + t.pnl, 0);
  const grossLosses = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
  const avgWin = winners.length > 0 ? grossWins / winners.length : null;
  const avgLoss = losers.length > 0 ? grossLosses / losers.length : null;

  const pnlStd = n >= 2 ? stdDev(pnls) : null;

  const winRateDecimal = n > 0 ? winners.length / n : 0;
  let kellyPercentage: number | null = null;
  if (winners.length > 0 && losers.length > 0 && avgLoss !== null && avgLoss > 0 && avgWin !== null) {
    const R = avgWin / avgLoss;
    kellyPercentage = (winRateDecimal - (1 - winRateDecimal) / R) * 100;
  }

  const sqn =
    n >= 30 && pnlStd !== null && pnlStd > 0
      ? (mean(pnls) / pnlStd) * Math.sqrt(n)
      : null;

  const profitFactor =
    grossLosses > 0
      ? grossWins / grossLosses
      : grossWins > 0
      ? Infinity
      : null;

  return {
    dayCount,
    totalGainLoss: r2(totalGainLoss),
    averageDailyGainLoss: r2(avgDailyGainLoss),
    averageDailyVolume: Math.round(avgDailyVolume),
    averagePerShareGainLoss: r2(avgPerShare),
    averageTradeGainLoss: r2(totalGainLoss / n),
    totalNumberOfTrades: n,
    winningTrades: winners.length,
    losingTrades: losers.length,
    scratchTrades: scratches.length,
    averageWinningTrade: avgWin !== null ? r2(avgWin) : null,
    averageLosingTrade: avgLoss !== null ? r2(-avgLoss) : null,
    tradePnlStdDeviation: pnlStd !== null ? r2(pnlStd) : null,
    probabilityOfRandomChance: computeProbabilityOfRandomChance(n, winners.length),
    kRatio: computeKRatio(sorted),
    sqn: sqn !== null ? r2(sqn) : null,
    kellyPercentage: kellyPercentage !== null ? r2(kellyPercentage) : null,
    avgHoldTimeWinningMs: avgMs(winners.map(holdTimeMs)),
    avgHoldTimeLosingMs: avgMs(losers.map(holdTimeMs)),
    avgHoldTimeScratchMs: avgMs(scratches.map(holdTimeMs)),
    profitFactor: profitFactor !== null ? r2(profitFactor) : null,
    largestGain: r2(Math.max(...pnls, 0)),
  };
}

// ── main export ──────────────────────────────────────────────────

export function calculateLongShortStats(trades: TradeForStats[]): {
  long: WinLossDaySideStats;
  short: WinLossDaySideStats;
} {
  const longTrades = trades.filter((t) => t.side === "LONG");
  const shortTrades = trades.filter((t) => t.side === "SHORT");

  // Count unique days each side was traded
  const longDays = new Set(
    longTrades.map((t) => format(t.entryDate, "yyyy-MM-dd"))
  );
  const shortDays = new Set(
    shortTrades.map((t) => format(t.entryDate, "yyyy-MM-dd"))
  );

  return {
    long: computeSideStats(longTrades, longDays.size),
    short: computeSideStats(shortTrades, shortDays.size),
  };
}
