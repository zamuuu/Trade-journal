"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const RANGES = [
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
] as const;

export type DateRangeValue = (typeof RANGES)[number]["value"];

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = (searchParams.get("range") as DateRangeValue) || "all";

  function handleChange(value: DateRangeValue) {
    if (value === current) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all") {
        params.delete("range");
      } else {
        params.set("range", value);
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <div
      className={`inline-flex items-center rounded-md border border-border bg-muted/30 p-0.5 transition-opacity ${isPending ? "opacity-60" : ""}`}
    >
      {RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => handleChange(range.value)}
          disabled={isPending}
          className={`rounded-sm px-2.5 py-1 text-[12px] font-medium tabular-nums transition-colors ${
            current === range.value
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
