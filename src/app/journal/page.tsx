export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { JournalView } from "@/components/journal/journal-view";
import { JournalDay, JournalDayTrade } from "@/types";
import { format } from "date-fns";

interface SearchParams {
  page?: string;
  date?: string; // yyyy-MM-dd — used when navigating from Calendar
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const pageSize = 20;

  // ── Single-day mode (from Calendar click) ───────────────────────
  if (params.date) {
    const dayStart = new Date(params.date + "T00:00:00");
    const dayEnd = new Date(params.date + "T23:59:59.999");

    const [trades, dayNote, allTags, noteTemplates] = await Promise.all([
      prisma.trade.findMany({
        where: { status: "CLOSED", entryDate: { gte: dayStart, lte: dayEnd } },
        include: {
          executions: { select: { id: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { entryDate: "desc" },
      }),
      prisma.dayNote.findUnique({
        where: { date: params.date },
        include: { tags: { include: { tag: true } } },
      }),
      prisma.tag.findMany({ orderBy: { name: "asc" } }),
      prisma.noteTemplate.findMany({ orderBy: { name: "asc" } }),
    ]);

    const dayTrades: JournalDayTrade[] = trades.map((t) => ({
      id: t.id,
      symbol: t.symbol,
      side: t.side,
      entryDate: t.entryDate.toISOString(),
      pnl: t.pnl,
      totalQuantity: t.totalQuantity,
      executionCount: t.executions.length,
      setup: t.setup,
      tags: t.tags.map((tt) => ({ id: tt.tag.id, name: tt.tag.name })),
    }));

    const winningTrades = dayTrades.filter((t) => t.pnl > 0).length;
    const netPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalVolume = dayTrades.reduce((sum, t) => sum + t.totalQuantity, 0);
    const pnls = dayTrades.map((t) => t.pnl);

    const day: JournalDay = {
      date: params.date,
      totalTrades: dayTrades.length,
      winRate: dayTrades.length > 0 ? (winningTrades / dayTrades.length) * 100 : 0,
      netPnl: Math.round(netPnl * 100) / 100,
      totalVolume,
      largestWin: Math.round(Math.max(...pnls, 0) * 100) / 100,
      largestLoss: Math.round(Math.min(...pnls, 0) * 100) / 100,
      notes: dayNote?.notes ?? null,
      dayNoteId: dayNote?.id ?? null,
      tags: dayNote?.tags.map((dt) => ({ id: dt.tag.id, name: dt.tag.name })) ?? [],
      trades: dayTrades,
    };

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">1 trading day</p>
        </div>
        <JournalView
          days={[day]}
          currentPage={1}
          totalPages={1}
          filters={{ date: params.date }}
          allTags={allTags.map((t) => ({ id: t.id, name: t.name }))}
          noteTemplates={noteTemplates.map((nt) => ({
            id: nt.id,
            name: nt.name,
            content: nt.content,
          }))}
        />
      </div>
    );
  }

  // ── Normal paginated mode ───────────────────────────────────────

  // Step 1: Get distinct trading days (dates that have trades OR day notes)
  // We use raw queries for efficient DISTINCT + pagination at DB level

  // Get all distinct trade dates
  const tradeDatesRaw: { date: string }[] = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT strftime('%Y-%m-%d', entryDate / 1000, 'unixepoch') as date
     FROM Trade WHERE status = 'CLOSED'`
  );
  const tradeDateSet = new Set(tradeDatesRaw.map((r) => r.date));

  // Get all day note dates
  const noteDatesRaw = await prisma.dayNote.findMany({
    select: { date: true },
  });
  const noteDateSet = new Set(noteDatesRaw.map((r) => r.date));

  // Merge into a sorted list of all unique dates (desc)
  const allDatesSet = new Set([...tradeDateSet, ...noteDateSet]);
  const allDatesSorted = Array.from(allDatesSet).sort((a, b) => b.localeCompare(a));

  const totalDays = allDatesSorted.length;
  const totalPages = Math.ceil(totalDays / pageSize);

  // Step 2: Get just the dates for the current page
  const pageDates = allDatesSorted.slice((page - 1) * pageSize, page * pageSize);

  if (pageDates.length === 0) {
    const [allTags, noteTemplates] = await Promise.all([
      prisma.tag.findMany({ orderBy: { name: "asc" } }),
      prisma.noteTemplate.findMany({ orderBy: { name: "asc" } }),
    ]);

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-lg font-semibold">Journal</h1>
          <p className="mt-1 text-sm text-muted-foreground">0 trading days</p>
        </div>
        <JournalView
          days={[]}
          currentPage={page}
          totalPages={totalPages}
          filters={{}}
          allTags={allTags.map((t) => ({ id: t.id, name: t.name }))}
          noteTemplates={noteTemplates.map((nt) => ({
            id: nt.id,
            name: nt.name,
            content: nt.content,
          }))}
        />
      </div>
    );
  }

  // Step 3: Build date range for this page and fetch only those trades + day notes
  const firstDate = pageDates[pageDates.length - 1]; // earliest date on page
  const lastDate = pageDates[0]; // latest date on page
  const rangeStart = new Date(firstDate + "T00:00:00");
  const rangeEnd = new Date(lastDate + "T23:59:59.999");

  const [trades, dayNotes, allTags, noteTemplates] = await Promise.all([
    prisma.trade.findMany({
      where: {
        status: "CLOSED",
        entryDate: { gte: rangeStart, lte: rangeEnd },
      },
      include: {
        executions: { select: { id: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { entryDate: "desc" },
    }),
    prisma.dayNote.findMany({
      where: { date: { in: pageDates } },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.noteTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Index day notes by date
  const dayNoteMap = new Map(
    dayNotes.map((dn) => [
      dn.date,
      {
        id: dn.id,
        notes: dn.notes,
        tags: dn.tags.map((dt) => ({ id: dt.tag.id, name: dt.tag.name })),
      },
    ])
  );

  // Group trades by day
  const tradesByDay = new Map<string, JournalDayTrade[]>();
  for (const trade of trades) {
    const dayKey = format(new Date(trade.entryDate), "yyyy-MM-dd");
    if (!tradesByDay.has(dayKey)) {
      tradesByDay.set(dayKey, []);
    }
    tradesByDay.get(dayKey)!.push({
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      entryDate: trade.entryDate.toISOString(),
      pnl: trade.pnl,
      totalQuantity: trade.totalQuantity,
      executionCount: trade.executions.length,
      setup: trade.setup,
      tags: trade.tags.map((tt) => ({ id: tt.tag.id, name: tt.tag.name })),
    });
  }

  // Build JournalDay array for just these page dates (already sorted desc)
  const days: JournalDay[] = pageDates.map((date) => {
    const dayTrades = tradesByDay.get(date) ?? [];
    const dayNote = dayNoteMap.get(date);
    const winningTrades = dayTrades.filter((t) => t.pnl > 0).length;
    const totalTrades = dayTrades.length;
    const netPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalVolume = dayTrades.reduce((sum, t) => sum + t.totalQuantity, 0);
    const pnls = dayTrades.map((t) => t.pnl);

    return {
      date,
      totalTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      netPnl: Math.round(netPnl * 100) / 100,
      totalVolume,
      largestWin: pnls.length > 0 ? Math.round(Math.max(...pnls, 0) * 100) / 100 : 0,
      largestLoss: pnls.length > 0 ? Math.round(Math.min(...pnls, 0) * 100) / 100 : 0,
      notes: dayNote?.notes ?? null,
      dayNoteId: dayNote?.id ?? null,
      tags: dayNote?.tags ?? [],
      trades: dayTrades,
    };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Journal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalDays} trading day{totalDays !== 1 ? "s" : ""}
        </p>
      </div>
      <JournalView
        days={days}
        currentPage={page}
        totalPages={totalPages}
        filters={{}}
        allTags={allTags.map((t) => ({ id: t.id, name: t.name }))}
        noteTemplates={noteTemplates.map((nt) => ({
          id: nt.id,
          name: nt.name,
          content: nt.content,
        }))}
      />
    </div>
  );
}
