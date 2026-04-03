"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getParser } from "@/lib/csv/parser-registry";
import { decodeFileContent } from "@/lib/csv/encoding";
import { reconstructTrades } from "@/lib/csv/trade-reconstructor";
import { NormalizedExecution, ReconstructedTrade } from "@/types";

/** Build parser options from form data (e.g. tradeDate for DAS). */
function buildParserOptions(formData: FormData): Record<string, string> {
  const opts: Record<string, string> = {};
  const tradeDate = formData.get("tradeDate");
  if (typeof tradeDate === "string" && tradeDate) opts.tradeDate = tradeDate;
  return opts;
}

/** Parse file into reconstructed trades (shared between preview and confirm). */
function parseFile(
  buffer: ArrayBuffer,
  brokerId: string,
  options: Record<string, string>
): { trades: ReconstructedTrade[]; totalExecutions: number; skippedExecutions: number } | { error: string } {
  const parser = getParser(brokerId);
  if (!parser) return { error: `Unknown broker: ${brokerId}` };

  let executions: NormalizedExecution[];
  if (parser.parseBinary) {
    executions = parser.parseBinary(buffer, options);
  } else {
    const content = decodeFileContent(buffer);
    executions = parser.parse(content, options);
  }

  if (executions.length === 0) {
    return { error: "No valid executions found in the file" };
  }

  const trades = reconstructTrades(executions);
  const totalExecutions = executions.length;
  const skippedExecutions = totalExecutions - trades.reduce((sum, t) => sum + t.executions.length, 0);

  return { trades, totalExecutions, skippedExecutions };
}

/**
 * Batch duplicate detection: fetches all potentially matching trades in ONE query,
 * then compares in memory. Replaces the previous N+1 pattern.
 */
async function findDuplicateSet(
  trades: ReconstructedTrade[]
): Promise<Set<number>> {
  if (trades.length === 0) return new Set();

  // Get the date range of all incoming trades
  const dates = trades.map((t) => t.entryDate);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  // Fetch all existing trades in that date range with ONE query
  const existing = await prisma.trade.findMany({
    where: {
      entryDate: { gte: minDate, lte: maxDate },
    },
    select: {
      symbol: true,
      side: true,
      entryDate: true,
      totalQuantity: true,
      pnl: true,
    },
  });

  // Build a Set of hash keys for fast lookup
  const existingKeys = new Set(
    existing.map(
      (t) =>
        `${t.symbol}_${t.side}_${t.entryDate.getTime()}_${t.totalQuantity}_${t.pnl}`
    )
  );

  // Check which incoming trades match
  const duplicateIndices = new Set<number>();
  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    const key = `${t.symbol}_${t.side}_${t.entryDate.getTime()}_${t.totalQuantity}_${t.pnl}`;
    if (existingKeys.has(key)) {
      duplicateIndices.add(i);
    }
  }

  return duplicateIndices;
}

export async function previewImport(formData: FormData) {
  const file = formData.get("file") as File;
  const brokerId = formData.get("broker") as string;

  if (!file || !brokerId) {
    return { error: "File and broker are required" };
  }

  const buffer = await file.arrayBuffer();
  const options = buildParserOptions(formData);
  const result = parseFile(buffer, brokerId, options);

  if ("error" in result) return { error: result.error };

  const { trades, totalExecutions, skippedExecutions } = result;

  // Batch duplicate check (single DB query instead of N queries)
  const duplicateSet = await findDuplicateSet(trades);

  return {
    trades,
    duplicateCount: duplicateSet.size,
    totalExecutions,
    skippedExecutions: skippedExecutions,
    newTradesCount: trades.length - duplicateSet.size,
  };
}

export async function confirmImport(formData: FormData) {
  const file = formData.get("file") as File;
  const brokerId = formData.get("broker") as string;

  if (!file || !brokerId) {
    return { error: "File and broker are required" };
  }

  const buffer = await file.arrayBuffer();
  const options = buildParserOptions(formData);
  const result = parseFile(buffer, brokerId, options);

  if ("error" in result) return { error: result.error };

  const { trades } = result;

  if (trades.length === 0) {
    return { error: "No trades to import" };
  }

  // Batch duplicate check (single DB query)
  const duplicateSet = await findDuplicateSet(trades);
  const newTrades = trades.filter((_, i) => !duplicateSet.has(i));

  if (newTrades.length === 0) {
    return { error: "All trades already exist in the database" };
  }

  // Save to database in a single transaction (atomic + faster)
  const importedCount = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const trade of newTrades) {
      await tx.trade.create({
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
      count++;
    }
    return count;
  });

  // Revalidate all affected pages
  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/journal");
  revalidatePath("/reports");

  return { success: true, importedCount };
}

/* ------------------------------------------------------------------ */
/*  Manual trade entry                                                 */
/* ------------------------------------------------------------------ */

export interface ManualTradeInput {
  symbol: string;
  side: "LONG" | "SHORT";
  entryDateTime: string;   // ISO string  e.g. "2025-03-18T09:35"
  exitDateTime: string;    // ISO string
  entryPrice: number;
  exitPrice: number;
  quantity: number;
}

export async function manualImportTrade(input: ManualTradeInput) {
  const { symbol, side, entryDateTime, exitDateTime, entryPrice, exitPrice, quantity } = input;

  // Validations
  if (!symbol || !symbol.trim()) return { error: "Symbol is required" };
  if (!entryDateTime) return { error: "Entry date/time is required" };
  if (!exitDateTime) return { error: "Exit date/time is required" };
  if (entryPrice <= 0) return { error: "Entry price must be greater than 0" };
  if (exitPrice <= 0) return { error: "Exit price must be greater than 0" };
  if (quantity <= 0 || !Number.isInteger(quantity)) return { error: "Quantity must be a positive integer" };

  const entryDate = new Date(entryDateTime);
  const exitDate = new Date(exitDateTime);

  if (isNaN(entryDate.getTime())) return { error: "Invalid entry date/time" };
  if (isNaN(exitDate.getTime())) return { error: "Invalid exit date/time" };
  if (exitDate <= entryDate) return { error: "Exit date/time must be after entry date/time" };

  const upperSymbol = symbol.trim().toUpperCase();

  // Calculate PnL
  const pnl = side === "LONG"
    ? (exitPrice - entryPrice) * quantity
    : (entryPrice - exitPrice) * quantity;

  // Determine execution sides
  const entrySide = side === "LONG" ? "BUY" : "SELL_SHORT";
  const exitSide = side === "LONG" ? "SELL" : "BUY";

  // Check for duplicates
  const existing = await prisma.trade.findFirst({
    where: {
      symbol: upperSymbol,
      side,
      entryDate,
      totalQuantity: quantity,
      pnl,
    },
  });

  if (existing) return { error: "This trade already exists in the database" };

  // Create trade with two synthetic executions (entry + exit)
  await prisma.trade.create({
    data: {
      symbol: upperSymbol,
      side,
      status: "CLOSED",
      entryDate,
      exitDate,
      totalQuantity: quantity,
      avgEntryPrice: entryPrice,
      avgExitPrice: exitPrice,
      pnl,
      executions: {
        create: [
          {
            side: entrySide,
            quantity,
            price: entryPrice,
            timestamp: entryDate,
            rawData: JSON.stringify({ source: "manual" }),
          },
          {
            side: exitSide,
            quantity,
            price: exitPrice,
            timestamp: exitDate,
            rawData: JSON.stringify({ source: "manual" }),
          },
        ],
      },
    },
  });

  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/journal");
  revalidatePath("/reports");

  return { success: true, importedCount: 1 };
}
