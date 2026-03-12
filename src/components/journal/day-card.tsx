"use client";

import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import {
  Save,
  Plus,
  X,
  Loader2,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { JournalDay } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  saveDayNotes,
  addTagToDay,
  removeTagFromDay,
} from "@/actions/journal-actions";
import { cn } from "@/lib/utils";

interface DayCardProps {
  day: JournalDay;
  allTags: { id: string; name: string }[];
  noteTemplates: { id: string; name: string; content: string }[];
}

export function DayCard({ day, allTags, noteTemplates }: DayCardProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(day.notes ?? "");
  const [notesDirty, setNotesDirty] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [tradesExpanded, setTradesExpanded] = useState(true);
  const [tagSuggestions, setTagSuggestions] = useState<
    { id: string; name: string }[]
  >([]);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  const dateObj = parseISO(day.date);
  const formattedDate = format(dateObj, "EEE, MMM d, yyyy");

  const pnlColor =
    day.netPnl > 0 ? "text-profit" : day.netPnl < 0 ? "text-loss" : "text-flat";
  const pnlPrefix = day.netPnl > 0 ? "+" : "";

  async function handleSaveNotes() {
    setSavingNotes(true);
    try {
      await saveDayNotes(day.date, notes);
      setNotesDirty(false);
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleAddTag(tagName: string) {
    if (!tagName.trim()) return;
    setAddingTag(true);
    try {
      await addTagToDay(day.date, tagName);
      setTagInput("");
      setShowTagInput(false);
      setTagSuggestions([]);
    } finally {
      setAddingTag(false);
    }
  }

  async function handleRemoveTag(tagId: string) {
    if (!day.dayNoteId) return;
    await removeTagFromDay(day.dayNoteId, tagId);
  }

  function handleTagInputChange(value: string) {
    setTagInput(value);
    if (value.trim()) {
      const filtered = allTags.filter(
        (t) =>
          t.name.includes(value.toLowerCase()) &&
          !day.tags.some((dt) => dt.id === t.id)
      );
      setTagSuggestions(filtered.slice(0, 5));
    } else {
      setTagSuggestions([]);
    }
  }

  function handleApplyTemplate(content: string) {
    setNotes((prev) => (prev ? prev + "\n\n" + content : content));
    setNotesDirty(true);
    setShowTemplateMenu(false);
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">
            {formattedDate}
          </h2>
          {day.totalTrades > 0 && (
            <span className="text-sm text-muted-foreground">
              {day.totalTrades} trade{day.totalTrades !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {day.tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 text-xs"
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {showTagInput ? (
            <div className="relative">
              <Input
                ref={tagInputRef}
                value={tagInput}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTag(tagInput);
                  if (e.key === "Escape") {
                    setShowTagInput(false);
                    setTagInput("");
                    setTagSuggestions([]);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowTagInput(false);
                    setTagInput("");
                    setTagSuggestions([]);
                  }, 200);
                }}
                placeholder="Add tag..."
                className="h-7 w-[120px] text-xs"
                autoFocus
                disabled={addingTag}
              />
              {tagSuggestions.length > 0 && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border border-border bg-popover py-1 shadow-md">
                  {tagSuggestions.map((s) => (
                    <button
                      key={s.id}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent"
                      onMouseDown={() => handleAddTag(s.name)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowTagInput(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Add tag"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <span
            className={cn(
              "text-sm font-semibold font-tabular",
              pnlColor
            )}
          >
            P&amp;L: {pnlPrefix}${Math.abs(day.netPnl).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Metrics */}
      {day.totalTrades > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border">
          <MetricBlock label="Total Trades" value={day.totalTrades.toString()} />
          <MetricBlock
            label="Win %"
            value={`${day.winRate.toFixed(1)}%`}
          />
          <MetricBlock
            label="Net P&L"
            value={`${pnlPrefix}$${Math.abs(day.netPnl).toFixed(2)}`}
            valueClass={pnlColor}
          />
          <MetricBlock
            label="Total Volume"
            value={day.totalVolume.toLocaleString()}
          />
          <MetricBlock
            label="Largest Win"
            value={day.largestWin > 0 ? `+$${day.largestWin.toFixed(2)}` : "$0.00"}
            valueClass={day.largestWin > 0 ? "text-profit" : "text-flat"}
          />
          <MetricBlock
            label="Largest Loss"
            value={day.largestLoss < 0 ? `-$${Math.abs(day.largestLoss).toFixed(2)}` : "$0.00"}
            valueClass={day.largestLoss < 0 ? "text-loss" : "text-flat"}
          />
        </div>
      )}

      {/* Notes */}
      <div className="px-6 py-4 space-y-2 border-b border-border">
        <Textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          placeholder="Click here to start typing your notes..."
          className="min-h-[80px] resize-y bg-input/50 border-border text-sm"
        />
        <div className="flex items-center justify-end gap-2">
          {noteTemplates.length > 0 && (
            <div className="relative" ref={templateMenuRef}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Insert template
              </Button>
              {showTemplateMenu && (
                <div className="absolute bottom-full right-0 z-10 mb-1 w-48 rounded-md border border-border bg-popover py-1 shadow-md">
                  {noteTemplates.map((t) => (
                    <button
                      key={t.id}
                      className="w-full px-3 py-1.5 text-left text-xs hover:bg-accent"
                      onClick={() => handleApplyTemplate(t.content)}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {notesDirty && (
            <Button
              size="sm"
              className="text-xs"
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save notes
            </Button>
          )}
        </div>
      </div>

      {/* Trades Table */}
      {day.trades.length > 0 && (
        <div>
          <button
            onClick={() => setTradesExpanded(!tradesExpanded)}
            className="flex w-full items-center justify-between px-6 py-3 text-sm text-muted-foreground hover:bg-accent/30 transition-colors"
          >
            <span>
              {day.trades.length} trade{day.trades.length !== 1 ? "s" : ""} this day
            </span>
            {tradesExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {tradesExpanded && (
            <div className="relative max-h-[232px] overflow-y-auto">
            <Table className="table-fixed">
              <colgroup><col className="w-[12%]" /><col className="w-[12%]" /><col className="w-[10%]" /><col className="w-[10%]" /><col className="w-[8%]" /><col className="w-[12%]" /><col className="w-[18%]" /><col className="w-[18%]" /></colgroup>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-6 text-xs">Time</TableHead>
                  <TableHead className="text-xs">Symbol</TableHead>
                  <TableHead className="text-xs">Side</TableHead>
                  <TableHead className="text-xs text-right">Volume</TableHead>
                  <TableHead className="text-xs text-right">Execs</TableHead>
                  <TableHead className="text-xs text-right">P&amp;L</TableHead>
                  <TableHead className="text-xs">Setup</TableHead>
                  <TableHead className="pr-6 text-xs">Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {day.trades.map((trade) => {
                  const tradePnlColor =
                    trade.pnl > 0
                      ? "text-profit"
                      : trade.pnl < 0
                        ? "text-loss"
                        : "text-flat";
                  const tradePnlPrefix = trade.pnl > 0 ? "+" : "";
                  return (
                    <TableRow
                      key={trade.id}
                      className="cursor-pointer border-border hover:bg-accent/40"
                      onClick={() => router.push(`/trades/${trade.id}`)}
                    >
                      <TableCell className="pl-6 text-xs font-tabular text-muted-foreground">
                        {format(new Date(trade.entryDate), "HH:mm:ss")}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {trade.symbol}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium",
                            trade.side === "LONG"
                              ? "bg-profit/15 text-profit"
                              : "bg-loss/15 text-loss"
                          )}
                        >
                          {trade.side}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-right font-tabular">
                        {trade.totalQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-right font-tabular">
                        {trade.executionCount}
                      </TableCell>
                       <TableCell
                        className={cn(
                          "text-xs text-right font-semibold font-tabular",
                          tradePnlColor
                        )}
                      >
                        {tradePnlPrefix}${Math.abs(trade.pnl).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {trade.setup ?? ""}
                      </TableCell>
                      <TableCell className="pr-6">
                        <div className="flex gap-1 flex-wrap">
                          {trade.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricBlock({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-card px-5 py-3 text-center">
      <p className={cn("text-lg font-semibold font-tabular", valueClass)}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
