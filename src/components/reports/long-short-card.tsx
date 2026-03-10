"use client";

import { WinLossDaySideStats } from "@/types";

interface LongShortCardProps {
  long: WinLossDaySideStats;
  short: WinLossDaySideStats;
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

function formatDollar(value: number | null): string {
  if (value === null) return "n/a";
  const sign = value > 0 ? "+" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "n/a";
  return `${value.toFixed(2)}%`;
}

function formatCountWithPercent(count: number, total: number): string {
  if (total === 0) return "0";
  const pct = ((count / total) * 100).toFixed(1);
  return `${count} (${pct}%)`;
}

type StatRowDef = {
  label: string;
  longValue: string;
  shortValue: string;
};

function buildRows(
  long: WinLossDaySideStats,
  short: WinLossDaySideStats
): StatRowDef[] {
  return [
    {
      label: "Total Gain / Loss",
      longValue: formatDollar(long.totalGainLoss),
      shortValue: formatDollar(short.totalGainLoss),
    },
    {
      label: "Average Daily Gain / Loss",
      longValue: formatDollar(long.averageDailyGainLoss),
      shortValue: formatDollar(short.averageDailyGainLoss),
    },
    {
      label: "Average Daily Volume",
      longValue: long.averageDailyVolume.toLocaleString(),
      shortValue: short.averageDailyVolume.toLocaleString(),
    },
    {
      label: "Average Per-Share Gain / Loss",
      longValue: formatDollar(long.averagePerShareGainLoss),
      shortValue: formatDollar(short.averagePerShareGainLoss),
    },
    {
      label: "Average Trade Gain / Loss",
      longValue: formatDollar(long.averageTradeGainLoss),
      shortValue: formatDollar(short.averageTradeGainLoss),
    },
    {
      label: "Total Number of Trades",
      longValue: long.totalNumberOfTrades.toString(),
      shortValue: short.totalNumberOfTrades.toString(),
    },
    {
      label: "Winning Trades",
      longValue: long.totalNumberOfTrades > 0
        ? formatCountWithPercent(long.winningTrades, long.totalNumberOfTrades)
        : "0",
      shortValue: short.totalNumberOfTrades > 0
        ? formatCountWithPercent(short.winningTrades, short.totalNumberOfTrades)
        : "0",
    },
    {
      label: "Losing Trades",
      longValue: long.totalNumberOfTrades > 0
        ? formatCountWithPercent(long.losingTrades, long.totalNumberOfTrades)
        : "0",
      shortValue: short.totalNumberOfTrades > 0
        ? formatCountWithPercent(short.losingTrades, short.totalNumberOfTrades)
        : "0",
    },
    {
      label: "Scratch Trades",
      longValue: long.scratchTrades > 0
        ? formatCountWithPercent(long.scratchTrades, long.totalNumberOfTrades)
        : "n/a",
      shortValue: short.scratchTrades > 0
        ? formatCountWithPercent(short.scratchTrades, short.totalNumberOfTrades)
        : "n/a",
    },
    {
      label: "Average Winning Trade",
      longValue: formatDollar(long.averageWinningTrade),
      shortValue: formatDollar(short.averageWinningTrade),
    },
    {
      label: "Average Losing Trade",
      longValue: formatDollar(long.averageLosingTrade),
      shortValue: formatDollar(short.averageLosingTrade),
    },
    {
      label: "Trade P&L Standard Deviation",
      longValue: long.tradePnlStdDeviation !== null
        ? `$${long.tradePnlStdDeviation.toFixed(2)}`
        : "n/a",
      shortValue: short.tradePnlStdDeviation !== null
        ? `$${short.tradePnlStdDeviation.toFixed(2)}`
        : "n/a",
    },
    {
      label: "Probability of Random Chance",
      longValue: formatPercent(long.probabilityOfRandomChance),
      shortValue: formatPercent(short.probabilityOfRandomChance),
    },
    {
      label: "K-Ratio",
      longValue: long.kRatio !== null ? long.kRatio.toFixed(2) : "n/a",
      shortValue: short.kRatio !== null ? short.kRatio.toFixed(2) : "n/a",
    },
    {
      label: "System Quality Number (SQN)",
      longValue: long.sqn !== null ? long.sqn.toFixed(2) : "n/a",
      shortValue: short.sqn !== null ? short.sqn.toFixed(2) : "n/a",
    },
    {
      label: "Kelly Percentage",
      longValue: formatPercent(long.kellyPercentage),
      shortValue: formatPercent(short.kellyPercentage),
    },
    {
      label: "Average Hold Time (Winning Trades)",
      longValue: formatDuration(long.avgHoldTimeWinningMs),
      shortValue: formatDuration(short.avgHoldTimeWinningMs),
    },
    {
      label: "Average Hold Time (Losing Trades)",
      longValue: formatDuration(long.avgHoldTimeLosingMs),
      shortValue: formatDuration(short.avgHoldTimeLosingMs),
    },
    {
      label: "Average Hold Time (Scratch Trades)",
      longValue: formatDuration(long.avgHoldTimeScratchMs),
      shortValue: formatDuration(short.avgHoldTimeScratchMs),
    },
    {
      label: "Profit Factor",
      longValue: long.profitFactor !== null
        ? long.profitFactor === Infinity
          ? "\u221E"
          : long.profitFactor.toFixed(2)
        : "n/a",
      shortValue: short.profitFactor !== null
        ? short.profitFactor === Infinity
          ? "\u221E"
          : short.profitFactor.toFixed(2)
        : "n/a",
    },
    {
      label: "Largest Gain",
      longValue: formatDollar(long.largestGain),
      shortValue: formatDollar(short.largestGain),
    },
  ];
}

export function LongShortCard({ long, short }: LongShortCardProps) {
  const rows = buildRows(long, short);

  const hasTrades = long.totalNumberOfTrades > 0 || short.totalNumberOfTrades > 0;

  if (!hasTrades) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No trade data yet. Import trades to see long vs short stats.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Card header */}
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-[15px] font-semibold text-foreground">Statistics</h2>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
        <div className="flex items-center gap-2 px-6 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-2" />
          <span className="text-[14px] font-semibold text-foreground">
            Long ({long.totalNumberOfTrades} trade{long.totalNumberOfTrades !== 1 ? "s" : ""})
          </span>
        </div>
        <div className="flex items-center gap-2 px-6 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-chart-4" />
          <span className="text-[14px] font-semibold text-foreground">
            Short ({short.totalNumberOfTrades} trade{short.totalNumberOfTrades !== 1 ? "s" : ""})
          </span>
        </div>
      </div>

      {/* Stat rows */}
      <div className="divide-y divide-border">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 divide-x divide-border">
            {/* Long side */}
            <div className="px-6 py-3.5">
              <p className="text-[12px] text-muted-foreground">{row.label}</p>
              <p className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-foreground">
                {row.longValue}
              </p>
            </div>
            {/* Short side */}
            <div className="px-6 py-3.5">
              <p className="text-[12px] text-muted-foreground">{row.label}</p>
              <p className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-foreground">
                {row.shortValue}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
