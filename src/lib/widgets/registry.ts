import { WidgetDefinition, WidgetConfig } from "@/types";

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  {
    id: "total-trades",
    name: "Total Trades",
    description: "Number of closed trades",
    size: "stat",
  },
  {
    id: "win-rate",
    name: "Win Rate",
    description: "Percentage of winning trades",
    size: "stat",
  },
  {
    id: "net-pnl",
    name: "Net PnL",
    description: "Total profit and loss",
    size: "stat",
  },
  {
    id: "avg-win-loss",
    name: "Avg Win vs Loss",
    description: "Average winning vs losing trade with bar comparison",
    size: "list",
  },
  {
    id: "profit-factor",
    name: "Profit Factor",
    description: "Ratio of gross profit to gross loss",
    size: "stat",
  },
  {
    id: "cumulative-pnl",
    name: "Cumulative PnL",
    description: "Equity curve chart over time",
    size: "chart",
  },
  {
    id: "recent-trades",
    name: "Recent Trades",
    description: "Last 10 trades with PnL",
    size: "list",
  },
  {
    id: "pnl-by-setup",
    name: "P&L by Setup",
    description: "Net PnL breakdown by trade setup with win rate",
    size: "list",
  },
  {
    id: "last-7-days",
    name: "Last 7 Days",
    description: "Net P&L for each of the last 7 calendar days",
    size: "wide",
  },
];

// Default config: the 4 widgets the user selected
export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: "total-trades", enabled: true, order: 0 },
  { id: "win-rate", enabled: true, order: 1 },
  { id: "profit-factor", enabled: true, order: 2 },
  { id: "cumulative-pnl", enabled: true, order: 3 },
];

export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id);
}
