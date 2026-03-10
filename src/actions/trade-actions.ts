"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Delete multiple trades by their IDs (cascade deletes executions, tags, screenshots).
 */
export async function bulkDeleteTrades(tradeIds: string[]) {
  if (tradeIds.length === 0) return;

  await prisma.trade.deleteMany({
    where: { id: { in: tradeIds } },
  });

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
  const normalizedName = tagName.trim().toLowerCase();
  if (!normalizedName || tradeIds.length === 0) return;

  // Find or create tag
  let tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: normalizedName },
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
  const normalizedName = tagName.trim().toLowerCase();
  if (!normalizedName) return;

  let tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: normalizedName },
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
  revalidatePath("/trades");
  revalidatePath("/");
  revalidatePath("/journal");
  revalidatePath("/calendar");
  revalidatePath("/reports");
}
