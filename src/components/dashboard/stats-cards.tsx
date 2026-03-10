import { DashboardMetrics } from "@/types";

interface StatsCardsProps {
  metrics: DashboardMetrics;
}

export function StatsCards({ metrics }: StatsCardsProps) {
  const pnlColor = metrics.totalPnl > 0 ? "text-profit" : metrics.totalPnl < 0 ? "text-loss" : "text-flat";
  const wrColor = metrics.winRate >= 50 ? "text-profit" : metrics.winRate > 0 ? "text-loss" : "text-flat";
  const pfColor = metrics.profitFactor >= 1 ? "text-profit" : metrics.profitFactor > 0 ? "text-loss" : "text-flat";

  return (
    <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
      <StatCell label="Trades" value={metrics.totalTrades.toString()} />
      <StatCell label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} colorClass={wrColor} />
      <StatCell label="Net PnL" value={`${metrics.totalPnl >= 0 ? "+" : ""}$${metrics.totalPnl.toFixed(2)}`} colorClass={pnlColor} />
      <StatCell label="Avg Win" value={`+$${metrics.averageWin.toFixed(2)}`} colorClass="text-profit" />
      <StatCell label="Avg Loss" value={`-$${metrics.averageLoss.toFixed(2)}`} colorClass="text-loss" />
      <StatCell label="Profit Factor" value={metrics.profitFactor === Infinity ? "--" : metrics.profitFactor.toFixed(2)} colorClass={pfColor} />
    </div>
  );
}

function StatCell({ label, value, colorClass = "text-foreground" }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-mono text-lg font-semibold tabular-nums ${colorClass}`}>{value}</p>
    </div>
  );
}
