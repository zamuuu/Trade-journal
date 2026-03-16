"use client";

import { useState, useTransition } from "react";
import { updateStartingCapital } from "@/actions/settings-actions";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface SettingsFormProps {
  currentCapital: number;
  totalPnl: number;
}

export function SettingsForm({ currentCapital, totalPnl }: SettingsFormProps) {
  const [capital, setCapital] = useState(
    currentCapital > 0 ? currentCapital.toString() : ""
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const parsedCapital = parseFloat(capital) || 0;
  const currentBalance = parsedCapital + totalPnl;
  const returnPct =
    parsedCapital > 0
      ? ((totalPnl / parsedCapital) * 100).toFixed(2)
      : "0.00";

  function handleSave() {
    const value = parseFloat(capital);
    if (isNaN(value) || value < 0) return;

    startTransition(async () => {
      await updateStartingCapital(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Starting Capital */}
      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            Account Capital
          </h2>
        </div>
        <div className="px-5 py-5 space-y-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground">
              Starting Capital
            </label>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={capital}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) {
                      setCapital(v);
                      setSaved(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  placeholder="0.00"
                  className="flex h-9 w-full rounded-md border border-border bg-input pl-7 pr-3 py-1 font-mono text-sm tabular-nums text-foreground shadow-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <Button
                size="sm"
                className="h-9 gap-1.5 px-4"
                onClick={handleSave}
                disabled={isPending}
              >
                <Save className="h-3.5 w-3.5" />
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
            <p className="text-[12px] text-muted-foreground">
              The total capital in your trading account at the start of
              tracking. Used to calculate returns and equity growth.
            </p>
          </div>

          {/* Account Summary */}
          {parsedCapital > 0 && (
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Starting Capital
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
                  ${parsedCapital.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Current Balance
                </p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                    currentBalance >= parsedCapital
                      ? "text-profit"
                      : "text-loss"
                  }`}
                >
                  ${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-md border border-border bg-background px-4 py-3">
                <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                  Return
                </p>
                <p
                  className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                    totalPnl > 0
                      ? "text-profit"
                      : totalPnl < 0
                        ? "text-loss"
                        : "text-flat"
                  }`}
                >
                  {totalPnl >= 0 ? "+" : ""}
                  {returnPct}%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
