import { NormalizedExecution, ReconstructedTrade } from "@/types";
import { format } from "date-fns";

/**
 * Reconstructs complete trades from a list of raw executions.
 *
 * Algorithm:
 * 1. Group executions by symbol + trading day
 * 2. Sort each group chronologically
 * 3. Track net position: BUY adds, SELL/SELL_SHORT subtracts
 * 4. When position returns to 0, a trade is complete
 * 5. Incomplete trades (position != 0 at end) are discarded
 */
export function reconstructTrades(
  executions: NormalizedExecution[]
): ReconstructedTrade[] {
  // Group by symbol + day
  const groups = groupBySymbolAndDay(executions);
  const trades: ReconstructedTrade[] = [];

  for (const group of Object.values(groups)) {
    // Sort chronologically
    group.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Build trades from this group
    const groupTrades = buildTradesFromGroup(group);
    trades.push(...groupTrades);
  }

  // Sort all trades by entry date
  trades.sort((a, b) => a.entryDate.getTime() - b.entryDate.getTime());

  return trades;
}

function groupBySymbolAndDay(
  executions: NormalizedExecution[]
): Record<string, NormalizedExecution[]> {
  const groups: Record<string, NormalizedExecution[]> = {};

  for (const exec of executions) {
    const day = format(exec.timestamp, "yyyy-MM-dd");
    const key = `${exec.symbol}_${day}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(exec);
  }

  return groups;
}

function buildTradesFromGroup(
  executions: NormalizedExecution[]
): ReconstructedTrade[] {
  const trades: ReconstructedTrade[] = [];
  let position = 0;
  let currentExecutions: NormalizedExecution[] = [];

  for (const exec of executions) {
    // Track position change
    const delta = getPositionDelta(exec);
    const prevPosition = position;
    position += delta;

    currentExecutions.push(exec);

    // Position returned to 0 → trade is complete
    if (position === 0 && currentExecutions.length > 0) {
      const trade = buildTrade(currentExecutions, prevPosition, delta);
      if (trade) {
        trades.push(trade);
      }
      currentExecutions = [];
    }
  }

  // Remaining executions with position != 0 → incomplete trade, discard
  // (per user requirement: ignore incomplete trades)

  return trades;
}

function getPositionDelta(exec: NormalizedExecution): number {
  switch (exec.side) {
    case "BUY":
      return exec.quantity;
    case "SELL":
      return -exec.quantity;
    case "SELL_SHORT":
      return -exec.quantity;
  }
}

function buildTrade(
  executions: NormalizedExecution[],
  _prevPosition: number,
  _lastDelta: number
): ReconstructedTrade | null {
  if (executions.length === 0) return null;

  const symbol = executions[0].symbol;

  // Determine trade side from the first execution
  const firstExec = executions[0];
  const side: "LONG" | "SHORT" =
    firstExec.side === "BUY" ? "LONG" : "SHORT";

  // Separate entries and exits
  const entries: NormalizedExecution[] = [];
  const exits: NormalizedExecution[] = [];

  if (side === "LONG") {
    // LONG: entries are BUYs, exits are SELLs
    for (const exec of executions) {
      if (exec.side === "BUY") entries.push(exec);
      else exits.push(exec);
    }
  } else {
    // SHORT: entries are SELL_SHORT, exits are BUYs
    for (const exec of executions) {
      if (exec.side === "SELL_SHORT") entries.push(exec);
      else exits.push(exec);
    }
  }

  if (entries.length === 0 || exits.length === 0) return null;

  // Calculate weighted average prices
  const avgEntryPrice = weightedAverage(entries);
  const avgExitPrice = weightedAverage(exits);
  const totalQuantity = entries.reduce((sum, e) => sum + e.quantity, 0);

  // Calculate PnL
  let pnl: number;
  if (side === "LONG") {
    pnl = (avgExitPrice - avgEntryPrice) * totalQuantity;
  } else {
    pnl = (avgEntryPrice - avgExitPrice) * totalQuantity;
  }

  // Round PnL to 2 decimals
  pnl = Math.round(pnl * 100) / 100;

  return {
    symbol,
    side,
    status: "CLOSED",
    entryDate: entries[0].timestamp,
    exitDate: exits[exits.length - 1].timestamp,
    totalQuantity,
    avgEntryPrice: Math.round(avgEntryPrice * 10000) / 10000,
    avgExitPrice: Math.round(avgExitPrice * 10000) / 10000,
    pnl,
    executions,
  };
}

function weightedAverage(executions: NormalizedExecution[]): number {
  let totalCost = 0;
  let totalQty = 0;
  for (const exec of executions) {
    totalCost += exec.price * exec.quantity;
    totalQty += exec.quantity;
  }
  return totalQty > 0 ? totalCost / totalQty : 0;
}
