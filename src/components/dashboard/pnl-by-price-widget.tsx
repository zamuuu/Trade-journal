import { PriceRangePnl } from "@/types";

interface PnlByPriceWidgetProps {
  ranges: PriceRangePnl[];
}

export function PnlByPriceWidget({ ranges }: PnlByPriceWidgetProps) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        Performance By Price
      </p>

      <div className="mt-3 space-y-2.5">
        {ranges.map((r) => {
          const isPositive = r.pnl > 0;
          const isNegative = r.pnl < 0;
          const colorClass = isPositive
            ? "text-profit"
            : isNegative
              ? "text-loss"
              : "text-flat";
          const barColorClass = isPositive
            ? "bg-profit"
            : isNegative
              ? "bg-loss"
              : "bg-muted-foreground/20";
          const sign = isPositive ? "+" : isNegative ? "-" : "";
          const absVal = Math.abs(r.pnl).toFixed(2);

          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-foreground">
                  {r.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={
                      "font-mono text-[13px] font-semibold tabular-nums " +
                      colorClass
                    }
                  >
                    {sign}{"$"}{absVal}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {r.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#464F5B" }}>
                <div
                  className={"h-full rounded-full transition-all " + barColorClass}
                  style={{ width: r.percent + "%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
