import { BrokerParser, NormalizedExecution } from "@/types";

/**
 * Parser for Sterling Trader Pro TXT exports.
 *
 * Expected format (no headers, comma-delimited, trailing comma):
 *   date,time,symbol,quantity,price,side,
 *
 * Example:
 *   03/09/26,09:32:28,BATL,100,23.07,SLD SHRT,
 *
 * Side values:
 *   BOT       → BUY
 *   SLD       → SELL
 *   SLD SHRT  → SELL_SHORT
 *
 * Encoding: UTF-16 (auto-detected) or UTF-8.
 */
export const sterlingParser: BrokerParser = {
  name: "Sterling Trader Pro",
  fileExtensions: [".txt", ".csv"],

  parse(content: string): NormalizedExecution[] {
    const executions: NormalizedExecution[] = [];
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      // Split by comma and remove empty trailing element
      const parts = line.split(",").map((p) => p.trim());

      // We expect at least 6 fields: date, time, symbol, quantity, price, side
      if (parts.length < 6) continue;

      const [dateStr, timeStr, symbol, quantityStr, priceStr, sideRaw] = parts;

      // Parse side
      const side = parseSide(sideRaw);
      if (!side) continue;

      // Parse date: MM/DD/YY
      const timestamp = parseTimestamp(dateStr, timeStr);
      if (!timestamp) continue;

      const quantity = parseInt(quantityStr, 10);
      const price = parseFloat(priceStr);

      if (isNaN(quantity) || isNaN(price)) continue;
      if (quantity <= 0 || price <= 0) continue;

      executions.push({
        symbol: symbol.toUpperCase(),
        side,
        quantity,
        price,
        timestamp,
        rawData: {
          date: dateStr,
          time: timeStr,
          symbol,
          quantity: quantityStr,
          price: priceStr,
          side: sideRaw,
        },
      });
    }

    return executions;
  },
};

function parseSide(raw: string): NormalizedExecution["side"] | null {
  const normalized = raw.toUpperCase().trim();
  if (normalized === "BOT") return "BUY";
  if (normalized === "SLD") return "SELL";
  if (normalized === "SLD SHRT") return "SELL_SHORT";
  return null;
}

function parseTimestamp(dateStr: string, timeStr: string): Date | null {
  // Format: MM/DD/YY and HH:MM:SS
  const dateParts = dateStr.split("/");
  if (dateParts.length !== 3) return null;

  const [mm, dd, yy] = dateParts;
  const year = parseInt(yy, 10) + 2000; // 26 → 2026
  const month = parseInt(mm, 10) - 1; // 0-indexed
  const day = parseInt(dd, 10);

  const timeParts = timeStr.split(":");
  if (timeParts.length !== 3) return null;

  const [hh, min, ss] = timeParts;

  const date = new Date(
    year,
    month,
    day,
    parseInt(hh, 10),
    parseInt(min, 10),
    parseInt(ss, 10)
  );

  if (isNaN(date.getTime())) return null;
  return date;
}
