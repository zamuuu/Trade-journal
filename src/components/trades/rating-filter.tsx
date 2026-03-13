"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RatingMode = "gte" | "lte" | "between";

interface RatingFilterProps {
  ratingMin?: string;
  ratingMax?: string;
  onChange: (min: string | undefined, max: string | undefined) => void;
}

function getLabel(ratingMin?: string, ratingMax?: string): string {
  if (ratingMin && ratingMax) return `${ratingMin} - ${ratingMax}`;
  if (ratingMin) return `>= ${ratingMin}`;
  if (ratingMax) return `<= ${ratingMax}`;
  return "Rating";
}

function getInitialMode(ratingMin?: string, ratingMax?: string): RatingMode {
  if (ratingMin && ratingMax) return "between";
  if (ratingMax) return "lte";
  return "gte";
}

export function RatingFilter({ ratingMin, ratingMax, onChange }: RatingFilterProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<RatingMode>(() => getInitialMode(ratingMin, ratingMax));
  const [valA, setValA] = useState(ratingMin ?? "");
  const [valB, setValB] = useState(ratingMax ?? "");

  const hasFilter = !!(ratingMin || ratingMax);
  const label = getLabel(ratingMin, ratingMax);

  function handleApply() {
    const a = valA.trim();
    const b = valB.trim();

    let min: string | undefined;
    let max: string | undefined;

    if (mode === "gte" && a) {
      min = a;
    } else if (mode === "lte" && a) {
      max = a;
    } else if (mode === "between") {
      if (a) min = a;
      if (b) max = b;
    }

    onChange(min, max);
    setOpen(false);
  }

  function handleClear() {
    setValA("");
    setValB("");
    onChange(undefined, undefined);
    setOpen(false);
  }

  function handleModeChange(newMode: RatingMode) {
    setMode(newMode);
    setValA("");
    setValB("");
  }

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={
            "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors " +
            (hasFilter
              ? "border-primary/50 bg-primary/10 text-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground")
          }
        >
          <Star className="h-3.5 w-3.5" />
          {label}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Filter by Rating</p>

            <Select value={mode} onValueChange={(v) => handleModeChange(v as RatingMode)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gte">Greater than or equal</SelectItem>
                <SelectItem value="lte">Less than or equal</SelectItem>
                <SelectItem value="between">Between</SelectItem>
              </SelectContent>
            </Select>

            {mode === "between" ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="Min"
                  value={valA}
                  onChange={(e) => setValA(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
                  className="h-9 text-sm tabular-nums"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="Max"
                  value={valB}
                  onChange={(e) => setValB(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
                  className="h-9 text-sm tabular-nums"
                />
              </div>
            ) : (
              <Input
                type="number"
                min={1}
                max={100}
                placeholder={mode === "gte" ? "Min rating..." : "Max rating..."}
                value={valA}
                onChange={(e) => setValA(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleApply(); }}
                className="h-9 text-sm tabular-nums"
              />
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                disabled={mode === "between" ? !valA.trim() && !valB.trim() : !valA.trim()}
                onClick={handleApply}
              >
                Apply
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasFilter && (
        <button
          onClick={handleClear}
          className="flex h-9 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
