"use server";

import { prisma } from "@/lib/db";

const DEFAULT_ID = "default";

export async function getSettings() {
  let settings = await prisma.settings.findUnique({
    where: { id: DEFAULT_ID },
  });

  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: DEFAULT_ID, startingCapital: 0 },
    });
  }

  return settings;
}

export async function updateStartingCapital(capital: number) {
  await prisma.settings.upsert({
    where: { id: DEFAULT_ID },
    update: { startingCapital: capital },
    create: { id: DEFAULT_ID, startingCapital: capital },
  });
}
