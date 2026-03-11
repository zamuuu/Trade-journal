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

  // Build trade filter
  const where: Record<string, unknown> = { status: "CLOSED" };

  // Single-day filter (from Calendar click)
  if (params.date) {
    const dayStart = new Date(params.date + "T00:00:00");
    const dayEnd = new Date(params.date + "T23:59:59.999");
    where.entryDate = { gte: dayStart, lte: dayEnd };
  }

  // Fetch all closed trades with executions and tags
  const trades = await prisma.trade.findMany({
    where,
    include: {
      executions: { select: { id: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { entryDate: "desc" },
  });

  // Fetch all day notes with tags
  const dayNotes = await prisma.dayNote.findMany({
    include: {
      tags: { include: { tag: true } },
    },
  });

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
  const dayMap = new Map<string, JournalDayTrade[]>();

  for (const trade of trades) {
    const dayKey = format(new Date(trade.entryDate), "yyyy-MM-dd");
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, []);
    }
    dayMap.get(dayKey)!.push({
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      entryDate: trade.entryDate.toISOString(),
      pnl: trade.pnl,
      totalQuantity: trade.totalQuantity,
      executionCount: trade.executions.length,
      tags: trade.tags.map((tt) => ({ id: tt.tag.id, name: tt.tag.name })),
    });
  }

  // Also include days that have notes but no trades
  for (const [date] of dayNoteMap) {
    if (!dayMap.has(date)) {
      dayMap.set(date, []);
    }
  }

  // Build JournalDay array
  const days: JournalDay[] = [];

  for (const [date, dayTrades] of dayMap) {
    const dayNote = dayNoteMap.get(date);
    const winningTrades = dayTrades.filter((t) => t.pnl > 0).length;
    const totalTrades = dayTrades.length;
    const netPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalVolume = dayTrades.reduce((sum, t) => sum + t.totalQuantity, 0);
    const pnls = dayTrades.map((t) => t.pnl);
    const largestWin = pnls.length > 0 ? Math.max(...pnls, 0) : 0;
    const largestLoss = pnls.length > 0 ? Math.min(...pnls, 0) : 0;

    days.push({
      date,
      totalTrades,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      netPnl: Math.round(netPnl * 100) / 100,
      totalVolume,
      largestWin: Math.round(largestWin * 100) / 100,
      largestLoss: Math.round(largestLoss * 100) / 100,
      notes: dayNote?.notes ?? null,
      dayNoteId: dayNote?.id ?? null,
      tags: dayNote?.tags ?? [],
      trades: dayTrades,
    });
  }

  // Sort by date descending
  days.sort((a, b) => b.date.localeCompare(a.date));

  // Pagination
  const page = parseInt(params.page ?? "1", 10);
  const pageSize = 20;
  const totalPages = Math.ceil(days.length / pageSize);
  const paginatedDays = days.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Get all available tags for filter dropdown
  const allTags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
  });

  // Get all note templates
  const noteTemplates = await prisma.noteTemplate.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Journal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {days.length} trading day{days.length !== 1 ? "s" : ""}
        </p>
      </div>
      <JournalView
        days={paginatedDays}
        currentPage={page}
        totalPages={totalPages}
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
