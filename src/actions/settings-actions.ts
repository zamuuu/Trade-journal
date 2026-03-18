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

/* ------------------------------------------------------------------ */
/*  Export trades to CSV                                                */
/* ------------------------------------------------------------------ */

export async function exportTradesCSV(): Promise<{ csv: string; count: number }> {
  const trades = await prisma.trade.findMany({
    orderBy: { entryDate: "asc" },
    include: {
      tags: { include: { tag: true } },
    },
  });

  if (trades.length === 0) {
    return { csv: "", count: 0 };
  }

  const headers = [
    "Symbol",
    "Side",
    "Status",
    "Entry Date",
    "Exit Date",
    "Entry Price",
    "Exit Price",
    "Quantity",
    "PnL",
    "Setup",
    "Rating",
    "Tags",
    "Notes",
  ];

  function escapeCSV(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  function formatDate(date: Date | null): string {
    if (!date) return "";
    return date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
  }

  const rows = trades.map((trade) => [
    escapeCSV(trade.symbol),
    escapeCSV(trade.side),
    escapeCSV(trade.status),
    escapeCSV(formatDate(trade.entryDate)),
    escapeCSV(formatDate(trade.exitDate)),
    trade.avgEntryPrice.toFixed(4),
    trade.avgExitPrice != null ? trade.avgExitPrice.toFixed(4) : "",
    trade.totalQuantity.toString(),
    trade.pnl.toFixed(2),
    escapeCSV(trade.setup ?? ""),
    trade.rating != null ? trade.rating.toString() : "",
    escapeCSV(trade.tags.map((t) => t.tag.name).join("; ")),
    escapeCSV((trade.notes ?? "").replace(/\n/g, " ")),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return { csv, count: trades.length };
}
