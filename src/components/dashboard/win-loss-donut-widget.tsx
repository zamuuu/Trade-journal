interface WinLossDonutWidgetProps {
  wins: number;
  losses: number;
}

export function WinLossDonutWidget({ wins, losses }: WinLossDonutWidgetProps) {
  const total = wins + losses;

  // SVG donut parameters
  const size = 140;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate arcs — win portion starts at top (12 o'clock)
  const winRatio = total > 0 ? wins / total : 0;
  const winLength = circumference * winRatio;
  const lossLength = circumference - winLength;

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        Winning vs Losing Trades
      </p>

      <div className="flex flex-1 items-center justify-center">
        {total === 0 ? (
          /* Empty state */
          <div className="flex h-[140px] w-[140px] items-center justify-center">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-muted/30"
              />
            </svg>
          </div>
        ) : (
          <div className="relative">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="rotate-[-90deg]"
            >
              {/* Loss arc (red) — full circle background */}
              {losses > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  className="stroke-loss"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${lossLength} ${circumference - lossLength}`}
                  strokeDashoffset={-winLength}
                />
              )}

              {/* Win arc (green) — starts at top, drawn on top */}
              {wins > 0 && (
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  className="stroke-profit"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${winLength} ${circumference - winLength}`}
                />
              )}
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-lg font-semibold tabular-nums">
                {total}
              </span>
              <span className="text-[10px] text-muted-foreground">trades</span>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {total > 0 && (
        <div className="mt-auto flex items-center justify-center gap-4 pt-2 text-[12px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-profit" />
            <span className="tabular-nums text-muted-foreground">
              {wins} <span className="text-profit">W</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-loss" />
            <span className="tabular-nums text-muted-foreground">
              {losses} <span className="text-loss">L</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
