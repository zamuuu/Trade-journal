"use server";

import { prisma } from "@/lib/db";
import { getParser } from "@/lib/csv/parser-registry";
import { decodeFileContent } from "@/lib/csv/encoding";
import { reconstructTrades } from "@/lib/csv/trade-reconstructor";
import { ReconstructedTrade } from "@/types";

/** Build parser options from form data (e.g. tradeDate for DAS). */
function buildParserOptions(formData: FormData): Record<string, string> {
  const opts: Record<string, string> = {};
  const tradeDate = formData.get("tradeDate");
  if (typeof tradeDate === "string" && tradeDate) opts.tradeDate = tradeDate;
  return opts;
}

export async function previewImport(formData: FormData) {
  const file = formData.get("file") as File;
  const brokerId = formData.get("broker") as string;

  if (!file || !brokerId) {
    return { error: "File and broker are required" };
  }

  const parser = getParser(brokerId);
  if (!parser) {
    return { error: `Unknown broker: ${brokerId}` };
  }

  // Read file content with proper encoding
  const buffer = await file.arrayBuffer();
  const content = decodeFileContent(buffer);

  // Parse executions (pass extra options like tradeDate)
  const options = buildParserOptions(formData);
  const executions = parser.parse(content, options);
  if (executions.length === 0) {
    return { error: "No valid executions found in the file" };
  }

  // Reconstruct trades
  const trades = reconstructTrades(executions);

  // Check for duplicates
  const duplicateCount = await countDuplicates(trades);

  const totalExecutions = executions.length;
  const skippedCount = totalExecutions - trades.reduce((sum, t) => sum + t.executions.length, 0);

  return {
    trades,
    duplicateCount,
    totalExecutions,
    skippedExecutions: skippedCount,
    newTradesCount: trades.length - duplicateCount,
  };
}

export async function confirmImport(formData: FormData) {
  const file = formData.get("file") as File;
  const brokerId = formData.get("broker") as string;

  if (!file || !brokerId) {
    return { error: "File and broker are required" };
  }

  const parser = getParser(brokerId);
  if (!parser) {
    return { error: `Unknown broker: ${brokerId}` };
  }

  const buffer = await file.arrayBuffer();
  const content = decodeFileContent(buffer);
  const options = buildParserOptions(formData);
  const executions = parser.parse(content, options);
  const trades = reconstructTrades(executions);

  if (trades.length === 0) {
    return { error: "No trades to import" };
  }

  // Filter out duplicates
  const newTrades = await filterDuplicates(trades);

  if (newTrades.length === 0) {
    return { error: "All trades already exist in the database" };
  }

  // Save to database
  let importedCount = 0;
  for (const trade of newTrades) {
    await prisma.trade.create({
      data: {
        symbol: trade.symbol,
        side: trade.side,
        status: trade.status,
        entryDate: trade.entryDate,
        exitDate: trade.exitDate,
        totalQuantity: trade.totalQuantity,
        avgEntryPrice: trade.avgEntryPrice,
        avgExitPrice: trade.avgExitPrice,
        pnl: trade.pnl,
        executions: {
          create: trade.executions.map((exec) => ({
            side: exec.side,
            quantity: exec.quantity,
            price: exec.price,
            timestamp: exec.timestamp,
            rawData: JSON.stringify(exec.rawData),
          })),
        },
      },
    });
    importedCount++;
  }

  return { success: true, importedCount };
}

/**
 * Generates a unique hash for a trade based on its key properties
 * to detect duplicates.
 */
function tradeHash(trade: ReconstructedTrade): string {
  return `${trade.symbol}_${trade.side}_${trade.entryDate.toISOString()}_${trade.totalQuantity}_${trade.pnl}`;
}

async function countDuplicates(trades: ReconstructedTrade[]): Promise<number> {
  let count = 0;
  for (const trade of trades) {
    const existing = await prisma.trade.findFirst({
      where: {
        symbol: trade.symbol,
        side: trade.side,
        entryDate: trade.entryDate,
        totalQuantity: trade.totalQuantity,
        pnl: trade.pnl,
      },
    });
    if (existing) count++;
  }
  return count;
}

async function filterDuplicates(
  trades: ReconstructedTrade[]
): Promise<ReconstructedTrade[]> {
  const newTrades: ReconstructedTrade[] = [];
  for (const trade of trades) {
    const existing = await prisma.trade.findFirst({
      where: {
        symbol: trade.symbol,
        side: trade.side,
        entryDate: trade.entryDate,
        totalQuantity: trade.totalQuantity,
        pnl: trade.pnl,
      },
    });
    if (!existing) {
      newTrades.push(trade);
    }
  }
  return newTrades;
}
