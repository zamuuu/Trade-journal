"use client";

import { useRouter } from "next/navigation";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DayData {
  pnl: number;
  tradeCount: number;
  trades: {
    id: string;
    symbol: string;
    side: string;
    entryDate: string;
    pnl: number;
    totalQuantity: number;
  }[];
}

interface CalendarViewProps {
  year: number;
  month: number | null; // null = year overview, 1-12 = expanded month
  dayData: Record<string, DayData>;
}

// ─── YEAR OVERVIEW ───────────────────────────────────────────────

function MiniMonth({
  year,
  monthIndex,
  dayData,
  onOpen,
  onDayClick,
}: {
  year: number;
  monthIndex: number; // 0-11
  dayData: Record<string, DayData>;
  onOpen: () => void;
  onDayClick: (dateKey: string) => void;
}) {
  const date = new Date(year, monthIndex, 1);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  return (
    <div className="rounded-lg border border-border bg-card px-4 pb-3.5 pt-3">
      {/* Month header + Open button */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[15px] font-semibold text-foreground">
          {format(date, "MMMM, yyyy")}
        </span>
        <button
          onClick={onOpen}
          className="rounded-md border border-border bg-accent px-3.5 py-1 text-[12px] font-medium text-foreground transition-colors hover:bg-accent/70"
        >
          Open
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-[3px]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="py-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="flex flex-col gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-[3px]">
            {week.map((d, di) => {
              const dayKey = format(d, "yyyy-MM-dd");
              const data = dayData[dayKey];
              const inMonth = isSameMonth(d, date);

              let bgClass = "";
              if (data && inMonth) {
                if (data.pnl > 0) bgClass = "bg-profit/20";
                else if (data.pnl < 0) bgClass = "bg-loss/20";
              }

              const hasData = inMonth && data && data.tradeCount > 0;

              return (
                <div
                  key={di}
                  onClick={hasData ? () => onDayClick(dayKey) : undefined}
                  className={`flex h-[38px] items-center justify-center rounded-[4px] text-[13px] ${bgClass} ${
                    !inMonth
                      ? "text-muted-foreground/25"
                      : data
                      ? data.pnl > 0
                        ? "font-medium text-profit"
                        : data.pnl < 0
                        ? "font-medium text-loss"
                        : "text-muted-foreground"
                      : "text-muted-foreground/70"
                  } ${hasData ? "cursor-pointer transition-colors hover:bg-accent/50" : ""}`}
                >
                  {format(d, "d")}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function YearOverview({
  year,
  dayData,
  onNavigateYear,
  onOpenMonth,
  onDayClick,
}: {
  year: number;
  dayData: Record<string, DayData>;
  onNavigateYear: (dir: -1 | 1) => void;
  onOpenMonth: (month: number) => void;
  onDayClick: (dateKey: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Year header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateYear(-1)}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="rounded-md border border-border px-3 py-1 font-mono text-sm font-semibold tabular-nums">
            {year}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateYear(1)}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 12-month grid: 3 columns */}
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 12 }, (_, i) => (
          <MiniMonth
            key={i}
            year={year}
            monthIndex={i}
            dayData={dayData}
            onOpen={() => onOpenMonth(i + 1)}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}

// ─── EXPANDED MONTH VIEW ─────────────────────────────────────────

function ExpandedMonth({
  year,
  month,
  dayData,
  onBack,
  onNavigateMonth,
  onDayClick,
}: {
  year: number;
  month: number; // 1-12
  dayData: Record<string, DayData>;
  onBack: () => void;
  onNavigateMonth: (dir: -1 | 1) => void;
  onDayClick: (dateKey: string) => void;
}) {
  const date = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  // Calculate weekly totals
  const weeklyTotals = weeks.map((week) => {
    let pnl = 0;
    let tradeCount = 0;
    for (const d of week) {
      if (!isSameMonth(d, date)) continue;
      const dayKey = format(d, "yyyy-MM-dd");
      const data = dayData[dayKey];
      if (data) {
        pnl += data.pnl;
        tradeCount += data.tradeCount;
      }
    }
    return { pnl: Math.round(pnl * 100) / 100, tradeCount };
  });

  // Monthly P&L
  const monthPnl = Object.entries(dayData).reduce((sum, [key, data]) => {
    const d = new Date(key + "T00:00:00");
    if (d.getFullYear() === year && d.getMonth() === month - 1) {
      return sum + data.pnl;
    }
    return sum;
  }, 0);
  const roundedMonthPnl = Math.round(monthPnl * 100) / 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {format(date, "MMMM, yyyy")}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-base text-muted-foreground">
            Monthly P&L:{" "}
            <span
              className={`text-lg font-semibold tabular-nums ${
                roundedMonthPnl > 0
                  ? "text-profit"
                  : roundedMonthPnl < 0
                  ? "text-loss"
                  : "text-flat"
              }`}
            >
              {roundedMonthPnl >= 0 ? "+" : ""}${roundedMonthPnl.toFixed(2)}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateMonth(-1)}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateMonth(1)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid with 8 columns (7 days + weekly total) */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Column headers */}
        <div className="grid grid-cols-8 border-b border-border">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div
              key={d}
              className="py-2.5 text-center text-[13px] font-medium tracking-wide text-muted-foreground"
            >
              {d}
            </div>
          ))}
          <div className="py-2.5 text-center text-[13px] font-medium tracking-wide text-primary">
            Total
          </div>
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div
            key={wi}
            className="grid grid-cols-8"
          >
            {/* Day cells */}
            {week.map((d, di) => {
               const dayKey = format(d, "yyyy-MM-dd");
              const data = dayData[dayKey];
              const inMonth = isSameMonth(d, date);

              const hasData = inMonth && data && data.tradeCount > 0;

              return (
                <div
                  key={di}
                  onClick={hasData ? () => onDayClick(dayKey) : undefined}
                  className={`aspect-[1/0.75] border-b border-r border-border p-2 transition-colors ${
                    !inMonth ? "bg-background/60" : ""
                  } ${hasData ? "cursor-pointer hover:bg-accent/50" : ""}`}
                >
                  <div className="flex items-start justify-between">
                     <span
                      className={`text-2xl font-semibold ${
                        !inMonth
                          ? "text-muted-foreground/20"
                          : data
                          ? data.pnl > 0
                            ? "text-profit"
                            : data.pnl < 0
                            ? "text-loss"
                            : "text-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {format(d, "d")}
                    </span>
                  </div>
                  {inMonth && (
                    <div className="mt-1.5">
                      <div
                        className={`text-lg font-bold tabular-nums ${
                          data
                            ? data.pnl > 0
                              ? "text-profit"
                              : data.pnl < 0
                              ? "text-loss"
                              : "text-flat"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {data
                          ? `${data.pnl >= 0 ? "+" : ""}$${data.pnl.toFixed(2)}`
                          : "$0"}
                      </div>
                      <div className="text-[13px] text-muted-foreground">
                        {data ? data.tradeCount : 0} trade
                        {(!data || data.tradeCount !== 1) ? "s" : ""}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Weekly total column */}
            <div className="flex flex-col justify-start border-b border-border p-2">
              <span className="text-xl font-bold text-foreground">
                Week {wi + 1}
              </span>
              <div
                className={`mt-1 text-lg font-bold tabular-nums ${
                  weeklyTotals[wi].pnl > 0
                    ? "text-profit"
                    : weeklyTotals[wi].pnl < 0
                    ? "text-loss"
                    : "text-foreground"
                }`}
              >
                {weeklyTotals[wi].pnl >= 0 ? "+" : ""}$
                {weeklyTotals[wi].pnl.toFixed(2)}
              </div>
              <div className="text-[13px] text-muted-foreground">
                {weeklyTotals[wi].tradeCount} trade
                {weeklyTotals[wi].tradeCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────

export function CalendarView({ year, month, dayData }: CalendarViewProps) {
  const router = useRouter();

  function navigateYear(dir: -1 | 1) {
    const newYear = year + dir;
    if (month !== null) {
      router.push(`/calendar?year=${newYear}&month=${month}`);
    } else {
      router.push(`/calendar?year=${newYear}`);
    }
  }

  function navigateMonth(dir: -1 | 1) {
    if (month === null) return;
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    router.push(`/calendar?year=${newYear}&month=${newMonth}`);
  }

  function openMonth(m: number) {
    router.push(`/calendar?year=${year}&month=${m}`);
  }

  function backToYear() {
    router.push(`/calendar?year=${year}`);
  }

  function goToJournalDay(dateKey: string) {
    router.push(`/journal?date=${dateKey}`);
  }

  if (month !== null) {
    return (
      <ExpandedMonth
        year={year}
        month={month}
        dayData={dayData}
        onBack={backToYear}
        onNavigateMonth={navigateMonth}
        onDayClick={goToJournalDay}
      />
    );
  }

  return (
    <YearOverview
      year={year}
      dayData={dayData}
      onNavigateYear={navigateYear}
      onOpenMonth={openMonth}
      onDayClick={goToJournalDay}
    />
  );
}
