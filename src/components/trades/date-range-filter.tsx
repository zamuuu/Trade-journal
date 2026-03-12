"use client";

import { useState, useCallback } from "react";
import { CalendarIcon, X } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, subYears } from "date-fns";
import { type DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  dateFrom?: string;   // "YYYY-MM-DD"
  dateTo?: string;     // "YYYY-MM-DD"
  onChange: (from: string | undefined, to: string | undefined) => void;
}

type PresetKey =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "last12Months"
  | "lastYear"
  | "ytd";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 Days" },
  { key: "last30", label: "Last 30 Days" },
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "last12Months", label: "Last 12 Months" },
  { key: "lastYear", label: "Last Year" },
  { key: "ytd", label: "YTD" },
];

function getPresetRange(key: PresetKey): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (key) {
    case "today":
      return { from: today, to: today };
    case "yesterday": {
      const d = subDays(today, 1);
      return { from: d, to: d };
    }
    case "last7":
      return { from: subDays(today, 6), to: today };
    case "last30":
      return { from: subDays(today, 29), to: today };
    case "thisMonth":
      return { from: startOfMonth(today), to: today };
    case "lastMonth": {
      const prev = subMonths(today, 1);
      return { from: startOfMonth(prev), to: endOfMonth(prev) };
    }
    case "last12Months":
      return { from: subMonths(today, 12), to: today };
    case "lastYear": {
      const ly = subYears(today, 1);
      return { from: startOfYear(ly), to: new Date(ly.getFullYear(), 11, 31) };
    }
    case "ytd":
      return { from: startOfYear(today), to: today };
  }
}

function parseDate(str?: string): Date | undefined {
  if (!str) return undefined;
  // "YYYY-MM-DD" → local date (avoid timezone shift)
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DateRangeFilter({ dateFrom, dateTo, onChange }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);

  // Draft state while the popover is open (not applied until "Apply")
  const initialRange: DateRange | undefined =
    dateFrom || dateTo
      ? { from: parseDate(dateFrom), to: parseDate(dateTo) ?? parseDate(dateFrom) }
      : undefined;

  const [draft, setDraft] = useState<DateRange | undefined>(initialRange);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  // When popover opens, reset draft to current applied values
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        const range: DateRange | undefined =
          dateFrom || dateTo
            ? { from: parseDate(dateFrom), to: parseDate(dateTo) ?? parseDate(dateFrom) }
            : undefined;
        setDraft(range);
        setActivePreset(null);
      }
      setOpen(nextOpen);
    },
    [dateFrom, dateTo]
  );

  function handlePreset(key: PresetKey) {
    setDraft(getPresetRange(key));
    setActivePreset(key);
  }

  function handleApply() {
    if (draft?.from) {
      onChange(
        formatDateISO(draft.from),
        draft.to ? formatDateISO(draft.to) : formatDateISO(draft.from)
      );
    } else {
      onChange(undefined, undefined);
    }
    setOpen(false);
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleClear() {
    onChange(undefined, undefined);
    setOpen(false);
  }

  // Display label for the trigger button
  const hasFilter = dateFrom || dateTo;
  let triggerLabel = "From - To";
  if (dateFrom && dateTo) {
    if (dateFrom === dateTo) {
      triggerLabel = format(parseDate(dateFrom)!, "MMM d, yyyy");
    } else {
      triggerLabel = `${format(parseDate(dateFrom)!, "MMM d")} - ${format(parseDate(dateTo)!, "MMM d, yyyy")}`;
    }
  } else if (dateFrom) {
    triggerLabel = `From ${format(parseDate(dateFrom)!, "MMM d, yyyy")}`;
  }

  // Draft display
  let draftLabel = "";
  if (draft?.from && draft?.to) {
    draftLabel = `${format(draft.from, "MMM/dd/yy")} - ${format(draft.to, "MMM/dd/yy")}`;
  } else if (draft?.from) {
    draftLabel = format(draft.from, "MMM/dd/yy");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-3 text-sm font-normal shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground h-9 cursor-pointer",
          hasFilter ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <CalendarIcon className="h-3.5 w-3.5" />
        <span>{triggerLabel}</span>
        {hasFilter && (
          <span
            role="button"
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 border-border"
        align="start"
        sideOffset={8}
      >
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col border-r border-border p-2 min-w-[140px]">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-[13px] transition-colors",
                  activePreset === p.key
                    ? "bg-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar + footer */}
          <div className="flex flex-col">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={(range) => {
                setDraft(range);
                setActivePreset(null);
              }}
              numberOfMonths={2}
              showOutsideDays
              className="p-3"
            />

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-[13px] text-muted-foreground">
                {draftLabel || "Select a date range"}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleApply}
                  disabled={!draft?.from}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
