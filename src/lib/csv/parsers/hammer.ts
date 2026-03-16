import * as XLSX from "xlsx";
import { BrokerParser, NormalizedExecution } from "@/types";

/**
 * Parser for Hammer Pro detailed XLSX reports.
 *
 * The XLSX report is structured in sections per symbol (ticker). Each section:
 *   - Symbol name row (e.g. "AQST")
 *   - Empty row
 *   - Header row starting with "TIME"
 *   - Execution rows
 *   - Summary rows (Buy Stock, Sell Stock, Total Stock, etc.)
 *
 * The symbol is always located 2 rows above the "TIME" header row.
 *
 * Column layout (0-indexed):
 *   0: TIME        (e.g. "15:17:33")
 *   1: ORDER ID
 *   2: FILL ID
 *   3: ROUTE
 *   4: LIQ
 *   5: ACTION      (Buy / Sell / Sell short) — unlabeled in the header
 *   6: QTY
 *   7: PRICE
 *   8: POSITION
 *   9+: GROSS, COMM, fees, etc. (ignored)
 *
 * Valid ACTION values:
 *   "Buy"        -> BUY
 *   "Sell"       -> SELL
 *   "Sell short" -> SELL_SHORT
 *
 * IMPORTANT: The XLSX does NOT include a date per execution row — only TIME.
 * The user must provide the trade date via options.tradeDate (YYYY-MM-DD).
 *
 * Rows to skip (summary/info rows):
 *   Buy Stock, Sell Stock, Total Stock, Fee, Total, Adjustments,
 *   Daily Total, Description, Orders, Fills, Fees, Totals,
 *   and any row where ACTION is not one of the valid values.
 */

// Column indices
const COL_TIME = 0;
const COL_ACTION = 5;
const COL_QTY = 6;
const COL_PRICE = 7;

// Valid action values mapped to our normalized sides
const SIDE_MAP: Record<string, NormalizedExecution["side"]> = {
  Buy: "BUY",
  Sell: "SELL",
  "Sell short": "SELL_SHORT",
};

// First-column values that indicate non-execution rows
const SKIP_FIRST_COL = new Set([
  "Buy Stock",
  "Sell Stock",
  "Total Stock",
  "Fee",
  "Total",
  "Adjustments",
  "Daily Total",
  "Description",
  "Orders",
  "Fills",
  "Fees",
  "Totals",
  "Total Stock",
]);

export const hammerParser: BrokerParser = {
  name: "Hammer Pro",
  fileExtensions: [".xlsx"],
  extraFields: [
    { key: "tradeDate", label: "Trade Date for this import", type: "date" },
  ],

  // Required by interface but not used — Hammer uses parseBinary
  parse(): NormalizedExecution[] {
    return [];
  },

  parseBinary(
    buffer: ArrayBuffer,
    options?: Record<string, string>
  ): NormalizedExecution[] {
    const tradeDate = options?.tradeDate;
    if (!tradeDate) return [];

    // Parse the user-provided date (YYYY-MM-DD)
    const dateParts = tradeDate.split("-");
    if (dateParts.length !== 3) return [];
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // 0-indexed
    const day = parseInt(dateParts[2], 10);

    // Read the XLSX workbook
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];

    const sheet = wb.Sheets[sheetName];
    if (!sheet) return [];

    // Convert sheet to 2D array of raw cell values
    const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: true,
    });

    const executions: NormalizedExecution[] = [];
    let currentSymbol: string | null = null;
    let inExecutionSection = false;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) {
        // Empty row — don't reset inExecutionSection, could be between header
        // sections. The section ends when we hit summary rows.
        continue;
      }

      const firstCell = cellToString(row[0]);

      // Detect header row: first column is "TIME"
      if (firstCell === "TIME") {
        // Symbol is 2 rows above
        if (i >= 2) {
          const symbolRow = rows[i - 2];
          if (symbolRow && symbolRow[0] != null) {
            const sym = cellToString(symbolRow[0]);
            if (sym && !SKIP_FIRST_COL.has(sym) && isValidSymbol(sym)) {
              currentSymbol = sym.toUpperCase();
            }
          }
        }
        inExecutionSection = true;
        continue;
      }

      // Skip known non-execution rows
      if (firstCell && SKIP_FIRST_COL.has(firstCell)) {
        inExecutionSection = false;
        continue;
      }

      // Skip rows that start with "Cash:" (account balance summaries)
      if (firstCell && firstCell.startsWith("Cash:")) {
        inExecutionSection = false;
        continue;
      }

      // If we're not in an execution section, skip
      if (!inExecutionSection || !currentSymbol) continue;

      // Try to parse this row as an execution
      const action = cellToString(row[COL_ACTION]);
      if (!action) continue;

      const side = SIDE_MAP[action];
      if (!side) continue;

      // Extract time
      const timeValue = row[COL_TIME];
      const timeStr = parseTimeValue(timeValue);
      if (!timeStr) continue;

      // Extract quantity and price
      const qty = cellToNumber(row[COL_QTY]);
      const price = cellToNumber(row[COL_PRICE]);

      if (qty == null || price == null) continue;
      if (qty <= 0 || price <= 0) continue;

      // Build timestamp from user-provided date + parsed time
      const timestamp = buildTimestamp(year, month, day, timeStr);
      if (!timestamp) continue;

      executions.push({
        symbol: currentSymbol,
        side,
        quantity: qty,
        price,
        timestamp,
        rawData: {
          time: timeStr,
          symbol: currentSymbol,
          side: action,
          price: String(price),
          qty: String(qty),
        },
      });
    }

    return executions;
  },
};

/**
 * Convert a cell value to a trimmed string, or null if empty/undefined.
 */
function cellToString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * Convert a cell value to a number. SheetJS usually returns numbers directly,
 * but we handle string fallback too.
 */
function cellToNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }
  // Try parsing string (remove commas for formatted numbers like "1,080")
  const cleaned = String(value).replace(/,/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse a time value from a cell. SheetJS may return:
 * - A string like "15:17:33"
 * - A number representing an Excel serial time (fraction of a day)
 *
 * Returns "HH:MM:SS" string or null.
 */
function parseTimeValue(value: unknown): string | null {
  if (value == null) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    // Validate HH:MM:SS format
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    return null;
  }

  if (typeof value === "number") {
    // Excel serial time: fraction of 24 hours
    // e.g. 0.5 = 12:00:00, 0.75 = 18:00:00
    const totalSeconds = Math.round(value * 24 * 60 * 60);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return null;
}

/**
 * Build a Date from parsed components.
 */
function buildTimestamp(
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

/**
 * Basic check that a string looks like a stock ticker symbol.
 * Filters out date strings, numbers, and other non-symbol content.
 */
function isValidSymbol(s: string): boolean {
  // Stock symbols are typically 1-5 uppercase letters
  // Allow lowercase (we'll uppercase later) but filter obvious non-symbols
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return false; // Date like 02/02/2026
  if (/^\d+$/.test(s)) return false; // Pure numbers
  if (s.length > 10) return false; // Too long for a ticker
  // Must contain at least one letter
  return /[A-Za-z]/.test(s);
}
