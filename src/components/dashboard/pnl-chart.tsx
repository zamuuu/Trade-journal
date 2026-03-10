"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";

interface PnlChartProps {
  data: { date: string; pnl: number; cumulative: number }[];
}

export function PnlChart({ data }: PnlChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Cumulative PnL</p>
        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
          No trade data yet. Import trades to see your equity curve.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Cumulative PnL</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tickFormatter={(val) => format(new Date(val), "MM/dd")}
            stroke="oklch(0.63 0.015 268)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="oklch(0.63 0.015 268)"
            fontSize={12}
            tickFormatter={(val) => `$${val}`}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(0.30 0.030 268)",
              border: "1px solid oklch(0.32 0.025 268)",
              borderRadius: "6px",
              fontSize: "13px",
            }}
            labelFormatter={(val) => format(new Date(val), "MMM dd, yyyy HH:mm")}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "PnL"]}
          />
          <ReferenceLine y={0} stroke="oklch(0.32 0.025 268)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="oklch(0.65 0.16 155)"
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
