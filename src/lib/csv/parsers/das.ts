import { BrokerParser, NormalizedExecution } from "@/types";

/**
 * Parser for DAS Trader Pro CSV exports.
 *
 * Expected format (CSV with header row, trailing comma):
 *   Time,Symbol,Side,Price,Qty,LiqType,Route,Broker,Account,Type,Cloid,ECNFee,P / L,SecType,BP,Value,P/L R,
 *
 * Example row:
 *   17:43:25,ISPC,B,0.3671,100,3,EDGA,,ZIMDASTEUIE,Margin,S2603120101047,0,3.79,Equity/ETF,40.5,36.71,0.08R,
 *
 * Side values:
 *   B   -> BUY
 *   S   -> SELL
 *   SS  -> SELL_SHORT
 *
 * IMPORTANT: DAS exports do NOT include a date column. The trade date must
 * be provided by the user via options.tradeDate (YYYY-MM-DD format).
 * The parser combines this date with the Time column to build timestamps.
 *
 * Columns used: Time (0), Symbol (1), Side (2), Price (3), Qty (4)
 * All other columns are ignored.
 */
export const dasParser: BrokerParser = {
  name: "DAS Trader Pro",
  fileExtensions: [".csv"],
  extraFields: [
    { key: "tradeDate", label: "Trade Date for this import", type: "date" },
  ],

  parse(content: string, options?: Record<string, string>): NormalizedExecution[] {
    const tradeDate = options?.tradeDate;
    if (!tradeDate) return [];

    // Parse the user-provided date (YYYY-MM-DD)
    const dateParts = tradeDate.split("-");
    if (dateParts.length !== 3) return [];
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
    const day = parseInt(dateParts[2], 10);

    const executions: NormalizedExecution[] = [];
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    // Skip header row
    const dataLines = lines.slice(1);

    for (const line of dataLines) {
      const parts = line.split(",").map((p) => p.trim());

      // We need at least 5 fields: Time, Symbol, Side, Price, Qty
      if (parts.length < 5) continue;

      const [timeStr, symbol, sideRaw, priceStr, qtyStr] = parts;

      // Parse side
      const side = parseSide(sideRaw);
      if (!side) continue;

      // Parse time (HH:MM:SS)
      const timestamp = parseTimestamp(year, month, day, timeStr);
      if (!timestamp) continue;

      const quantity = parseInt(qtyStr, 10);
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
          time: timeStr,
          symbol,
          side: sideRaw,
          price: priceStr,
          qty: qtyStr,
        },
      });
    }

    return executions;
  },
};

function parseSide(raw: string): NormalizedExecution["side"] | null {
  const normalized = raw.toUpperCase().trim();
  if (normalized === "B") return "BUY";
  if (normalized === "S") return "SELL";
  if (normalized === "SS") return "SELL_SHORT";
  return null;
}

function parseTimestamp(
  year: number,
  month: number,
  day: number,
  timeStr: string
): Date | null {
  const timeParts = timeStr.split(":");
  if (timeParts.length !== 3) return null;

  const [hh, mm, ss] = timeParts;
  const date = new Date(
    year,
    month,
    day,
    parseInt(hh, 10),
    parseInt(mm, 10),
    parseInt(ss, 10)
  );

  if (isNaN(date.getTime())) return null;
  return date;
}
