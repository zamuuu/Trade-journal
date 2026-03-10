"use client";

import { Settings2, Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { WidgetConfig, WidgetDefinition } from "@/types";

interface WidgetCustomizerProps {
  config: WidgetConfig[];
  registry: WidgetDefinition[];
  onToggle: (widgetId: string, enabled: boolean) => void;
  isPending: boolean;
  /** If set, renders a labeled button instead of the gear icon */
  triggerLabel?: string;
  /** "settings" (default) or "plus" */
  triggerIcon?: "settings" | "plus";
}

export function WidgetCustomizer({
  config,
  registry,
  onToggle,
  isPending,
  triggerLabel,
  triggerIcon = "settings",
}: WidgetCustomizerProps) {
  function isEnabled(widgetId: string): boolean {
    const w = config.find((c) => c.id === widgetId);
    return w?.enabled ?? false;
  }

  const Icon = triggerIcon === "plus" ? Plus : Settings2;

  return (
    <Popover>
      <PopoverTrigger
        className={
          triggerLabel
            ? "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            : "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        }
        aria-label={triggerLabel ?? "Customize dashboard"}
      >
        <Icon className={triggerLabel ? "h-3.5 w-3.5" : "h-4 w-4"} />
        {triggerLabel ?? null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-[13px] font-medium">Widgets</p>
          <p className="text-[11px] text-muted-foreground">
            Toggle widgets on or off
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {registry.map((widget) => (
            <label
              key={widget.id}
              className="flex cursor-pointer items-center justify-between px-3 py-2 transition-colors hover:bg-muted/50"
            >
              <div className="mr-3 min-w-0">
                <p className="text-[13px] font-medium">{widget.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {widget.description}
                </p>
              </div>
              <Switch
                checked={isEnabled(widget.id)}
                onCheckedChange={(checked) => onToggle(widget.id, checked)}
                disabled={isPending}
                className="shrink-0"
              />
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
