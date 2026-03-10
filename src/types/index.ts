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

// Detailed reports stats (all 24 metrics for the Detailed tab)
export interface DetailedStats {
  totalGainLoss: number;
  largestGain: number;
  largestLoss: number;
  averageDailyGainLoss: number;
  averageDailyVolume: number;
  averagePerShareGainLoss: number;
  averageTradeGainLoss: number;
  averageWinningTrade: number;
  averageLosingTrade: number;
  totalNumberOfTrades: number;
  numberOfWinningTrades: number;
  numberOfLosingTrades: number;
  winRate: number;
  lossRate: number;
  avgHoldTimeScratchMs: number | null;   // milliseconds, null if no scratch trades
  avgHoldTimeWinningMs: number | null;   // milliseconds, null if no winning trades
  avgHoldTimeLosingMs: number | null;    // milliseconds, null if no losing trades
  numberOfScratchTrades: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  tradePnlStdDeviation: number;
  sqn: number | null;                     // System Quality Number, null if < 30 trades
  probabilityOfRandomChance: number | null; // percentage, null if insufficient data
  kellyPercentage: number | null;         // percentage, null if insufficient data
  kRatio: number | null;                  // null if insufficient data
  profitFactor: number;
}

// Stats for one side (winning days or losing days) in Win vs Loss Days report
export interface WinLossDaySideStats {
  dayCount: number;
  totalGainLoss: number;
  averageDailyGainLoss: number;
  averageDailyVolume: number;
  averagePerShareGainLoss: number;
  averageTradeGainLoss: number | null;    // null if 0 trades
  totalNumberOfTrades: number;
  winningTrades: number;
  losingTrades: number;
  scratchTrades: number;
  averageWinningTrade: number | null;     // null if no winners
  averageLosingTrade: number | null;      // null if no losers
  tradePnlStdDeviation: number | null;    // null if < 2 trades
  probabilityOfRandomChance: number | null;
  kRatio: number | null;
  sqn: number | null;
  kellyPercentage: number | null;
  avgHoldTimeWinningMs: number | null;
  avgHoldTimeLosingMs: number | null;
  avgHoldTimeScratchMs: number | null;
  profitFactor: number | null;            // null if no losses
  largestGain: number;
}

// Journal day trade (trade shown in a day card)
export interface JournalDayTrade {
  id: string;
  symbol: string;
  side: string;
  entryDate: string;
  pnl: number;
  totalQuantity: number;
  executionCount: number;
  tags: { id: string; name: string }[];
}

// Journal day (aggregated data for a single trading day)
export interface JournalDay {
  date: string;           // YYYY-MM-DD
  totalTrades: number;
  winRate: number;
  netPnl: number;
  totalVolume: number;
  largestWin: number;
  largestLoss: number;
  notes: string | null;
  dayNoteId: string | null;
  tags: { id: string; name: string }[];
  trades: JournalDayTrade[];
}
