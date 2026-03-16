"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { format } from "date-fns";

const GREEN = "oklch(0.65 0.16 155)";
const RED = "oklch(0.65 0.19 25)";
const MUTED = "oklch(0.63 0.015 268)";
const BORDER = "oklch(0.32 0.025 268)";

const tooltipStyle = {
  backgroundColor: "oklch(0.30 0.030 268)",
  border: "1px solid oklch(0.32 0.025 268)",
  borderRadius: "6px",
  fontSize: "13px",
};

interface DailyPnlChartWidgetProps {
  data: { date: string; pnl: number }[];
}

export function DailyPnlChartWidget({ data }: DailyPnlChartWidgetProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full flex-col rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Daily PnL
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
        Daily PnL
      </p>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis
              dataKey="date"
              tickFormatter={(val) =>
                format(new Date(val + "T00:00:00"), "MM/dd")
              }
              stroke={MUTED}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={MUTED}
              fontSize={12}
              tickFormatter={(val) => `$${val}`}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(val) =>
                format(new Date(val + "T00:00:00"), "MMM dd, yyyy")
              }
              formatter={(value: any) => [
                `$${Number(value).toFixed(2)}`,
                "PnL",
              ]}
            />
            <ReferenceLine y={0} stroke={BORDER} strokeDasharray="3 3" />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.pnl >= 0 ? GREEN : RED}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
