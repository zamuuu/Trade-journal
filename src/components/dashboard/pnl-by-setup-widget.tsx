import { SetupStats } from "@/types";

interface PnlBySetupWidgetProps {
  stats: SetupStats[];
}

export function PnlBySetupWidget({ stats }: PnlBySetupWidgetProps) {
  if (stats.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-3">
        <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          P&L by Setup
        </p>
        <p className="mt-3 text-[13px] text-muted-foreground">
          No setups assigned yet. Add a setup to your trades to see performance
          breakdown.
        </p>
      </div>
    );
  }

  // Find the max absolute PnL for bar scaling
  const maxAbsPnl = Math.max(...stats.map((s) => Math.abs(s.netPnl)), 1);

  // Calculate total PnL for percentage
  const totalAbsPnl = stats.reduce((sum, s) => sum + Math.abs(s.netPnl), 0);

  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        P&L by Setup
      </p>
      <div className="mt-3 space-y-0">
        {stats.map((s, i) => {
          const isProfit = s.netPnl >= 0;
          const barPct = (Math.abs(s.netPnl) / maxAbsPnl) * 100;
          const pnlPct =
            totalAbsPnl > 0
              ? ((Math.abs(s.netPnl) / totalAbsPnl) * 100).toFixed(1)
              : "0.0";

          return (
            <div
              key={s.setup}
              className={`py-2.5 ${
                i < stats.length - 1 ? "border-b border-border/50" : ""
              }`}
            >
              {/* Setup name + PnL value row */}
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-foreground">
                  {s.setup}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`font-mono text-[14px] font-semibold tabular-nums ${
                      isProfit ? "text-profit" : "text-loss"
                    }`}
                  >
                    {isProfit ? "+" : ""}${s.netPnl.toFixed(2)}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {pnlPct}%
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-sm bg-muted/20">
                <div
                  className={`h-full rounded-sm transition-all duration-300 ${
                    isProfit ? "bg-profit" : "bg-loss"
                  }`}
                  style={{ width: `${Math.max(barPct, 2)}%` }}
                />
              </div>

              {/* Trade count + win rate */}
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span>
                  {s.tradeCount} trade{s.tradeCount !== 1 ? "s" : ""}
                </span>
                <span>-</span>
                <span>WR {s.winRate}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
