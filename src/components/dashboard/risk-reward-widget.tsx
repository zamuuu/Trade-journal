interface RiskRewardWidgetProps {
  avgWin: number;
  avgLoss: number;
}

export function RiskRewardWidget({ avgWin, avgLoss }: RiskRewardWidgetProps) {
  const ratio = avgLoss > 0 ? avgWin / avgLoss : 0;
  const total = avgWin + avgLoss;
  const rewardPct = total > 0 ? (avgWin / total) * 100 : 50;
  const riskPct = total > 0 ? (avgLoss / total) * 100 : 50;

  // Color the ratio based on whether reward outweighs risk
  const ratioColor =
    ratio >= 1.5
      ? "text-profit"
      : ratio >= 1
        ? "text-foreground"
        : ratio > 0
          ? "text-loss"
          : "text-flat";

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card px-4 py-3">
      {/* Label */}
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        Risk : Reward Ratio
      </p>

      {/* Ratio value */}
      <p className={`mt-1 font-mono text-xl font-semibold tabular-nums ${ratioColor}`}>
        {ratio > 0 ? `1 : ${ratio.toFixed(2)}` : "--"}
      </p>

      {/* Visual proportion bar */}
      <div className="mt-auto flex flex-col gap-1.5">
        <div className="flex h-2 w-full overflow-hidden rounded-sm">
          <div
            className="h-full bg-loss/70 transition-all duration-300"
            style={{ width: `${riskPct}%` }}
          />
          <div
            className="h-full bg-profit/70 transition-all duration-300"
            style={{ width: `${rewardPct}%` }}
          />
        </div>

        {/* Labels below the bar */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] tabular-nums text-loss">
            -${avgLoss.toFixed(2)}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-profit">
            +${avgWin.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
