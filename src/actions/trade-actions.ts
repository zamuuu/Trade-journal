"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function updateTradeNotes(tradeId: string, notes: string) {
  await prisma.trade.update({
    where: { id: tradeId },
    data: { notes },
  });
  revalidatePath(`/trades/${tradeId}`);
}

export async function updateTradeSetup(tradeId: string, setup: string) {
  await prisma.trade.update({
    where: { id: tradeId },
    data: { setup: setup || null },
  });
  revalidatePath(`/trades/${tradeId}`);
}

export async function addTagToTrade(tradeId: string, tagName: string) {
  const normalizedName = tagName.trim().toLowerCase();
  if (!normalizedName) return;

  // Find or create tag
  let tag = await prisma.tag.findUnique({
    where: { name: normalizedName },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: { name: normalizedName },
    });
  }

  // Check if relation already exists
  const existing = await prisma.tradeTag.findUnique({
    where: {
      tradeId_tagId: {
        tradeId,
        tagId: tag.id,
      },
    },
  });

  if (!existing) {
    await prisma.tradeTag.create({
      data: { tradeId, tagId: tag.id },
    });
  }

  revalidatePath(`/trades/${tradeId}`);
}

export async function removeTagFromTrade(tradeId: string, tagId: string) {
  await prisma.tradeTag.delete({
    where: {
      tradeId_tagId: {
        tradeId,
        tagId,
      },
    },
  });
  revalidatePath(`/trades/${tradeId}`);
}

export async function deleteTrade(tradeId: string) {
  await prisma.trade.delete({
    where: { id: tradeId },
  });
  revalidatePath("/trades");
  revalidatePath("/");
}
