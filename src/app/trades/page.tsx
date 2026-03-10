export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { TradesTable } from "@/components/trades/trades-table";

interface SearchParams {
  symbol?: string;
  side?: string;
  setup?: string;
  page?: string;
}

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page ?? "1", 10);
  const pageSize = 50;

  const where: Record<string, unknown> = {};
  if (params.symbol) where.symbol = { contains: params.symbol.toUpperCase() };
  if (params.side) where.side = params.side;
  if (params.setup) where.setup = params.setup;

  const [trades, totalCount] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: {
        tags: { include: { tag: true } },
      },
      orderBy: { entryDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trade.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  // Get unique setups for filter
  const setups = await prisma.trade.findMany({
    where: { setup: { not: null } },
    select: { setup: true },
    distinct: ["setup"],
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold">Trades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount} trade{totalCount !== 1 ? "s" : ""} total
        </p>
      </div>
      <TradesTable
        trades={trades.map((t) => ({
          ...t,
          tags: t.tags.map((tt) => tt.tag),
        }))}
        currentPage={page}
        totalPages={totalPages}
        filters={params}
        setups={setups
          .map((s) => s.setup)
          .filter((s): s is string => s !== null)}
      />
    </div>
  );
}
