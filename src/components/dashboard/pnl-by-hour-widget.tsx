import { HourRangePnl } from "@/types";

interface PnlByHourWidgetProps {
  hours: HourRangePnl[];
}

export function PnlByHourWidget({ hours }: PnlByHourWidgetProps) {
  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        Performance By Time Of Day
      </p>

      <div className="mt-3 flex flex-1 flex-col justify-between overflow-y-auto">
        {hours.map((h) => {
          const isPositive = h.pnl > 0;
          const isNegative = h.pnl < 0;
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
          const absVal = Math.abs(h.pnl).toFixed(2);

          return (
            <div key={h.hour}>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-foreground">
                  {h.label}
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
                    {h.percent.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "#464F5B" }}
              >
                <div
                  className={"h-full rounded-full transition-all " + barColorClass}
                  style={{ width: h.percent + "%" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
