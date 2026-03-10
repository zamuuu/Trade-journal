"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { JournalDay } from "@/types";
import { DayCard } from "./day-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, parseISO } from "date-fns";

interface JournalViewProps {
  days: JournalDay[];
  currentPage: number;
  totalPages: number;
  filters: {
    symbol?: string;
    side?: string;
    tag?: string;
    date?: string;
  };
  allTags: { id: string; name: string }[];
  noteTemplates: { id: string; name: string; content: string }[];
}

export function JournalView({
  days,
  currentPage,
  totalPages,
  filters,
  allTags,
  noteTemplates,
}: JournalViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to page 1 on filter change
    router.push(`/journal?${params.toString()}`);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    router.push(`/journal?${params.toString()}`);
  }

  return (
    <div className="space-y-5">
      {/* Active date filter badge */}
      {filters.date && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Viewing:</span>
          <span className="font-semibold text-foreground">
            {format(parseISO(filters.date), "EEEE, MMMM d, yyyy")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("date");
              params.delete("page");
              router.push(`/journal?${params.toString()}`);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Symbol"
          defaultValue={filters.symbol ?? ""}
          className="w-[160px]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilter("symbol", (e.target as HTMLInputElement).value);
            }
          }}
          onBlur={(e) => {
            if (e.target.value !== (filters.symbol ?? "")) {
              updateFilter("symbol", e.target.value);
            }
          }}
        />

        <Select
          value={filters.side ?? "all"}
          onValueChange={(v) => updateFilter("side", v === "all" ? "" : v ?? "")}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Side" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sides</SelectItem>
            <SelectItem value="LONG">Long</SelectItem>
            <SelectItem value="SHORT">Short</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.tag ?? "all"}
          onValueChange={(v) => updateFilter("tag", v === "all" ? "" : v ?? "")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tags</SelectItem>
            {allTags.map((tag) => (
              <SelectItem key={tag.id} value={tag.name}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Day cards */}
      {days.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <p className="text-muted-foreground">No trading days found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              allTags={allTags}
              noteTemplates={noteTemplates}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
