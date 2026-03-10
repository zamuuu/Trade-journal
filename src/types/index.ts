// Normalized execution from any CSV/TXT parser
export interface NormalizedExecution {
  symbol: string;
  side: "BUY" | "SELL" | "SELL_SHORT";
  quantity: number;
  price: number;
  timestamp: Date;
  rawData: Record<string, string>;
}

// Reconstructed trade before saving to DB
export interface ReconstructedTrade {
  symbol: string;
  side: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED";
  entryDate: Date;
  exitDate: Date | null;
  totalQuantity: number;
  avgEntryPrice: number;
  avgExitPrice: number | null;
  pnl: number;
  executions: NormalizedExecution[];
}

// Import preview shown to user before confirming
export interface ImportPreview {
  trades: ReconstructedTrade[];
  skippedExecutions: NormalizedExecution[];
  duplicateCount: number;
  totalExecutions: number;
}

// Parser interface that all broker parsers must implement
export interface BrokerParser {
  name: string;
  fileExtensions: string[];
  parse(content: string): NormalizedExecution[];
}

// Calendar day data
export interface CalendarDay {
  date: string; // YYYY-MM-DD
  pnl: number;
  tradeCount: number;
}

// Dashboard metrics
export interface DashboardMetrics {
  totalTrades: number;
  winRate: number;
  totalPnl: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
}

// Widget system
export type WidgetSize = "stat" | "chart" | "list" | "wide";

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  size: WidgetSize;
}

export interface WidgetConfig {
  id: string;
  enabled: boolean;
  order: number;
}

// Per-setup aggregated stats
export interface SetupStats {
  setup: string;
  netPnl: number;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRate: number;
}

// Daily aggregated PnL for last-7-days widget
export interface DailyPnl {
  date: string; // YYYY-MM-DD
  pnl: number;
  tradeCount: number;
}

// All possible data the dashboard can pass to widgets
export interface DashboardData {
  metrics: DashboardMetrics;
  pnlData: { date: string; pnl: number; cumulative: number }[];
  recentTrades: {
    id: string;
    symbol: string;
    side: string;
    entryDate: string;
    pnl: number;
    totalQuantity: number;
  }[];
  setupStats: SetupStats[];
  last7Days: DailyPnl[];
}
