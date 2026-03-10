"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";

const SCREENSHOTS_DIR = path.join(process.cwd(), "public", "screenshots");

export async function uploadScreenshot(
  tradeId: string,
  formData: FormData,
  category: string = "other"
) {
  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };

  // Ensure directory exists
  await mkdir(SCREENSHOTS_DIR, { recursive: true });

  // Generate unique filename
  const ext = path.extname(file.name) || ".png";
  const filename = `${tradeId}_${Date.now()}${ext}`;
  const filePath = path.join(SCREENSHOTS_DIR, filename);

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  // Save reference in DB
  const screenshot = await prisma.screenshot.create({
    data: {
      tradeId,
      filePath: `/screenshots/${filename}`,
      category,
    },
  });

  revalidatePath(`/trades/${tradeId}`);
  return { success: true, screenshot };
}

export async function deleteScreenshot(screenshotId: string) {
  const screenshot = await prisma.screenshot.findUnique({
    where: { id: screenshotId },
  });

  if (!screenshot) return { error: "Screenshot not found" };

  // Delete file from disk
  try {
    const fullPath = path.join(process.cwd(), "public", screenshot.filePath);
    await unlink(fullPath);
  } catch {
    // File might already be deleted, continue
  }

  // Delete from DB
  await prisma.screenshot.delete({
    where: { id: screenshotId },
  });

  revalidatePath(`/trades/${screenshot.tradeId}`);
  return { success: true };
}

export async function updateScreenshotCaption(
  screenshotId: string,
  caption: string
) {
  const screenshot = await prisma.screenshot.update({
    where: { id: screenshotId },
    data: { caption: caption || null },
  });

  revalidatePath(`/trades/${screenshot.tradeId}`);
  return { success: true };
}
