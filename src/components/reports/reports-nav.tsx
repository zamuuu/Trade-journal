"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Detailed", href: "/reports" },
  { label: "Win vs Loss Days", href: "/reports/win-vs-loss-days" },
  { label: "Long vs Short", href: "/reports/long-vs-short" },
];

export function ReportsNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-border">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80"
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
