import { DetailedStats } from "@/types";
import { format } from "date-fns";

interface TradeForDetailedStats {
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
  return Math.sqrt(sumSq / (values.length - 1)); // sample std dev
}

/** Hold time in milliseconds, null when exitDate is missing */
function holdTimeMs(t: TradeForDetailedStats): number | null {
  if (!t.exitDate) return null;
  return t.exitDate.getTime() - t.entryDate.getTime();
}

/** Average of an array of ms durations, null if empty */
function avgMs(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

/**
 * Max consecutive streak where predicate is true.
 * Trades must be pre-sorted by entryDate ascending.
 */
function maxConsecutive(
  trades: TradeForDetailedStats[],
  predicate: (t: TradeForDetailedStats) => boolean
): number {
  let max = 0;
  let current = 0;
  for (const t of trades) {
    if (predicate(t)) {
      current++;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }
  return max;
}

/**
 * K-Ratio (Kestner 2003 revision):
 * Linear regression of cumulative PnL curve, then:
 *   K = (slope / SE_slope) / sqrt(n - 2)
 * This normalizes the t-statistic by the degrees of freedom
 * so the metric is comparable across different sample sizes.
 */
function computeKRatio(trades: TradeForDetailedStats[]): number | null {
  const n = trades.length;
  if (n < 3) return null;

  // Build cumulative equity curve
  const y: number[] = [];
  let cumulative = 0;
  for (const t of trades) {
    cumulative += t.pnl;
    y.push(cumulative);
  }

  // Simple linear regression: y = a + b*x, x = 0..n-1
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

  // Standard error of slope
  let ssResidual = 0;
  for (let i = 0; i < n; i++) {
    const predicted = yMean + slope * (i - xMean);
    ssResidual += (y[i] - predicted) ** 2;
  }
  const df = n - 2;
  const mse = ssResidual / df;
  const seBeta = Math.sqrt(mse / ssXX);

  if (seBeta === 0) return null;

  // Kestner 2003: normalize t-statistic by sqrt(degrees of freedom)
  return (slope / seBeta) / Math.sqrt(df);
}

/**
 * Probability of Random Chance using a one-tailed z-test approximation.
 * H0: true win rate = 50% (random). We test if observed win rate is
 * significantly different from 50%.
 * Returns the p-value as a percentage, or null if insufficient data.
 */
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

  // Approximate CDF of standard normal using error function approximation
  const absZ = Math.abs(z);
  // Abramowitz and Stegun approximation 7.1.26
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absZ / Math.SQRT2);
  const erf =
    1 - (a1 * t + a2 * t ** 2 + a3 * t ** 3 + a4 * t ** 4 + a5 * t ** 5) *
    Math.exp(-1 * (absZ / Math.SQRT2) ** 2);

  // Two-tailed p-value
  const pValue = 1 - erf;
  return pValue * 100; // as percentage
}

// ── main ─────────────────────────────────────────────────────────

export function calculateDetailedStats(
  trades: TradeForDetailedStats[]
): DetailedStats {
  // Sort by entry date ascending (for streak + K-Ratio calculations)
  const sorted = [...trades].sort(
    (a, b) => a.entryDate.getTime() - b.entryDate.getTime()
  );

  const n = sorted.length;

  // Empty state
  if (n === 0) {
    return {
      totalGainLoss: 0,
      largestGain: 0,
      largestLoss: 0,
      averageDailyGainLoss: 0,
      averageDailyVolume: 0,
      averagePerShareGainLoss: 0,
      averageTradeGainLoss: 0,
      averageWinningTrade: 0,
      averageLosingTrade: 0,
      totalNumberOfTrades: 0,
      numberOfWinningTrades: 0,
      numberOfLosingTrades: 0,
      winRate: 0,
      lossRate: 0,
      avgHoldTimeScratchMs: null,
      avgHoldTimeWinningMs: null,
      avgHoldTimeLosingMs: null,
      numberOfScratchTrades: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      tradePnlStdDeviation: 0,
      sqn: null,
      probabilityOfRandomChance: null,
      kellyPercentage: null,
      kRatio: null,
      profitFactor: 0,
    };
  }

  // ── basic partitions ───────────────────────────────────────────

  const winners = sorted.filter((t) => t.pnl > 0);
  const losers = sorted.filter((t) => t.pnl < 0);
  const scratches = sorted.filter((t) => t.pnl === 0);

  const pnls = sorted.map((t) => t.pnl);
  const totalGainLoss = pnls.reduce((s, v) => s + v, 0);
  const totalShares = sorted.reduce((s, t) => s + t.totalQuantity, 0);

  // ── daily aggregations ─────────────────────────────────────────

  const dailyMap: Record<string, { pnl: number; volume: number }> = {};
  for (const t of sorted) {
    const day = format(t.entryDate, "yyyy-MM-dd");
    if (!dailyMap[day]) dailyMap[day] = { pnl: 0, volume: 0 };
    dailyMap[day].pnl += t.pnl;
    dailyMap[day].volume += t.totalQuantity;
  }
  const dailyValues = Object.values(dailyMap);
  const numDays = dailyValues.length;

  const averageDailyGainLoss =
    numDays > 0
      ? dailyValues.reduce((s, d) => s + d.pnl, 0) / numDays
      : 0;
  const averageDailyVolume =
    numDays > 0
      ? dailyValues.reduce((s, d) => s + d.volume, 0) / numDays
      : 0;

  // ── per-share ──────────────────────────────────────────────────

  const averagePerShareGainLoss = totalShares > 0 ? totalGainLoss / totalShares : 0;

  // ── averages ───────────────────────────────────────────────────

  const grossWins = winners.reduce((s, t) => s + t.pnl, 0);
  const grossLosses = Math.abs(losers.reduce((s, t) => s + t.pnl, 0));
  const avgWin = winners.length > 0 ? grossWins / winners.length : 0;
  const avgLoss = losers.length > 0 ? grossLosses / losers.length : 0;

  // ── hold times ─────────────────────────────────────────────────

  const avgHoldTimeScratchMs = avgMs(scratches.map(holdTimeMs));
  const avgHoldTimeWinningMs = avgMs(winners.map(holdTimeMs));
  const avgHoldTimeLosingMs = avgMs(losers.map(holdTimeMs));

  // ── streaks ────────────────────────────────────────────────────

  const maxConsecWins = maxConsecutive(sorted, (t) => t.pnl > 0);
  const maxConsecLosses = maxConsecutive(sorted, (t) => t.pnl < 0);

  // ── statistical measures ───────────────────────────────────────

  const pnlStdDev = stdDev(pnls);

  // SQN — System Quality Number (need >= 30 trades for meaningful value)
  const sqn =
    n >= 30 && pnlStdDev > 0
      ? (mean(pnls) / pnlStdDev) * Math.sqrt(n)
      : null;

  // Kelly Percentage: W - ((1 - W) / R)
  // W = win rate as decimal, R = avg win / avg loss ratio
  const winRateDecimal = n > 0 ? winners.length / n : 0;
  let kellyPercentage: number | null = null;
  if (winners.length > 0 && losers.length > 0 && avgLoss > 0) {
    const R = avgWin / avgLoss;
    kellyPercentage = (winRateDecimal - (1 - winRateDecimal) / R) * 100;
  }

  // K-Ratio
  const kRatio = computeKRatio(sorted);

  // Profit factor
  const profitFactor =
    grossLosses > 0
      ? grossWins / grossLosses
      : grossWins > 0
      ? Infinity
      : 0;

  // Probability of Random Chance
  const probabilityOfRandomChance = computeProbabilityOfRandomChance(
    n,
    winners.length
  );

  // ── round helper ───────────────────────────────────────────────

  const r2 = (v: number) => Math.round(v * 100) / 100;

  return {
    totalGainLoss: r2(totalGainLoss),
    largestGain: r2(Math.max(...pnls, 0)),
    largestLoss: r2(Math.min(...pnls, 0)),
    averageDailyGainLoss: r2(averageDailyGainLoss),
    averageDailyVolume: Math.round(averageDailyVolume),
    averagePerShareGainLoss: r2(averagePerShareGainLoss),
    averageTradeGainLoss: r2(totalGainLoss / n),
    averageWinningTrade: r2(avgWin),
    averageLosingTrade: r2(-avgLoss), // store as negative
    totalNumberOfTrades: n,
    numberOfWinningTrades: winners.length,
    numberOfLosingTrades: losers.length,
    winRate: r2(winRateDecimal * 100),
    lossRate: r2(losers.length > 0 ? (losers.length / n) * 100 : 0),
    avgHoldTimeScratchMs,
    avgHoldTimeWinningMs,
    avgHoldTimeLosingMs,
    numberOfScratchTrades: scratches.length,
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses,
    tradePnlStdDeviation: r2(pnlStdDev),
    sqn: sqn !== null ? r2(sqn) : null,
    probabilityOfRandomChance:
      probabilityOfRandomChance !== null ? r2(probabilityOfRandomChance) : null,
    kellyPercentage: kellyPercentage !== null ? r2(kellyPercentage) : null,
    kRatio: kRatio !== null ? r2(kRatio) : null,
    profitFactor: r2(profitFactor),
  };
}
