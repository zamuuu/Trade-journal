"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
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

const RANGES = [
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
] as const;

export type DateRangeValue = (typeof RANGES)[number]["value"];

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

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(str?: string): Date | undefined {
  if (!str) return undefined;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = (searchParams.get("range") as DateRangeValue) || "all";
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const hasCustomRange = !!dateFrom || !!dateTo;

  const [open, setOpen] = useState(false);

  const initialRange: DateRange | undefined =
    dateFrom || dateTo
      ? { from: parseDate(dateFrom), to: parseDate(dateTo) ?? parseDate(dateFrom) }
      : undefined;

  const [draft, setDraft] = useState<DateRange | undefined>(initialRange);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);

  function navigate(params: URLSearchParams) {
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  // Handle preset button clicks (30D, 60D, 90D, All)
  function handleRangeChange(value: DateRangeValue) {
    if (!hasCustomRange && value === current) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      // Clear custom date params
      params.delete("dateFrom");
      params.delete("dateTo");
      if (value === "all") {
        params.delete("range");
      } else {
        params.set("range", value);
      }
      navigate(params);
    });
  }

  // Calendar popover handlers
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
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("range"); // Clear preset range
        params.set("dateFrom", formatDateISO(draft.from!));
        params.set("dateTo", draft.to ? formatDateISO(draft.to) : formatDateISO(draft.from!));
        navigate(params);
      });
    } else {
      handleClearCustom();
    }
    setOpen(false);
  }

  function handleCancel() {
    setOpen(false);
  }

  function handleClearCustom() {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("dateFrom");
      params.delete("dateTo");
      navigate(params);
    });
    setOpen(false);
  }

  // Display label for calendar trigger
  let triggerLabel = "Custom";
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
    <div
      className={`inline-flex items-center gap-1.5 transition-opacity ${isPending ? "opacity-60" : ""}`}
    >
      {/* Preset buttons */}
      <div className="inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5">
        {RANGES.map((range) => (
          <button
            key={range.value}
            onClick={() => handleRangeChange(range.value)}
            disabled={isPending}
            className={`rounded-sm px-2.5 py-1 text-[12px] font-medium tabular-nums transition-colors ${
              !hasCustomRange && current === range.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Calendar date picker */}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          className={cn(
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border px-3 text-[12px] font-medium transition-colors h-[30px] cursor-pointer",
            hasCustomRange
              ? "bg-card text-foreground shadow-sm"
              : "bg-muted/30 text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarIcon className="h-3 w-3" />
          <span>{triggerLabel}</span>
          {hasCustomRange && (
            <span
              role="button"
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              onClick={(e) => {
                e.stopPropagation();
                handleClearCustom();
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
    </div>
  );
}
