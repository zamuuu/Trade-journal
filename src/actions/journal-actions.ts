"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function saveDayNotes(date: string, notes: string) {
  if (!notes.trim()) {
    // If notes are empty, delete the DayNote if it exists
    const existing = await prisma.dayNote.findUnique({ where: { date } });
    if (existing) {
      await prisma.dayNote.delete({ where: { date } });
    }
    revalidatePath("/journal");
    return;
  }

  await prisma.dayNote.upsert({
    where: { date },
    update: { notes },
    create: { date, notes },
  });
  revalidatePath("/journal");
}

export async function addTagToDay(date: string, tagName: string) {
  const trimmedName = tagName.trim();
  if (!trimmedName) return;

  // Ensure DayNote exists
  let dayNote = await prisma.dayNote.findUnique({ where: { date } });
  if (!dayNote) {
    dayNote = await prisma.dayNote.create({
      data: { date, notes: "" },
    });
  }

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

  // Check if relation already exists
  const existing = await prisma.dayNoteTag.findUnique({
    where: {
      dayNoteId_tagId: {
        dayNoteId: dayNote.id,
        tagId: tag.id,
      },
    },
  });

  if (!existing) {
    await prisma.dayNoteTag.create({
      data: { dayNoteId: dayNote.id, tagId: tag.id },
    });
  }

  revalidatePath("/journal");
}

export async function removeTagFromDay(dayNoteId: string, tagId: string) {
  await prisma.dayNoteTag.delete({
    where: {
      dayNoteId_tagId: {
        dayNoteId,
        tagId,
      },
    },
  });
  revalidatePath("/journal");
}
