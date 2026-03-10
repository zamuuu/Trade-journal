"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  List,
  CalendarDays,
  BarChart3,
  BookOpen,
  Upload,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trades", icon: List },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/import", label: "Import", icon: Upload },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn("shrink-0 p-3 transition-all duration-300", collapsed ? "w-[76px]" : "w-[256px]")}>
      <aside className="flex h-full flex-col rounded-xl bg-sidebar">
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed && (
            <span className="text-lg font-bold tracking-wide text-foreground">
              Trade Journal
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? (
              <ChevronsRight className="h-[18px] w-[18px]" />
            ) : (
              <ChevronsLeft className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center rounded-lg transition-colors",
                  collapsed
                    ? "justify-center px-0 py-3"
                    : "gap-3.5 px-3.5 py-3",
                  isActive
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <span className="text-[15px] font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
