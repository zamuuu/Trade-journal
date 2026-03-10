"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Pencil,
  Check,
  RotateCcw,
  Plus,
  GripVertical,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetConfig, DashboardData } from "@/types";
import {
  WIDGET_REGISTRY,
  DEFAULT_WIDGETS,
  getWidgetDefinition,
} from "@/lib/widgets/registry";
import { updateDashboardConfig } from "@/actions/dashboard-actions";
import { StatWidget } from "./stat-widget";
import { PnlChart } from "./pnl-chart";
import { RecentTrades } from "./recent-trades";
import { AvgWinLossWidget } from "./avg-win-loss-widget";
import { PnlBySetupWidget } from "./pnl-by-setup-widget";
import { Last7DaysWidget } from "./last-7-days-widget";
import { WidgetCustomizer } from "./widget-customizer";

// ─── Types ───────────────────────────────────────────────────────

interface WidgetGridProps {
  initialConfig: WidgetConfig[];
  data: DashboardData;
}

// ─── Sortable Widget Wrapper ─────────────────────────────────────

function SortableWidgetWrapper({
  id,
  children,
  onRemove,
  gridStyle,
}: {
  id: string;
  children: React.ReactNode;
  onRemove: () => void;
  gridStyle?: React.CSSProperties;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    ...gridStyle,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        className="absolute -left-1 top-1 z-10 cursor-grab rounded p-1 text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 rounded p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove widget"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {children}
    </div>
  );
}

// ─── Widget Grid ─────────────────────────────────────────────────

export function WidgetGrid({ initialConfig, data }: WidgetGridProps) {
  const [config, setConfig] = useState<WidgetConfig[]>(initialConfig);
  const [editMode, setEditMode] = useState(false);
  const [draftConfig, setDraftConfig] = useState<WidgetConfig[]>(initialConfig);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // dnd-kit sensor: require 5px movement before starting drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Derived data ──────────────────────────────────────────────

  const activeConfig = editMode ? draftConfig : config;

  const enabledWidgets = activeConfig
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);

  const statWidgets = enabledWidgets.filter(
    (w) => getWidgetDefinition(w.id)?.size === "stat"
  );
  const largeWidgets = enabledWidgets.filter(
    (w) => getWidgetDefinition(w.id)?.size !== "stat"
  );

  // ── Config persistence ────────────────────────────────────────

  function persistConfig(newConfig: WidgetConfig[]) {
    setConfig(newConfig);
    startTransition(async () => {
      await updateDashboardConfig(newConfig);
    });
  }

  // ── Normal mode handlers ──────────────────────────────────────

  function handleToggleWidget(widgetId: string, enabled: boolean) {
    const source = editMode ? draftConfig : config;
    const existing = source.find((w) => w.id === widgetId);
    let newConfig: WidgetConfig[];

    if (existing) {
      newConfig = source.map((w) =>
        w.id === widgetId ? { ...w, enabled } : w
      );
    } else {
      const maxOrder = source.reduce((max, w) => Math.max(max, w.order), -1);
      newConfig = [...source, { id: widgetId, enabled, order: maxOrder + 1 }];
    }

    if (editMode) {
      setDraftConfig(newConfig);
    } else {
      persistConfig(newConfig);
    }
  }

  // ── Edit mode handlers ────────────────────────────────────────

  function enterEditMode() {
    setDraftConfig([...config]);
    setEditMode(true);
  }

  function saveLayout() {
    persistConfig(draftConfig);
    setEditMode(false);
  }

  function resetToDefault() {
    setDraftConfig([...DEFAULT_WIDGETS]);
  }

  function removeWidget(widgetId: string) {
    setDraftConfig((prev) =>
      prev.map((w) => (w.id === widgetId ? { ...w, enabled: false } : w))
    );
  }

  // ── Drag handlers ─────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDraftConfig((prev) => {
      const enabled = prev
        .filter((w) => w.enabled)
        .sort((a, b) => a.order - b.order);
      const disabled = prev.filter((w) => !w.enabled);

      const oldIndex = enabled.findIndex((w) => w.id === active.id);
      const newIndex = enabled.findIndex((w) => w.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const reordered = arrayMove(enabled, oldIndex, newIndex).map(
        (w, i) => ({ ...w, order: i })
      );

      return [...reordered, ...disabled];
    });
  }

  // ── Render widget content ─────────────────────────────────────

  function renderWidgetContent(widgetId: string) {
    switch (widgetId) {
      case "total-trades":
        return (
          <StatWidget
            label="Trades"
            value={data.metrics.totalTrades.toString()}
          />
        );
      case "win-rate": {
        const wrColor =
          data.metrics.winRate >= 50
            ? "text-profit"
            : data.metrics.winRate > 0
              ? "text-loss"
              : "text-flat";
        return (
          <StatWidget
            label="Win Rate"
            value={`${data.metrics.winRate.toFixed(1)}%`}
            colorClass={wrColor}
          />
        );
      }
      case "net-pnl": {
        const pnlColor =
          data.metrics.totalPnl > 0
            ? "text-profit"
            : data.metrics.totalPnl < 0
              ? "text-loss"
              : "text-flat";
        return (
          <StatWidget
            label="Net PnL"
            value={`${data.metrics.totalPnl >= 0 ? "+" : ""}$${data.metrics.totalPnl.toFixed(2)}`}
            colorClass={pnlColor}
          />
        );
      }
      case "avg-win-loss":
        return (
          <AvgWinLossWidget
            avgWin={data.metrics.averageWin}
            avgLoss={data.metrics.averageLoss}
          />
        );
      case "profit-factor": {
        const pfColor =
          data.metrics.profitFactor >= 1
            ? "text-profit"
            : data.metrics.profitFactor > 0
              ? "text-loss"
              : "text-flat";
        return (
          <StatWidget
            label="Profit Factor"
            value={
              data.metrics.profitFactor === Infinity
                ? "--"
                : data.metrics.profitFactor.toFixed(2)
            }
            colorClass={pfColor}
          />
        );
      }
      case "cumulative-pnl":
        return <PnlChart data={data.pnlData} />;
      case "recent-trades":
        return (
          <RecentTrades
            trades={data.recentTrades.map((t) => ({
              ...t,
              entryDate: new Date(t.entryDate),
            }))}
          />
        );
      case "pnl-by-setup":
        return <PnlBySetupWidget stats={data.setupStats} />;
      case "last-7-days":
        return <Last7DaysWidget days={data.last7Days} />;
      default:
        return null;
    }
  }

  // ── Grid style helper ─────────────────────────────────────────

  function getEditGridStyle(widgetId: string): React.CSSProperties | undefined {
    const def = getWidgetDefinition(widgetId);
    if (!def) return undefined;
    if (def.size === "wide")
      return { gridColumn: "1 / -1", gridRow: "span 2" };
    if (def.size === "chart")
      return { gridColumn: "span 2", gridRow: "span 4" };
    if (def.size === "list")
      return { gridRow: "span 3" };
    // stat: span 1 (default)
    return undefined;
  }

  function getViewGridStyle(widgetId: string): React.CSSProperties | undefined {
    const def = getWidgetDefinition(widgetId);
    if (!def) return undefined;
    if (def.size === "wide") return { gridColumn: "1 / -1" };
    if (def.size === "chart") return { gridColumn: "span 2" };
    return undefined;
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Dashboard</h1>

        {editMode ? (
          <>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-profit/15 px-3 text-[13px] text-profit hover:bg-profit/25"
              onClick={saveLayout}
            >
              <Check className="h-3.5 w-3.5" />
              Save Layout
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-3 text-[13px] text-muted-foreground"
              onClick={resetToDefault}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to default
            </Button>
            <WidgetCustomizer
              config={draftConfig}
              registry={WIDGET_REGISTRY}
              onToggle={handleToggleWidget}
              isPending={isPending}
              triggerLabel="Add Widgets"
              triggerIcon="plus"
            />
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-3 text-[13px] text-muted-foreground"
              onClick={enterEditMode}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Layout
            </Button>
            <div className="ml-auto">
              <WidgetCustomizer
                config={config}
                registry={WIDGET_REGISTRY}
                onToggle={handleToggleWidget}
                isPending={isPending}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Edit mode: single sortable grid ── */}
      {editMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={enabledWidgets.map((w) => w.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gridAutoRows: "80px",
                gridAutoFlow: "dense",
              }}
            >
              {enabledWidgets.map((w) => (
                <SortableWidgetWrapper
                  key={w.id}
                  id={w.id}
                  onRemove={() => removeWidget(w.id)}
                  gridStyle={getEditGridStyle(w.id)}
                >
                  {renderWidgetContent(w.id)}
                </SortableWidgetWrapper>
              ))}
            </div>
          </SortableContext>

          {/* Drag overlay for visual feedback */}
          <DragOverlay>
            {activeId ? (
              <div className="rounded-md border border-primary/30 bg-card opacity-90 shadow-lg">
                {renderWidgetContent(activeId)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <>
          {/* ── Normal mode: stat row + large grid ── */}
          {statWidgets.length > 0 && (
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${Math.min(statWidgets.length, 6)}, minmax(0, 1fr))`,
              }}
            >
              {statWidgets.map((w) => (
                <div key={w.id}>{renderWidgetContent(w.id)}</div>
              ))}
            </div>
          )}

          {largeWidgets.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {largeWidgets.map((w) => {
                const def = getWidgetDefinition(w.id);
                if (!def) return null;
                const isWide = def.size === "wide";
                const isChart = def.size === "chart";
                return (
                  <div
                    key={w.id}
                    className={
                      isWide ? "" : isChart ? "lg:col-span-2" : "lg:col-span-1"
                    }
                    style={isWide ? { gridColumn: "1 / -1" } : undefined}
                  >
                    {renderWidgetContent(w.id)}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {enabledWidgets.length === 0 && (
        <div className="flex h-40 items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground">
          No widgets enabled.{" "}
          {editMode
            ? 'Click "Add Widgets" to add some.'
            : "Click the settings icon to add widgets."}
        </div>
      )}
    </div>
  );
}
