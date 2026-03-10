"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function getNoteTemplates() {
  return prisma.noteTemplate.findMany({
    orderBy: { name: "asc" },
  });
}

export async function createNoteTemplate(name: string, content: string) {
  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Template name is required" };

  const existing = await prisma.noteTemplate.findUnique({
    where: { name: trimmedName },
  });
  if (existing) return { error: "A template with this name already exists" };

  const template = await prisma.noteTemplate.create({
    data: { name: trimmedName, content },
  });

  revalidatePath("/trades");
  return { success: true, template };
}

export async function updateNoteTemplate(id: string, name: string, content: string) {
  const template = await prisma.noteTemplate.update({
    where: { id },
    data: { name: name.trim(), content },
  });

  revalidatePath("/trades");
  return { success: true, template };
}

export async function deleteNoteTemplate(id: string) {
  await prisma.noteTemplate.delete({
    where: { id },
  });

  revalidatePath("/trades");
  return { success: true };
}
