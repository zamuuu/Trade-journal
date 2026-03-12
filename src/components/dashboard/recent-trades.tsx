import Link from "next/link";
import { format } from "date-fns";

interface Trade {
  id: string;
  symbol: string;
  side: string;
  entryDate: Date;
  pnl: number;
  totalQuantity: number;
}

interface RecentTradesProps {
  trades: Trade[];
}

export function RecentTrades({ trades }: RecentTradesProps) {
  if (trades.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Recent Trades</p>
        <p className="text-sm text-muted-foreground">No trades yet.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card p-4">
      <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Recent Trades</p>
      <div className="flex-1 space-y-0 overflow-y-auto">
        {trades.map((trade, i) => (
          <Link
            key={trade.id}
            href={`/trades/${trade.id}`}
            className={`flex items-center justify-between py-2 transition-colors hover:bg-accent/50 ${
              i < trades.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className={`w-3 text-[12px] font-semibold ${trade.side === "LONG" ? "text-profit" : "text-loss"}`}>
                {trade.side === "LONG" ? "L" : "S"}
              </span>
              <span className="text-[14px] font-medium">{trade.symbol}</span>
              <span className="text-[12px] text-muted-foreground">
                {format(new Date(trade.entryDate), "MM/dd")}
              </span>
            </div>
            <span
              className={`font-mono text-[14px] font-medium tabular-nums ${
                trade.pnl > 0 ? "text-profit" : trade.pnl < 0 ? "text-loss" : "text-flat"
              }`}
            >
              {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
