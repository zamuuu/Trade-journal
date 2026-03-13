"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Delete tags that are not referenced by any TradeTag or DayNoteTag.
 */
async function cleanupOrphanedTags() {
  await prisma.tag.deleteMany({
    where: {
      trades: { none: {} },
      dayNotes: { none: {} },
    },
  });
}

/**
 * Delete multiple trades by their IDs (cascade deletes executions, tags, screenshots).
 */
export async function bulkDeleteTrades(tradeIds: string[]) {
  if (tradeIds.length === 0) return;

  await prisma.trade.deleteMany({
    where: { id: { in: tradeIds } },
  });

  await cleanupOrphanedTags();

  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}

/**
 * Add a tag to multiple trades. Creates the tag if it doesn't exist.
 * Skips trades that already have the tag.
 */
export async function bulkAddTagToTrades(tradeIds: string[], tagName: string) {
  const trimmedName = tagName.trim();
  if (!trimmedName || tradeIds.length === 0) return;

  // Find or create tag (case-insensitive lookup, preserve original casing)
  const allTags = await prisma.tag.findMany();
  let tag = allTags.find(
    (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
  ) ?? null;

  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: trimmedName },
    });
  }

  // Find existing relations to skip duplicates
  const existing = await prisma.tradeTag.findMany({
    where: {
      tagId: tag.id,
      tradeId: { in: tradeIds },
    },
    select: { tradeId: true },
  });

  const existingSet = new Set(existing.map((e) => e.tradeId));
  const newTradeIds = tradeIds.filter((id) => !existingSet.has(id));

  if (newTradeIds.length > 0) {
    await prisma.tradeTag.createMany({
      data: newTradeIds.map((tradeId) => ({
        tradeId,
        tagId: tag.id,
      })),
    });
  }

  revalidatePath("/trades");
  revalidatePath("/journal");
}

/**
 * Get all existing tags for the combobox autocomplete.
 */
export async function getAllTags(): Promise<{ id: string; name: string }[]> {
  return prisma.tag.findMany({
    orderBy: { name: "asc" },
  });
}

/**
 * Get tags that are currently assigned to any of the given trades.
 * Returns each tag with the count of how many selected trades have it.
 */
export async function getTagsForTrades(
  tradeIds: string[]
): Promise<{ id: string; name: string; count: number }[]> {
  if (tradeIds.length === 0) return [];

  const tradeTags = await prisma.tradeTag.findMany({
    where: { tradeId: { in: tradeIds } },
    include: { tag: true },
  });

  const tagMap = new Map<string, { id: string; name: string; count: number }>();
  for (const tt of tradeTags) {
    const existing = tagMap.get(tt.tagId);
    if (existing) {
      existing.count++;
    } else {
      tagMap.set(tt.tagId, { id: tt.tag.id, name: tt.tag.name, count: 1 });
    }
  }

  return Array.from(tagMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

/**
 * Remove specific tags from multiple trades.
 */
export async function bulkRemoveTagFromTrades(
  tradeIds: string[],
  tagIds: string[]
) {
  if (tradeIds.length === 0 || tagIds.length === 0) return;

  await prisma.tradeTag.deleteMany({
    where: {
      tradeId: { in: tradeIds },
      tagId: { in: tagIds },
    },
  });

  await cleanupOrphanedTags();

  revalidatePath("/trades");
  revalidatePath("/journal");
}

/**
 * Merge multiple trades into one. All trades must share the same symbol.
 * The surviving trade keeps the earliest entryDate.
 * All executions, screenshots, and tags are reassigned to the survivor.
 * Aggregated fields (quantity, prices, pnl) are recalculated from executions.
 * Returns { error: string } on validation failure, or { mergedTradeId } on success.
 */
export async function bulkMergeTrades(
  tradeIds: string[]
): Promise<{ error?: string; mergedTradeId?: string }> {
  if (tradeIds.length < 2) return { error: "Select at least 2 trades to merge." };

  // Fetch the trades with their executions
  const trades = await prisma.trade.findMany({
    where: { id: { in: tradeIds } },
    include: { executions: true },
    orderBy: { entryDate: "asc" },
  });

  if (trades.length < 2) return { error: "Could not find the selected trades." };

  // Validate all trades share the same symbol
  const symbols = new Set(trades.map((t) => t.symbol));
  if (symbols.size > 1) {
    return {
      error: `Cannot merge trades with different symbols: ${Array.from(symbols).join(", ")}`,
    };
  }

  // The survivor is the trade with the earliest entry date (already sorted)
  const survivor = trades[0];
  const toRemove = trades.slice(1);
  const toRemoveIds = toRemove.map((t) => t.id);

  // Collect ALL executions across all trades being merged
  const allExecutions = trades.flatMap((t) => t.executions);

  // Reassign executions from the other trades to the survivor
  if (toRemoveIds.length > 0) {
    await prisma.execution.updateMany({
      where: { tradeId: { in: toRemoveIds } },
      data: { tradeId: survivor.id },
    });
  }

  // Reassign screenshots from the other trades to the survivor
  await prisma.screenshot.updateMany({
    where: { tradeId: { in: toRemoveIds } },
    data: { tradeId: survivor.id },
  });

  // Merge tags: collect unique tags from all trades, add missing ones to survivor
  const existingTags = await prisma.tradeTag.findMany({
    where: { tradeId: survivor.id },
    select: { tagId: true },
  });
  const survivorTagIds = new Set(existingTags.map((t) => t.tagId));

  const otherTags = await prisma.tradeTag.findMany({
    where: { tradeId: { in: toRemoveIds } },
    select: { tagId: true },
  });
  const newTagIds = [...new Set(otherTags.map((t) => t.tagId))].filter(
    (id) => !survivorTagIds.has(id)
  );

  if (newTagIds.length > 0) {
    await prisma.tradeTag.createMany({
      data: newTagIds.map((tagId) => ({ tradeId: survivor.id, tagId })),
    });
  }

  // Delete the other trades (cascade deletes their TradeTags, but executions/screenshots already moved)
  await prisma.trade.deleteMany({
    where: { id: { in: toRemoveIds } },
  });

  // Recalculate aggregated fields from all executions
  // Separate buy-side and sell-side executions
  const buys = allExecutions.filter((e) => e.side === "BUY");
  const sells = allExecutions.filter(
    (e) => e.side === "SELL" || e.side === "SELL_SHORT"
  );

  const totalBuyQty = buys.reduce((s, e) => s + e.quantity, 0);
  const totalSellQty = sells.reduce((s, e) => s + e.quantity, 0);

  const avgEntry =
    totalBuyQty > 0
      ? buys.reduce((s, e) => s + e.price * e.quantity, 0) / totalBuyQty
      : survivor.avgEntryPrice;

  const avgExit =
    totalSellQty > 0
      ? sells.reduce((s, e) => s + e.price * e.quantity, 0) / totalSellQty
      : null;

  // For LONG: pnl = sellValue - buyValue; for SHORT: pnl = buyValue - sellValue (but executions may differ)
  // Simplest: sum pnl of all original trades
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const totalQuantity = trades.reduce((s, t) => s + t.totalQuantity, 0);

  // Determine status and dates
  const latestExitDate = trades
    .map((t) => t.exitDate)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const hasOpen = trades.some((t) => t.status === "OPEN");
  const status = hasOpen ? "OPEN" : "CLOSED";

  // Merge notes (combine non-null notes)
  const allNotes = trades
    .map((t) => t.notes)
    .filter((n): n is string => n !== null && n.trim() !== "");
  const mergedNotes = allNotes.length > 0 ? allNotes.join("\n---\n") : null;

  // Keep setup from the survivor, or pick the first non-null one
  const setup = survivor.setup ?? trades.find((t) => t.setup)?.setup ?? null;

  // Update the survivor trade
  await prisma.trade.update({
    where: { id: survivor.id },
    data: {
      totalQuantity,
      avgEntryPrice: Math.round(avgEntry * 10000) / 10000,
      avgExitPrice: avgExit ? Math.round(avgExit * 10000) / 10000 : null,
      pnl: Math.round(totalPnl * 100) / 100,
      exitDate: latestExitDate,
      status,
      notes: mergedNotes,
      setup,
    },
  });

  await cleanupOrphanedTags();

  revalidatePath("/trades");
  revalidatePath("/trades/" + survivor.id);
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/calendar");
  revalidatePath("/reports");

  return { mergedTradeId: survivor.id };
}

/**
 * Split a single trade into multiple trades based on execution round-trips.
 * Walks executions chronologically, tracking net position. Each time the
 * position returns to 0 a new independent trade is created.
 *
 * Tags, screenshots, notes and setup are copied to every resulting trade.
 * Returns { error } on failure, or { tradeIds } with the new trade IDs.
 */
export async function splitTrade(
  tradeId: string
): Promise<{ error?: string; tradeIds?: string[] }> {
  // Fetch trade with executions, tags, screenshots
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: {
      executions: { orderBy: { timestamp: "asc" } },
      tags: { select: { tagId: true } },
      screenshots: true,
    },
  });

  if (!trade) return { error: "Trade not found." };
  if (trade.executions.length < 2) {
    return { error: "This trade has only one execution and cannot be split." };
  }

  // ── Detect round-trips ──────────────────────────────────────
  type ExecGroup = typeof trade.executions;
  const groups: ExecGroup[] = [];
  let position = 0;
  let currentGroup: ExecGroup = [];

  for (const exec of trade.executions) {
    const delta =
      exec.side === "BUY" ? exec.quantity : -exec.quantity;
    position += delta;
    currentGroup.push(exec);

    if (position === 0 && currentGroup.length > 0) {
      groups.push(currentGroup);
      currentGroup = [];
    }
  }

  // Remaining executions where position != 0 → keep as one final group (OPEN trade)
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  if (groups.length < 2) {
    return {
      error: "This trade contains a single round-trip and cannot be split further.",
    };
  }

  // ── Build new trades from each group ────────────────────────
  const tagIds = trade.tags.map((t) => t.tagId);
  const newTradeIds: string[] = [];

  for (let i = 0; i < groups.length; i++) {
    const execs = groups[i];

    // Determine side from first execution
    const firstExec = execs[0];
    const side: "LONG" | "SHORT" =
      firstExec.side === "BUY" ? "LONG" : "SHORT";

    // Separate entries and exits
    const entries =
      side === "LONG"
        ? execs.filter((e) => e.side === "BUY")
        : execs.filter((e) => e.side === "SELL_SHORT");
    const exits =
      side === "LONG"
        ? execs.filter((e) => e.side === "SELL" || e.side === "SELL_SHORT")
        : execs.filter((e) => e.side === "BUY");

    // Weighted averages
    const totalEntryQty = entries.reduce((s, e) => s + e.quantity, 0);
    const totalExitQty = exits.reduce((s, e) => s + e.quantity, 0);

    const avgEntryPrice =
      totalEntryQty > 0
        ? entries.reduce((s, e) => s + e.price * e.quantity, 0) / totalEntryQty
        : 0;
    const avgExitPrice =
      totalExitQty > 0
        ? exits.reduce((s, e) => s + e.price * e.quantity, 0) / totalExitQty
        : null;

    const totalQuantity = totalEntryQty;

    // PnL
    let pnl = 0;
    if (avgExitPrice !== null) {
      pnl =
        side === "LONG"
          ? (avgExitPrice - avgEntryPrice) * totalQuantity
          : (avgEntryPrice - avgExitPrice) * totalQuantity;
    }

    // Check if this group's position ended at 0 (closed) or not (open)
    let groupPosition = 0;
    for (const e of execs) {
      groupPosition += e.side === "BUY" ? e.quantity : -e.quantity;
    }
    const status = groupPosition === 0 ? "CLOSED" : "OPEN";

    const entryDate = entries[0]?.timestamp ?? execs[0].timestamp;
    const exitDate =
      status === "CLOSED" && exits.length > 0
        ? exits[exits.length - 1].timestamp
        : null;

    // For the first group, reuse the original trade (update it)
    // For subsequent groups, create new trades
    if (i === 0) {
      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          side,
          status,
          entryDate,
          exitDate,
          totalQuantity,
          avgEntryPrice: Math.round(avgEntryPrice * 10000) / 10000,
          avgExitPrice: avgExitPrice
            ? Math.round(avgExitPrice * 10000) / 10000
            : null,
          pnl: Math.round(pnl * 100) / 100,
        },
      });
      newTradeIds.push(trade.id);

      // Remove executions that don't belong to this group
      const keepIds = new Set(execs.map((e) => e.id));
      // We'll reassign other executions later when creating new trades
    } else {
      // Create a new trade
      const newTrade = await prisma.trade.create({
        data: {
          symbol: trade.symbol,
          side,
          status,
          entryDate,
          exitDate,
          totalQuantity,
          avgEntryPrice: Math.round(avgEntryPrice * 10000) / 10000,
          avgExitPrice: avgExitPrice
            ? Math.round(avgExitPrice * 10000) / 10000
            : null,
          pnl: Math.round(pnl * 100) / 100,
          notes: trade.notes,
          setup: trade.setup,
        },
      });
      newTradeIds.push(newTrade.id);

      // Reassign executions to the new trade
      const execIds = execs.map((e) => e.id);
      await prisma.execution.updateMany({
        where: { id: { in: execIds } },
        data: { tradeId: newTrade.id },
      });

      // Copy tags
      if (tagIds.length > 0) {
        await prisma.tradeTag.createMany({
          data: tagIds.map((tagId) => ({ tradeId: newTrade.id, tagId })),
        });
      }

      // Copy screenshots (duplicate them for each new trade)
      if (trade.screenshots.length > 0) {
        await prisma.screenshot.createMany({
          data: trade.screenshots.map((s) => ({
            tradeId: newTrade.id,
            filePath: s.filePath,
            caption: s.caption,
            category: s.category,
          })),
        });
      }
    }
  }

  revalidatePath("/trades");
  revalidatePath("/trades/" + trade.id);
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/calendar");
  revalidatePath("/reports");

  return { tradeIds: newTradeIds };
}

// ── Single-trade actions (used by trade detail page) ────────────

/**
 * Update rating (1-100) for a single trade. Pass null to clear.
 */
export async function updateTradeRating(
  tradeId: string,
  rating: number | null
) {
  if (rating !== null && (rating < 1 || rating > 100 || !Number.isInteger(rating))) {
    return;
  }
  await prisma.trade.update({
    where: { id: tradeId },
    data: { rating },
  });
  revalidatePath("/trades/" + tradeId);
  revalidatePath("/trades");
}

/**
 * Update notes for a single trade.
 */
export async function updateTradeNotes(tradeId: string, notes: string) {
  await prisma.trade.update({
    where: { id: tradeId },
    data: { notes: notes.trim() || null },
  });
  revalidatePath("/trades/" + tradeId);
  revalidatePath("/trades");
}

/**
 * Update setup for a single trade.
 */
export async function updateTradeSetup(tradeId: string, setup: string) {
  await prisma.trade.update({
    where: { id: tradeId },
    data: { setup: setup.trim() || null },
  });
  revalidatePath("/trades/" + tradeId);
  revalidatePath("/trades");
}

/**
 * Add a tag to a single trade. Creates the tag if it doesn't exist.
 */
export async function addTagToTrade(tradeId: string, tagName: string) {
  const trimmedName = tagName.trim();
  if (!trimmedName) return;

  // Find or create tag (case-insensitive lookup, preserve original casing)
  const allTags = await prisma.tag.findMany();
  let tag = allTags.find(
    (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
  ) ?? null;

  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: trimmedName },
    });
  }

  const existing = await prisma.tradeTag.findUnique({
    where: { tradeId_tagId: { tradeId, tagId: tag.id } },
  });

  if (!existing) {
    await prisma.tradeTag.create({
      data: { tradeId, tagId: tag.id },
    });
  }

  revalidatePath("/trades/" + tradeId);
  revalidatePath("/trades");
}

/**
 * Remove a tag from a single trade.
 */
export async function removeTagFromTrade(tradeId: string, tagId: string) {
  await prisma.tradeTag.delete({
    where: { tradeId_tagId: { tradeId, tagId } },
  });

  await cleanupOrphanedTags();

  revalidatePath("/trades/" + tradeId);
  revalidatePath("/trades");
}

/**
 * Delete a single trade.
 */
export async function deleteTrade(tradeId: string) {
  await prisma.trade.delete({
    where: { id: tradeId },
  });

  await cleanupOrphanedTags();

  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}
