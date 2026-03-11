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

// ── Single-trade actions (used by trade detail page) ────────────

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
