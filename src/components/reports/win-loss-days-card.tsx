"use client";

import { WinLossDaySideStats } from "@/types";

interface WinLossDaysCardProps {
  winning: WinLossDaySideStats;
  losing: WinLossDaySideStats;
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
  winValue: string;
  loseValue: string;
};

function buildRows(
  winning: WinLossDaySideStats,
  losing: WinLossDaySideStats
): StatRowDef[] {
  return [
    {
      label: "Total Gain / Loss",
      winValue: formatDollar(winning.totalGainLoss),
      loseValue: formatDollar(losing.totalGainLoss),
    },
    {
      label: "Average Daily Gain / Loss",
      winValue: formatDollar(winning.averageDailyGainLoss),
      loseValue: formatDollar(losing.averageDailyGainLoss),
    },
    {
      label: "Average Daily Volume",
      winValue: winning.averageDailyVolume.toLocaleString(),
      loseValue: losing.averageDailyVolume.toLocaleString(),
    },
    {
      label: "Average Per-Share Gain / Loss",
      winValue: formatDollar(winning.averagePerShareGainLoss),
      loseValue: formatDollar(losing.averagePerShareGainLoss),
    },
    {
      label: "Average Trade Gain / Loss",
      winValue: formatDollar(winning.averageTradeGainLoss),
      loseValue: formatDollar(losing.averageTradeGainLoss),
    },
    {
      label: "Total Number of Trades",
      winValue: winning.totalNumberOfTrades.toString(),
      loseValue: losing.totalNumberOfTrades.toString(),
    },
    {
      label: "Winning Trades",
      winValue: winning.totalNumberOfTrades > 0
        ? formatCountWithPercent(winning.winningTrades, winning.totalNumberOfTrades)
        : "0",
      loseValue: losing.totalNumberOfTrades > 0
        ? formatCountWithPercent(losing.winningTrades, losing.totalNumberOfTrades)
        : "0",
    },
    {
      label: "Losing Trades",
      winValue: winning.totalNumberOfTrades > 0
        ? formatCountWithPercent(winning.losingTrades, winning.totalNumberOfTrades)
        : "0",
      loseValue: losing.totalNumberOfTrades > 0
        ? formatCountWithPercent(losing.losingTrades, losing.totalNumberOfTrades)
        : "0",
    },
    {
      label: "Scratch Trades",
      winValue: winning.scratchTrades > 0
        ? formatCountWithPercent(winning.scratchTrades, winning.totalNumberOfTrades)
        : "n/a",
      loseValue: losing.scratchTrades > 0
        ? formatCountWithPercent(losing.scratchTrades, losing.totalNumberOfTrades)
        : "n/a",
    },
    {
      label: "Average Winning Trade",
      winValue: formatDollar(winning.averageWinningTrade),
      loseValue: formatDollar(losing.averageWinningTrade),
    },
    {
      label: "Average Losing Trade",
      winValue: formatDollar(winning.averageLosingTrade),
      loseValue: formatDollar(losing.averageLosingTrade),
    },
    {
      label: "Trade P&L Standard Deviation",
      winValue: winning.tradePnlStdDeviation !== null
        ? `$${winning.tradePnlStdDeviation.toFixed(2)}`
        : "n/a",
      loseValue: losing.tradePnlStdDeviation !== null
        ? `$${losing.tradePnlStdDeviation.toFixed(2)}`
        : "n/a",
    },
    {
      label: "Probability of Random Chance",
      winValue: formatPercent(winning.probabilityOfRandomChance),
      loseValue: formatPercent(losing.probabilityOfRandomChance),
    },
    {
      label: "K-Ratio",
      winValue: winning.kRatio !== null ? winning.kRatio.toFixed(2) : "n/a",
      loseValue: losing.kRatio !== null ? losing.kRatio.toFixed(2) : "n/a",
    },
    {
      label: "System Quality Number (SQN)",
      winValue: winning.sqn !== null ? winning.sqn.toFixed(2) : "n/a",
      loseValue: losing.sqn !== null ? losing.sqn.toFixed(2) : "n/a",
    },
    {
      label: "Kelly Percentage",
      winValue: formatPercent(winning.kellyPercentage),
      loseValue: formatPercent(losing.kellyPercentage),
    },
    {
      label: "Average Hold Time (Winning Trades)",
      winValue: formatDuration(winning.avgHoldTimeWinningMs),
      loseValue: formatDuration(losing.avgHoldTimeWinningMs),
    },
    {
      label: "Average Hold Time (Losing Trades)",
      winValue: formatDuration(winning.avgHoldTimeLosingMs),
      loseValue: formatDuration(losing.avgHoldTimeLosingMs),
    },
    {
      label: "Average Hold Time (Scratch Trades)",
      winValue: formatDuration(winning.avgHoldTimeScratchMs),
      loseValue: formatDuration(losing.avgHoldTimeScratchMs),
    },
    {
      label: "Profit Factor",
      winValue: winning.profitFactor !== null
        ? winning.profitFactor === Infinity
          ? "\u221E"
          : winning.profitFactor.toFixed(2)
        : "n/a",
      loseValue: losing.profitFactor !== null
        ? losing.profitFactor === Infinity
          ? "\u221E"
          : losing.profitFactor.toFixed(2)
        : "n/a",
    },
    {
      label: "Largest Gain",
      winValue: formatDollar(winning.largestGain),
      loseValue: formatDollar(losing.largestGain),
    },
  ];
}

export function WinLossDaysCard({ winning, losing }: WinLossDaysCardProps) {
  const rows = buildRows(winning, losing);

  const hasTrades = winning.totalNumberOfTrades > 0 || losing.totalNumberOfTrades > 0;

  if (!hasTrades) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
          No trade data yet. Import trades to see win vs loss day stats.
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
          <span className="h-2.5 w-2.5 rounded-full bg-profit" />
          <span className="text-[14px] font-semibold text-foreground">
            {winning.dayCount} Winning Day{winning.dayCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 px-6 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-loss" />
          <span className="text-[14px] font-semibold text-foreground">
            {losing.dayCount} Losing Day{losing.dayCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Stat rows */}
      <div className="divide-y divide-border">
        {rows.map((row, ri) => (
          <div key={ri} className="grid grid-cols-2 divide-x divide-border">
            {/* Winning side */}
            <div className="px-6 py-3.5">
              <p className="text-[12px] text-muted-foreground">{row.label}</p>
              <p className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-foreground">
                {row.winValue}
              </p>
            </div>
            {/* Losing side */}
            <div className="px-6 py-3.5">
              <p className="text-[12px] text-muted-foreground">{row.label}</p>
              <p className="mt-1 font-mono text-[14px] font-semibold tabular-nums text-foreground">
                {row.loseValue}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
