"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

const RED = "oklch(0.65 0.19 25)";
const RED_FILL = "oklch(0.637 0.175 25 / 0.15)";
const MUTED = "oklch(0.63 0.015 268)";

const tooltipStyle = {
  backgroundColor: "oklch(0.30 0.030 268)",
  border: "1px solid oklch(0.32 0.025 268)",
  borderRadius: "6px",
  fontSize: "13px",
};

interface DrawdownWidgetProps {
  data: { date: string; drawdown: number }[];
}

export function DrawdownWidget({ data }: DrawdownWidgetProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Drawdown %
        </p>
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No trade data yet.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card p-4">
      <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
        Drawdown %
      </p>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <XAxis
              dataKey="date"
              tickFormatter={(val) => format(new Date(val), "MM/dd")}
              stroke={MUTED}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={MUTED}
              fontSize={12}
              tickFormatter={(val) => `${val}%`}
              reversed
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(val) =>
                format(new Date(val), "MMM dd, yyyy")
              }
              formatter={(value: any) => [
                `${Number(value).toFixed(2)}%`,
                "Drawdown",
              ]}
            />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke={RED}
              fill={RED_FILL}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
