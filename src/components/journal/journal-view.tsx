"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { JournalDay } from "@/types";
import { DayCard } from "./day-card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { format, parseISO } from "date-fns";

interface JournalViewProps {
  days: JournalDay[];
  currentPage: number;
  totalPages: number;
  filters: {
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
