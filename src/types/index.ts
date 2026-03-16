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
  /** Extra fields this broker requires from the UI (e.g. tradeDate for DAS). */
  extraFields?: { key: string; label: string; type: "date" }[];
  parse(content: string, options?: Record<string, string>): NormalizedExecution[];
  /** For binary formats (e.g. XLSX). If present, import-actions uses this instead of parse(). */
  parseBinary?(buffer: ArrayBuffer, options?: Record<string, string>): NormalizedExecution[];
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
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
}

// Widget system — grid-based sizing
// small  = 1 col × 1 row   (single metric or compact visual)
// medium = 1 col × 2 rows  (lists, bar breakdowns)
// large  = 2 cols × 2 rows (charts)
// wide   = 4 cols × 1 row  (full-width compact widgets)
export type WidgetSize = "small" | "medium" | "large" | "wide";

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

// P&L aggregated by day of week (0=Sun, 6=Sat)
export interface DayOfWeekPnl {
  day: number; // 0=Sun, 1=Mon, ... 6=Sat
  label: string; // "Sun", "Mon", etc.
  pnl: number;
  percent: number; // % of total absolute P&L
  tradeCount: number;
}

// P&L aggregated by stock price range
export interface PriceRangePnl {
  label: string;    // e.g. "< $0.50", "$1 - $2.99"
  min: number;      // lower bound (inclusive)
  max: number;      // upper bound (exclusive), Infinity for last bucket
  pnl: number;
  percent: number;  // % of total absolute P&L
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
  dayOfWeekPnl: DayOfWeekPnl[];
  priceRangePnl: PriceRangePnl[];
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
  setup: string | null;
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
