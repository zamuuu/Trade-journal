interface AvgWinLossWidgetProps {
  avgWin: number;
  avgLoss: number;
}

export function AvgWinLossWidget({ avgWin, avgLoss }: AvgWinLossWidgetProps) {
  const max = Math.max(avgWin, avgLoss, 1);
  const winPct = (avgWin / max) * 100;
  const lossPct = (avgLoss / max) * 100;

  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        Avg Winning Trade vs Losing Trade
      </p>
      <div className="mt-3 space-y-3">
        {/* Win bar */}
        <div>
          <span className="font-mono text-[15px] font-semibold tabular-nums text-profit">
            +${avgWin.toFixed(2)}
          </span>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-sm bg-muted/30">
            <div
              className="h-full rounded-sm bg-profit transition-all duration-300"
              style={{ width: `${winPct}%` }}
            />
          </div>
        </div>
        {/* Loss bar */}
        <div>
          <span className="font-mono text-[15px] font-semibold tabular-nums text-loss">
            -${avgLoss.toFixed(2)}
          </span>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-sm bg-muted/30">
            <div
              className="h-full rounded-sm bg-loss transition-all duration-300"
              style={{ width: `${lossPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
