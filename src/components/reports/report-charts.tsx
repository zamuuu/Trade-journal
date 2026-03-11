"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { format } from "date-fns";

interface ReportChartsProps {
  cumulativePnl: { date: string; cumulative: number }[];
  dailyPnl: { date: string; pnl: number }[];
  drawdownData: { date: string; drawdown: number }[];
  winLossDays: { winDays: number; lossDays: number; breakEvenDays: number };
}

const tooltipStyle = {
  backgroundColor: "oklch(0.30 0.030 268)",
  border: "1px solid oklch(0.32 0.025 268)",
  borderRadius: "6px",
  fontSize: "12px",
};

const GREEN = "oklch(0.65 0.16 155)";
const RED = "oklch(0.65 0.19 25)";
const MUTED = "oklch(0.63 0.015 268)";
const BORDER = "oklch(0.32 0.025 268)";

export function ReportCharts({
  cumulativePnl,
  dailyPnl,
  drawdownData,
  winLossDays,
}: ReportChartsProps) {
  if (cumulativePnl.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-4">
        <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          No trade data yet. Import trades to see reports.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Winning Days</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-profit">{winLossDays.winDays}</p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Losing Days</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-loss">{winLossDays.lossDays}</p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Break Even Days</p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-flat">{winLossDays.breakEvenDays}</p>
        </div>
      </div>

      {/* Cumulative PnL */}
      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Cumulative PnL</p>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={cumulativePnl}>
            <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "MM/dd")} stroke={MUTED} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={MUTED} fontSize={12} tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={false} width={55} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(val) => format(new Date(val), "MMM dd, yyyy")}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "Cumulative"]} />
            <ReferenceLine y={0} stroke={BORDER} strokeDasharray="3 3" />
            <Line type="monotone" dataKey="cumulative" stroke={GREEN} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Daily PnL */}
      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Daily PnL</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dailyPnl}>
            <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val + "T00:00:00"), "MM/dd")} stroke={MUTED} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={MUTED} fontSize={12} tickFormatter={(val) => `$${val}`} tickLine={false} axisLine={false} width={55} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(val) => format(new Date(val + "T00:00:00"), "MMM dd, yyyy")}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`$${Number(value).toFixed(2)}`, "PnL"]} />
            <ReferenceLine y={0} stroke={BORDER} strokeDasharray="3 3" />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
              {dailyPnl.map((entry, index) => (
                <Cell key={index} fill={entry.pnl >= 0 ? GREEN : RED} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Drawdown */}
      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Drawdown %</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={drawdownData}>
            <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "MM/dd")} stroke={MUTED} fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke={MUTED} fontSize={12} tickFormatter={(val) => `${val}%`} reversed tickLine={false} axisLine={false} width={40} />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(val) => format(new Date(val), "MMM dd, yyyy")}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [`${Number(value).toFixed(2)}%`, "Drawdown"]} />
            <Area type="monotone" dataKey="drawdown" stroke={RED} fill="oklch(0.637 0.175 25 / 0.15)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
