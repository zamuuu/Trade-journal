import { format, parseISO } from "date-fns";
import { DailyPnl } from "@/types";

interface Last7DaysWidgetProps {
  days: DailyPnl[];
}

export function Last7DaysWidget({ days }: Last7DaysWidgetProps) {
  // Use the first day's date to derive the month header
  const firstDate = days.length > 0 ? parseISO(days[0].date) : new Date();
  const monthLabel = format(firstDate, "MMM yyyy");

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card p-4">
      <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
        {monthLabel}
      </p>
      <div className="grid flex-1 grid-cols-7 gap-2">
        {days.map((day) => {
          const date = parseISO(day.date);
          const dayNum = format(date, "d");
          const dayName = format(date, "EEE");
          const hasTrades = day.tradeCount > 0;
          const pnlColor =
            day.pnl > 0
              ? "text-profit"
              : day.pnl < 0
                ? "text-loss"
                : "text-flat";

          return (
            <div
              key={day.date}
              className="flex flex-col justify-between rounded-md border border-border bg-background/50 p-3"
            >
              {/* Top row: day number + day name */}
              <div className="flex items-baseline gap-1">
                <span className="font-mono text-lg font-semibold tabular-nums">
                  {dayNum}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {dayName}
                </span>
              </div>

              {/* Bottom: PnL + trade count */}
              <div>
                <p
                  className={`font-mono text-[14px] font-semibold tabular-nums ${pnlColor}`}
                >
                  {hasTrades
                    ? `${day.pnl >= 0 ? "" : "-"}$${Math.abs(day.pnl).toFixed(2)}`
                    : "$0"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {day.tradeCount} trade{day.tradeCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
