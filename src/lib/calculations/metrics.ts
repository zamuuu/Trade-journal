import { DashboardMetrics } from "@/types";

interface TradeForMetrics {
  pnl: number;
  status: string;
}

export function calculateMetrics(trades: TradeForMetrics[]): DashboardMetrics {
  const closedTrades = trades.filter((t) => t.status === "CLOSED");
  const totalTrades = closedTrades.length;

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnl: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakEvenTrades: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
    };
  }

  const winners = closedTrades.filter((t) => t.pnl > 0);
  const losers = closedTrades.filter((t) => t.pnl < 0);
  const breakEven = closedTrades.filter((t) => t.pnl === 0);

  const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnl, 0);
  const totalWins = winners.reduce((sum, t) => sum + t.pnl, 0);
  const totalLosses = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0));

  const winRate = totalTrades > 0 ? (winners.length / totalTrades) * 100 : 0;
  const averageWin = winners.length > 0 ? totalWins / winners.length : 0;
  const averageLoss = losers.length > 0 ? totalLosses / losers.length : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  // Max consecutive wins / losses
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;
  for (const t of closedTrades) {
    if (t.pnl > 0) {
      currentWins++;
      currentLosses = 0;
      if (currentWins > maxConsecWins) maxConsecWins = currentWins;
    } else if (t.pnl < 0) {
      currentLosses++;
      currentWins = 0;
      if (currentLosses > maxConsecLosses) maxConsecLosses = currentLosses;
    } else {
      currentWins = 0;
      currentLosses = 0;
    }
  }

  return {
    totalTrades,
    winRate: Math.round(winRate * 100) / 100,
    totalPnl: Math.round(totalPnl * 100) / 100,
    averageWin: Math.round(averageWin * 100) / 100,
    averageLoss: Math.round(averageLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    winningTrades: winners.length,
    losingTrades: losers.length,
    breakEvenTrades: breakEven.length,
    maxConsecutiveWins: maxConsecWins,
    maxConsecutiveLosses: maxConsecLosses,
  };
}
