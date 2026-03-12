import { WidgetDefinition, WidgetConfig } from "@/types";

export const WIDGET_REGISTRY: WidgetDefinition[] = [
  // ── Small (1×1) ────────────────────────────────────────────────
  {
    id: "total-trades",
    name: "Total Trades",
    description: "Number of closed trades",
    size: "small",
  },
  {
    id: "win-rate",
    name: "Win Rate",
    description: "Percentage of winning trades",
    size: "small",
  },
  {
    id: "net-pnl",
    name: "Net PnL",
    description: "Total profit and loss",
    size: "small",
  },
  {
    id: "profit-factor",
    name: "Profit Factor",
    description: "Ratio of gross profit to gross loss",
    size: "small",
  },
  {
    id: "max-consec-wins",
    name: "Max Consecutive Wins",
    description: "Highest streak of consecutive winning trades",
    size: "small",
  },
  {
    id: "max-consec-losses",
    name: "Max Consecutive Losses",
    description: "Highest streak of consecutive losing trades",
    size: "small",
  },
  {
    id: "avg-win-loss",
    name: "Avg Win vs Loss",
    description: "Average winning vs losing trade with bar comparison",
    size: "small",
  },
  {
    id: "win-loss-donut",
    name: "Winning vs Losing Trades",
    description: "Donut chart showing winning vs losing trade ratio",
    size: "small",
  },

  // ── Medium (1×2) ───────────────────────────────────────────────
  {
    id: "pnl-by-setup",
    name: "P&L by Setup",
    description: "Net PnL breakdown by trade setup with win rate",
    size: "medium",
  },
  {
    id: "pnl-by-day",
    name: "Performance By Day Of Week",
    description: "P&L breakdown by day of week with percentage bars",
    size: "medium",
  },
  {
    id: "pnl-by-price",
    name: "Performance By Price",
    description: "P&L breakdown by stock price range with percentage bars",
    size: "medium",
  },
  {
    id: "recent-trades",
    name: "Recent Trades",
    description: "Last 10 trades with PnL",
    size: "medium",
  },

  // ── Large (2×2) ────────────────────────────────────────────────
  {
    id: "cumulative-pnl",
    name: "Cumulative PnL",
    description: "Equity curve chart over time",
    size: "large",
  },

  // ── Wide (4×1) ─────────────────────────────────────────────────
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
