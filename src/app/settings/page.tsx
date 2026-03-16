export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getSettings } from "@/actions/settings-actions";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const [settings, pnlResult] = await Promise.all([
    getSettings(),
    prisma.trade.aggregate({
      where: { status: "CLOSED" },
      _sum: { pnl: true },
    }),
  ]);

  const totalPnl = pnlResult._sum.pnl ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Settings</h1>
      <SettingsForm
        currentCapital={settings.startingCapital}
        totalPnl={Math.round(totalPnl * 100) / 100}
      />
    </div>
  );
}
