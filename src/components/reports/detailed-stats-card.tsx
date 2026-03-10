"use client";

import { DetailedStats } from "@/types";

interface DetailedStatsCardProps {
  stats: DetailedStats;
  totalTrades: number;
}

/** Format milliseconds into a human-readable duration */
function formatDuration(ms: number | null): string {
  if (ms === null) return "n/a";
  if (ms < 60_000) return "less than a minute";

  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }
  return `${hours}h ${minutes}m`;
}

/** Format a dollar value with sign and color class */
function formatDollar(value: number): { text: string; colorClass: string } {
  const sign = value > 0 ? "+" : "";
  const text = `${sign}$${Math.abs(value).toFixed(2)}`;
  const colorClass =
    value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-foreground";
  return { text, colorClass };
}

/** Format a percentage with the % sign */
function formatPercent(value: number | null): string {
  if (value === null) return "n/a";
  return `${value.toFixed(2)}%`;
}

/** Format a number with optional parenthetical percentage */
function formatCountWithPercent(count: number, total: number): string {
  if (total === 0) return "0";
  const pct = ((count / total) * 100).toFixed(1);
  return `${count} (${pct}%)`;
}

type StatRow = {
  col1: { label: string; value: string; colorClass?: string };
  col2: { label: string; value: string; colorClass?: string };
  col3?: { label: string; value: string; colorClass?: string };
};

export function DetailedStatsCard({ stats, totalTrades }: DetailedStatsCardProps) {
  const totalGL = formatDollar(stats.totalGainLoss);
  const largestGain = formatDollar(stats.largestGain);
  const largestLoss = formatDollar(stats.largestLoss);
  const avgDaily = formatDollar(stats.averageDailyGainLoss);
  const avgPerShare = formatDollar(stats.averagePerShareGainLoss);
  const avgTrade = formatDollar(stats.averageTradeGainLoss);
  const avgWin = formatDollar(stats.averageWinningTrade);
  const avgLose = formatDollar(stats.averageLosingTrade);

  const rows: StatRow[] = [
    {
      col1: { label: "Total Gain/Loss", value: totalGL.text, colorClass: totalGL.colorClass },
      col2: { label: "Largest Gain", value: largestGain.text, colorClass: largestGain.colorClass },
      col3: { label: "Largest Loss", value: largestLoss.text, colorClass: largestLoss.colorClass },
    },
    {
      col1: { label: "Average Daily Gain/Loss", value: avgDaily.text, colorClass: avgDaily.colorClass },
      col2: { label: "Average Daily Volume", value: stats.averageDailyVolume.toLocaleString() },
      col3: { label: "Average Per-share Gain/Loss", value: avgPerShare.text, colorClass: avgPerShare.colorClass },
    },
    {
      col1: { label: "Average Trade Gain/Loss", value: avgTrade.text, colorClass: avgTrade.colorClass },
      col2: { label: "Average Winning Trade", value: avgWin.text, colorClass: avgWin.colorClass },
      col3: { label: "Average Losing Trade", value: avgLose.text, colorClass: avgLose.colorClass },
    },
    {
      col1: { label: "Total Number of Trades", value: stats.totalNumberOfTrades.toString() },
      col2: { label: "Number of Winning Trades", value: formatCountWithPercent(stats.numberOfWinningTrades, totalTrades) },
      col3: { label: "Number of Losing Trades", value: formatCountWithPercent(stats.numberOfLosingTrades, totalTrades) },
    },
    {
      col1: { label: "Avg Hold Time (scratch trades)", value: formatDuration(stats.avgHoldTimeScratchMs) },
      col2: { label: "Avg Hold Time (winning trades)", value: formatDuration(stats.avgHoldTimeWinningMs) },
      col3: { label: "Avg Hold Time (losing trades)", value: formatDuration(stats.avgHoldTimeLosingMs) },
    },
    {
      col1: { label: "Number of Scratch Trades", value: formatCountWithPercent(stats.numberOfScratchTrades, totalTrades) },
      col2: { label: "Max Consecutive Wins", value: stats.maxConsecutiveWins.toString() },
      col3: { label: "Max Consecutive Losses", value: stats.maxConsecutiveLosses.toString() },
    },
    {
      col1: { label: "Trade P&L Standard Deviation", value: `$${stats.tradePnlStdDeviation.toFixed(2)}` },
      col2: { label: "System Quality Number (SQN)", value: stats.sqn !== null ? stats.sqn.toFixed(2) : "n/a" },
      col3: { label: "Probability of Random Chance", value: formatPercent(stats.probabilityOfRandomChance) },
    },
    {
      col1: { label: "Kelly Percentage", value: formatPercent(stats.kellyPercentage) },
      col2: { label: "K-Ratio", value: stats.kRatio !== null ? stats.kRatio.toFixed(2) : "n/a" },
      col3: { label: "Profit Factor", value: stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2) },
    },
  ];

  if (totalTrades === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No trade data yet. Import trades to see detailed stats.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Card header */}
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-[15px] font-semibold text-foreground">Stats</h2>
      </div>

      {/* Stat rows */}
      <div className="divide-y divide-border">
        {rows.map((row, ri) => (
          <div
            key={ri}
            className="grid grid-cols-3 divide-x divide-border"
          >
            {/* Column 1 */}
            <StatCell label={row.col1.label} value={row.col1.value} colorClass={row.col1.colorClass} />
            {/* Column 2 */}
            <StatCell label={row.col2.label} value={row.col2.value} colorClass={row.col2.colorClass} />
            {/* Column 3 */}
            {row.col3 ? (
              <StatCell label={row.col3.label} value={row.col3.value} colorClass={row.col3.colorClass} />
            ) : (
              <div className="px-5 py-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={`font-mono text-[13px] font-semibold tabular-nums ${
          colorClass ?? "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
