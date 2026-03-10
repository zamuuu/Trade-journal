"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useState, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────

interface Trade {
  id: string;
  symbol: string;
  side: string;
  status: string;
  entryDate: Date;
  exitDate: Date | null;
  totalQuantity: number;
  avgEntryPrice: number;
  avgExitPrice: number | null;
  pnl: number;
  setup: string | null;
  tags: { id: string; name: string }[];
}

interface TradesTableProps {
  trades: Trade[];
  currentPage: number;
  totalPages: number;
  filters: { symbol?: string; side?: string; setup?: string };
  setups: string[];
}

type SortKey =
  | "date"
  | "symbol"
  | "side"
  | "volume"
  | "entry"
  | "exit"
  | "pnl"
  | "setup";
type SortDir = "asc" | "desc";

// ─── Sort icon helper ────────────────────────────────────────────

function SortIcon({
  column,
  activeKey,
  activeDir,
}: {
  column: SortKey;
  activeKey: SortKey | null;
  activeDir: SortDir;
}) {
  if (activeKey !== column) return null;
  return activeDir === "asc" ? (
    <ArrowUp className="ml-1 inline h-3 w-3 text-foreground" />
  ) : (
    <ArrowDown className="ml-1 inline h-3 w-3 text-foreground" />
  );
}

// ─── Component ───────────────────────────────────────────────────

export function TradesTable({
  trades,
  currentPage,
  totalPages,
  filters,
  setups,
}: TradesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [symbolFilter, setSymbolFilter] = useState(filters.symbol ?? "");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Sorting ─────────────────────────────────────────────────

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
  }

  const sortedTrades = useMemo(() => {
    if (!sortKey) return trades;
    const sorted = [...trades].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "date":
          cmp =
            new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
          break;
        case "symbol":
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case "side":
          cmp = a.side.localeCompare(b.side);
          break;
        case "volume":
          cmp = a.totalQuantity - b.totalQuantity;
          break;
        case "entry":
          cmp = a.avgEntryPrice - b.avgEntryPrice;
          break;
        case "exit":
          cmp = (a.avgExitPrice ?? 0) - (b.avgExitPrice ?? 0);
          break;
        case "pnl":
          cmp = a.pnl - b.pnl;
          break;
        case "setup":
          cmp = (a.setup ?? "").localeCompare(b.setup ?? "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [trades, sortKey, sortDir]);

  // ── Totals ──────────────────────────────────────────────────

  const totalVolume = trades.reduce((sum, t) => sum + t.totalQuantity, 0);
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

  // ── Filters ─────────────────────────────────────────────────

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/trades?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/trades?${params.toString()}`);
  }

  // ── Header button helper ────────────────────────────────────

  function SortableHead({
    column,
    label,
    align = "left",
  }: {
    column: SortKey;
    label: string;
    align?: "left" | "right";
  }) {
    return (
      <TableHead
        className={`cursor-pointer select-none px-5 py-4 text-[13px] font-semibold tracking-wide text-muted-foreground transition-colors hover:text-foreground ${
          align === "right" ? "text-right" : "text-left"
        }`}
        onClick={() => toggleSort(column)}
      >
        {label}
        <SortIcon column={column} activeKey={sortKey} activeDir={sortDir} />
      </TableHead>
    );
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Symbol..."
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") updateFilter("symbol", symbolFilter);
          }}
          onBlur={() => updateFilter("symbol", symbolFilter)}
          className="h-9 w-40 border-border bg-card text-sm"
        />
        <Select
          value={filters.side ?? "all"}
          onValueChange={(v) => updateFilter("side", v ?? "")}
        >
          <SelectTrigger className="h-9 w-32 border-border bg-card text-sm">
            <SelectValue placeholder="Side" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sides</SelectItem>
            <SelectItem value="LONG">Long</SelectItem>
            <SelectItem value="SHORT">Short</SelectItem>
          </SelectContent>
        </Select>
        {setups.length > 0 && (
          <Select
            value={filters.setup ?? "all"}
            onValueChange={(v) => updateFilter("setup", v ?? "")}
          >
            <SelectTrigger className="h-9 w-40 border-border bg-card text-sm">
              <SelectValue placeholder="Setup" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All setups</SelectItem>
              {setups.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-popover hover:bg-popover">
              <SortableHead column="date" label="Date" />
              <SortableHead column="symbol" label="Symbol" />
              <SortableHead column="side" label="Side" />
              <SortableHead column="volume" label="Volume" align="right" />
              <SortableHead column="entry" label="Entry" align="right" />
              <SortableHead column="exit" label="Exit" align="right" />
              <SortableHead column="pnl" label="P&L" align="right" />
              <SortableHead column="setup" label="Setup" />
              <TableHead className="px-5 py-4 text-[13px] font-semibold tracking-wide text-muted-foreground">
                Tags
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTrades.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No trades found.
                </TableCell>
              </TableRow>
            ) : (
              sortedTrades.map((trade) => (
                <TableRow
                  key={trade.id}
                  className="cursor-pointer border-b border-border/40 bg-card transition-colors hover:bg-muted/40"
                  onClick={() => router.push(`/trades/${trade.id}`)}
                >
                  <TableCell className="px-5 py-4 font-mono text-[13px] tabular-nums text-muted-foreground">
                    {format(new Date(trade.entryDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-[13px] font-semibold">
                    {trade.symbol}
                  </TableCell>
                  <TableCell className="px-5 py-4">
                    <span
                      className={`text-[13px] font-semibold ${trade.side === "LONG" ? "text-profit" : "text-loss"}`}
                    >
                      {trade.side}
                    </span>
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-mono text-[13px] tabular-nums">
                    {trade.totalQuantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-mono text-[13px] tabular-nums">
                    ${trade.avgEntryPrice.toFixed(2)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-mono text-[13px] tabular-nums">
                    {trade.avgExitPrice
                      ? `$${trade.avgExitPrice.toFixed(2)}`
                      : "--"}
                  </TableCell>
                  <TableCell
                    className={`px-5 py-4 text-right font-mono text-[13px] font-semibold tabular-nums ${
                      trade.pnl > 0
                        ? "text-profit"
                        : trade.pnl < 0
                          ? "text-loss"
                          : "text-flat"
                    }`}
                  >
                    ${trade.pnl < 0 ? "-" : ""}
                    {Math.abs(trade.pnl).toFixed(2)}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-[13px] text-muted-foreground">
                    {trade.setup ?? ""}
                  </TableCell>
                  <TableCell className="px-5 py-4 text-[13px] text-muted-foreground">
                    {trade.tags.map((t) => t.name).join(", ")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {sortedTrades.length > 0 && (
            <TableFooter>
              <TableRow className="border-t border-border bg-popover hover:bg-popover">
                <TableCell className="px-5 py-3.5 text-[13px] font-semibold tracking-wide text-muted-foreground">
                  TOTAL:
                </TableCell>
                <TableCell className="px-5 py-3.5 text-[13px] font-semibold text-muted-foreground">
                  {trades.length} trade{trades.length !== 1 ? "s" : ""}
                </TableCell>
                <TableCell />
                <TableCell className="px-5 py-3.5 text-right font-mono text-[13px] font-semibold tabular-nums text-muted-foreground">
                  {totalVolume.toLocaleString()}
                </TableCell>
                <TableCell />
                <TableCell />
                <TableCell
                  className={`px-5 py-3.5 text-right font-mono text-[13px] font-semibold tabular-nums ${
                    totalPnl > 0
                      ? "text-profit"
                      : totalPnl < 0
                        ? "text-loss"
                        : "text-flat"
                  }`}
                >
                  ${totalPnl < 0 ? "-" : ""}{Math.abs(totalPnl).toFixed(2)}
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[13px] text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => goToPage(currentPage + 1)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
