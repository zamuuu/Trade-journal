export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TradeDetail } from "@/components/trades/trade-detail";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const trade = await prisma.trade.findUnique({
    where: { id },
    include: {
      executions: { orderBy: { timestamp: "asc" } },
      tags: { include: { tag: true } },
      screenshots: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!trade) notFound();

  const [allTags, allSetups, noteTemplates] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.trade.findMany({
      where: { setup: { not: null } },
      select: { setup: true },
      distinct: ["setup"],
      orderBy: { setup: "asc" },
    }),
    prisma.noteTemplate.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <TradeDetail
      trade={{
        ...trade,
        tags: trade.tags.map((tt) => tt.tag),
      }}
      allTags={allTags}
      allSetups={allSetups.map((s) => s.setup!)}
      noteTemplates={noteTemplates}
    />
  );
}
