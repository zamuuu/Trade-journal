"use server";

import { prisma } from "@/lib/db";
import { WidgetConfig } from "@/types";
import { DEFAULT_WIDGETS, WIDGET_REGISTRY } from "@/lib/widgets/registry";

// IDs that were removed/merged - map old ID to replacement (or null to just remove)
const MIGRATED_WIDGETS: Record<string, string | null> = {
  "avg-win": "avg-win-loss",
  "avg-loss": "avg-win-loss",
};

function migrateConfig(config: WidgetConfig[]): {
  config: WidgetConfig[];
  changed: boolean;
} {
  const validIds = new Set(WIDGET_REGISTRY.map((w) => w.id));
  let changed = false;
  const seen = new Set<string>();
  const migrated: WidgetConfig[] = [];

  for (const widget of config) {
    // Check if this widget was migrated to a new ID
    if (MIGRATED_WIDGETS[widget.id] !== undefined) {
      const replacement = MIGRATED_WIDGETS[widget.id];
      changed = true;
      // Add replacement if it exists and hasn't been added yet
      if (replacement && !seen.has(replacement) && validIds.has(replacement)) {
        migrated.push({
          id: replacement,
          enabled: widget.enabled,
          order: widget.order,
        });
        seen.add(replacement);
      }
      continue;
    }

    // Skip widgets that no longer exist in registry
    if (!validIds.has(widget.id)) {
      changed = true;
      continue;
    }

    // Skip duplicates
    if (seen.has(widget.id)) {
      changed = true;
      continue;
    }

    migrated.push(widget);
    seen.add(widget.id);
  }

  return { config: migrated, changed };
}

export async function getDashboardConfig(): Promise<WidgetConfig[]> {
  const dbConfig = await prisma.dashboardConfig.findUnique({
    where: { id: "default" },
  });

  if (!dbConfig) {
    // Create default config on first load
    await prisma.dashboardConfig.create({
      data: {
        id: "default",
        widgets: JSON.stringify(DEFAULT_WIDGETS),
      },
    });
    return DEFAULT_WIDGETS;
  }

  const parsed = JSON.parse(dbConfig.widgets) as WidgetConfig[];
  const { config, changed } = migrateConfig(parsed);

  // Persist migrated config if it changed
  if (changed) {
    await prisma.dashboardConfig.update({
      where: { id: "default" },
      data: { widgets: JSON.stringify(config) },
    });
  }

  return config;
}

export async function updateDashboardConfig(
  widgets: WidgetConfig[]
): Promise<void> {
  await prisma.dashboardConfig.upsert({
    where: { id: "default" },
    update: { widgets: JSON.stringify(widgets) },
    create: { id: "default", widgets: JSON.stringify(widgets) },
  });
}
