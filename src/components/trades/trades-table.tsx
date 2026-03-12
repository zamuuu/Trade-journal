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
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRangeFilter } from "@/components/trades/date-range-filter";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  Trash2,
  Tag,
  Tags,
  GitMerge,
  Split,
} from "lucide-react";
import { useState, useMemo, useTransition, useEffect } from "react";
import {
  bulkDeleteTrades,
  bulkAddTagToTrades,
  bulkRemoveTagFromTrades,
  bulkMergeTrades,
  splitTrade,
  getAllTags,
  getTagsForTrades,
} from "@/actions/trade-actions";

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
  pageSize: number;
  totalCount: number;
  filters: { symbol?: string; side?: string; setup?: string; tag?: string; dateFrom?: string; dateTo?: string };
  setups: string[];
  allTags: { id: string; name: string }[];
}

const PAGE_SIZE_OPTIONS = [30, 60, 100, 200];

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
  pageSize,
  totalCount,
  filters,
  setups,
  allTags,
}: TradesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [symbolFilter, setSymbolFilter] = useState(filters.symbol ?? "");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ── Selection state ─────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Bulk action state ───────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [existingTags, setExistingTags] = useState<{ id: string; name: string }[]>([]);
  const [removeTagPopoverOpen, setRemoveTagPopoverOpen] = useState(false);
  const [selectedTradesTags, setSelectedTradesTags] = useState<{ id: string; name: string; count: number }[]>([]);
  const [tagIdsToRemove, setTagIdsToRemove] = useState<Set<string>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [splitResult, setSplitResult] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fetch existing tags when add-tag popover opens
  useEffect(() => {
    if (tagPopoverOpen) {
      getAllTags().then((tags) => setExistingTags(tags));
    }
  }, [tagPopoverOpen]);

  // Fetch tags for selected trades when remove-tag popover opens
  useEffect(() => {
    if (removeTagPopoverOpen && selected.size > 0) {
      getTagsForTrades(Array.from(selected)).then((tags) => {
        setSelectedTradesTags(tags);
        setTagIdsToRemove(new Set());
      });
    }
  }, [removeTagPopoverOpen, selected]);

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

  // ── Selection helpers ───────────────────────────────────────

  const allVisibleSelected =
    sortedTrades.length > 0 &&
    sortedTrades.every((t) => selected.has(t.id));

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      const next = new Set(selected);
      sortedTrades.forEach((t) => next.add(t.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      sortedTrades.forEach((t) => next.delete(t.id));
      setSelected(next);
    }
  }

  function toggleSelectOne(tradeId: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(tradeId);
    } else {
      next.delete(tradeId);
    }
    setSelected(next);
  }

  // ── Bulk actions ────────────────────────────────────────────

  function handleBulkDelete() {
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkDeleteTrades(ids);
      setSelected(new Set());
      setDeleteDialogOpen(false);
      router.refresh();
    });
  }

  function handleBulkAddTag() {
    if (!tagInput.trim()) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await bulkAddTagToTrades(ids, tagInput.trim());
      setSelected(new Set());
      setTagPopoverOpen(false);
      setTagInput("");
      router.refresh();
    });
  }

  function handleBulkRemoveTags() {
    if (tagIdsToRemove.size === 0) return;
    const tradeIds = Array.from(selected);
    const tagIds = Array.from(tagIdsToRemove);
    startTransition(async () => {
      await bulkRemoveTagFromTrades(tradeIds, tagIds);
      setSelected(new Set());
      setRemoveTagPopoverOpen(false);
      setTagIdsToRemove(new Set());
      router.refresh();
    });
  }

  // ── Merge helpers ────────────────────────────────────────────

  const selectedTrades = trades.filter((t) => selected.has(t.id));
  const selectedSymbols = new Set(selectedTrades.map((t) => t.symbol));
  const canMerge = selected.size >= 2 && selectedSymbols.size === 1;

  function openMergeDialog() {
    setMergeError(null);
    if (selected.size < 2) {
      setMergeError("Select at least 2 trades to merge.");
      setMergeDialogOpen(true);
      return;
    }
    if (selectedSymbols.size > 1) {
      setMergeError(
        `Cannot merge trades with different symbols: ${Array.from(selectedSymbols).join(", ")}`
      );
      setMergeDialogOpen(true);
      return;
    }
    setMergeDialogOpen(true);
  }

  function handleBulkMerge() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await bulkMergeTrades(ids);
      if (result.error) {
        setMergeError(result.error);
        return;
      }
      setSelected(new Set());
      setMergeDialogOpen(false);
      router.refresh();
    });
  }

  // ── Split helpers ─────────────────────────────────────────────

  function openSplitDialog() {
    setSplitError(null);
    setSplitResult(null);
    if (selected.size !== 1) {
      setSplitError("Select exactly 1 trade to split.");
      setSplitDialogOpen(true);
      return;
    }
    setSplitDialogOpen(true);
  }

  function handleSplit() {
    const tradeId = Array.from(selected)[0];
    startTransition(async () => {
      const result = await splitTrade(tradeId);
      if (result.error) {
        setSplitError(result.error);
        return;
      }
      setSplitResult(result.tradeIds?.length ?? 0);
      setSelected(new Set());
      setSplitDialogOpen(false);
      router.refresh();
    });
  }

  const splitTarget = selected.size === 1
    ? trades.find((t) => selected.has(t.id))
    : null;

  function toggleTagToRemove(tagId: string) {
    const next = new Set(tagIdsToRemove);
    if (next.has(tagId)) {
      next.delete(tagId);
    } else {
      next.add(tagId);
    }
    setTagIdsToRemove(next);
  }

  // ── Filters ─────────────────────────────────────────────────

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push("/trades?" + params.toString());
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push("/trades?" + params.toString());
  }

  function changePageSize(size: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (size === "30") {
      params.delete("pageSize");
    } else {
      params.set("pageSize", size);
    }
    params.set("page", "1");
    router.push("/trades?" + params.toString());
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
        className={
          "cursor-pointer select-none px-5 py-4 text-[13px] font-semibold tracking-wide text-muted-foreground transition-colors hover:text-foreground " +
          (align === "right" ? "text-right" : "text-left")
        }
        onClick={() => toggleSort(column)}
      >
        {label}
        <SortIcon column={column} activeKey={sortKey} activeDir={sortDir} />
      </TableHead>
    );
  }

  // ── Render ──────────────────────────────────────────────────

  const selectedCount = selected.size;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex items-center gap-3">
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
        {allTags.length > 0 && (
          <Select
            value={filters.tag ?? "all"}
            onValueChange={(v) => updateFilter("tag", v ?? "")}
          >
            <SelectTrigger className="h-9 w-40 border-border bg-card text-sm">
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {allTags.map((t) => (
                <SelectItem key={t.id} value={t.name}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DateRangeFilter
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          onChange={(from, to) => {
            const params = new URLSearchParams(searchParams.toString());
            if (from) params.set("dateFrom", from); else params.delete("dateFrom");
            if (to) params.set("dateTo", to); else params.delete("dateTo");
            params.set("page", "1");
            router.push("/trades?" + params.toString());
          }}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">Show</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => changePageSize(v ?? "30")}
          >
            <SelectTrigger className="h-9 w-[80px] border-border bg-card text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[13px] text-muted-foreground">trades</span>
        </div>
      </div>

      {/* Selection action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 rounded-md bg-muted/50 px-4 py-2.5">
          <span className="text-sm text-foreground">
            {selectedCount} trade{selectedCount !== 1 ? "s" : ""} selected
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Select action
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setTagPopoverOpen(true)}>
                <Tag className="mr-2 h-4 w-4" />
                Add Tag
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setRemoveTagPopoverOpen(true)}>
                <Tags className="mr-2 h-4 w-4" />
                Remove Tags
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={openMergeDialog}>
                <GitMerge className="mr-2 h-4 w-4" />
                Merge Trades
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openSplitDialog}>
                <Split className="mr-2 h-4 w-4" />
                Split Trade
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Trades
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Tag Popover */}
          <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
            <PopoverTrigger className="hidden" />
            <PopoverContent align="start" className="w-72 p-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Add tag to {selectedCount} trade{selectedCount !== 1 ? "s" : ""}
                </p>
                <Input
                  placeholder="Tag name..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBulkAddTag();
                    }
                  }}
                  className="h-9 text-sm"
                />
                {existingTags.length > 0 && (
                  <div className="max-h-32 space-y-1 overflow-y-auto">
                    <p className="text-xs text-muted-foreground">Existing tags:</p>
                    {existingTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className="block w-full rounded px-2 py-1 text-left text-sm text-foreground transition-colors hover:bg-muted"
                        onClick={() => setTagInput(tag.name)}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!tagInput.trim() || isPending}
                  onClick={handleBulkAddTag}
                >
                  {isPending ? "Adding..." : "Submit"}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Remove Tags Popover */}
          <Popover open={removeTagPopoverOpen} onOpenChange={setRemoveTagPopoverOpen}>
            <PopoverTrigger className="hidden" />
            <PopoverContent align="start" className="w-72 p-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Remove tags from {selectedCount} trade{selectedCount !== 1 ? "s" : ""}
                </p>
                {selectedTradesTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tags on selected trades.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {selectedTradesTags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                      >
                        <Checkbox
                          checked={tagIdsToRemove.has(tag.id)}
                          onCheckedChange={() => toggleTagToRemove(tag.id)}
                        />
                        <span className="flex-1 text-foreground">{tag.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {tag.count}/{selectedCount}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  disabled={tagIdsToRemove.size === 0 || isPending}
                  onClick={handleBulkRemoveTags}
                >
                  {isPending ? "Removing..." : "Remove " + tagIdsToRemove.size + " tag" + (tagIdsToRemove.size !== 1 ? "s" : "")}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selectedCount} trade{selectedCount !== 1 ? "s" : ""}?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the selected trades and all their
              executions, tags, and screenshots.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={handleBulkDelete}
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge confirmation dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mergeError ? "Cannot Merge" : `Merge ${selectedCount} trades?`}
            </DialogTitle>
            <DialogDescription>
              {mergeError ? (
                mergeError
              ) : (
                <>
                  This will combine {selectedCount} <strong>{Array.from(selectedSymbols)[0]}</strong> trades
                  into a single trade. All executions, screenshots, and tags will
                  be preserved. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {mergeError ? "OK" : "Cancel"}
            </DialogClose>
            {!mergeError && (
              <Button
                disabled={isPending || !canMerge}
                onClick={handleBulkMerge}
              >
                {isPending ? "Merging..." : "Merge"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Split confirmation dialog */}
      <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {splitError
                ? "Cannot Split"
                : `Split ${splitTarget?.symbol ?? ""} trade?`}
            </DialogTitle>
            <DialogDescription>
              {splitError ? (
                splitError
              ) : (
                <>
                  This will split the <strong>{splitTarget?.symbol}</strong> trade
                  into separate trades based on execution round-trips (each time
                  the position returns to zero). Tags, screenshots, notes, and
                  setup will be copied to all resulting trades. This action cannot
                  be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {splitError ? "OK" : "Cancel"}
            </DialogClose>
            {!splitError && (
              <Button
                disabled={isPending || selected.size !== 1}
                onClick={handleSplit}
              >
                {isPending ? "Splitting..." : "Split"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border bg-popover hover:bg-popover">
              <TableHead className="w-[40px] px-3 py-4">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(checked) =>
                    toggleSelectAll(checked as boolean)
                  }
                />
              </TableHead>
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
                  colSpan={10}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  No trades found.
                </TableCell>
              </TableRow>
            ) : (
              sortedTrades.map((trade) => {
                const isSelected = selected.has(trade.id);
                return (
                  <TableRow
                    key={trade.id}
                    className={
                      "cursor-pointer border-b border-border/40 transition-colors hover:bg-muted/40 " +
                      (isSelected ? "bg-primary/5" : "bg-card")
                    }
                    onClick={() => router.push("/trades/" + trade.id)}
                  >
                    <TableCell
                      className="w-[40px] px-3 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          toggleSelectOne(trade.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="px-5 py-4 font-mono text-[13px] tabular-nums text-muted-foreground">
                      {format(new Date(trade.entryDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-[13px] font-semibold">
                      {trade.symbol}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span
                        className={
                          "text-[13px] font-semibold " +
                          (trade.side === "LONG" ? "text-profit" : "text-loss")
                        }
                      >
                        {trade.side}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right font-mono text-[13px] tabular-nums">
                      {trade.totalQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right font-mono text-[13px] tabular-nums">
                      {"$"}{trade.avgEntryPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right font-mono text-[13px] tabular-nums">
                      {trade.avgExitPrice
                        ? <>{"$"}{trade.avgExitPrice.toFixed(2)}</>
                        : "--"}
                    </TableCell>
                    <TableCell
                      className={
                        "px-5 py-4 text-right font-mono text-[13px] font-semibold tabular-nums " +
                        (trade.pnl > 0
                          ? "text-profit"
                          : trade.pnl < 0
                            ? "text-loss"
                            : "text-flat")
                      }
                    >
                      {trade.pnl < 0 ? "-" : ""}{"$"}{Math.abs(trade.pnl).toFixed(2)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-[13px] text-muted-foreground">
                      {trade.setup ?? ""}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-[13px] text-muted-foreground">
                      {trade.tags.map((t) => t.name).join(", ")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {sortedTrades.length > 0 && (
            <TableFooter>
              <TableRow className="border-t border-border bg-popover hover:bg-popover">
                <TableCell className="w-[40px] px-3 py-3.5" />
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
                  className={
                    "px-5 py-3.5 text-right font-mono text-[13px] font-semibold tabular-nums " +
                    (totalPnl > 0
                      ? "text-profit"
                      : totalPnl < 0
                        ? "text-loss"
                        : "text-flat")
                  }
                >
                  {totalPnl < 0 ? "-" : ""}{"$"}{Math.abs(totalPnl).toFixed(2)}
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
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted-foreground">
            {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
          </span>
          <div className="flex items-center gap-2">
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
        </div>
      )}
    </div>
  );
}
