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
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Pencil,
  Check,
  RotateCcw,
  GripVertical,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetConfig, DashboardData, WidgetSize } from "@/types";
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
import { WinLossDonutWidget } from "./win-loss-donut-widget";
import { PnlByDayWidget } from "./pnl-by-day-widget";
import { PnlByPriceWidget } from "./pnl-by-price-widget";
import { DailyPnlChartWidget } from "./daily-pnl-chart-widget";
import { DrawdownWidget } from "./drawdown-widget";
import { RiskRewardWidget } from "./risk-reward-widget";
import { PnlByHourWidget } from "./pnl-by-hour-widget";
import { DateRangeFilter } from "./date-range-filter";
import { WidgetCustomizer } from "./widget-customizer";

// ─── Grid size constants ─────────────────────────────────────────
// Base row height in pixels — every widget height is a multiple of this
const ROW_H = 200;
const GAP = 10; // gap between cells in px

/** CSS grid span + height for each widget size */
function sizeToGrid(size: WidgetSize): {
  colSpan: number;
  rowSpan: number;
} {
  switch (size) {
    case "small":
      return { colSpan: 1, rowSpan: 1 };
    case "medium":
      return { colSpan: 1, rowSpan: 2 };
    case "large":
      return { colSpan: 2, rowSpan: 2 };
    case "wide":
      return { colSpan: 4, rowSpan: 1 };
  }
}

/** Pixel height for a given row-span (accounts for gap between rows) */
function spanHeight(rowSpan: number): number {
  return ROW_H * rowSpan + GAP * (rowSpan - 1);
}

// ─── Preview constants ───────────────────────────────────────────
const PREVIEW_ROW_H = 48; // row height in the mini-preview (px)
const PREVIEW_GAP = 4; // gap in the mini-preview (px)

/** Colour palette for preview blocks — cycles through these */
const PREVIEW_COLORS = [
  { bg: "bg-blue-500/15", border: "border-blue-500/30", text: "text-blue-400" },
  { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
  { bg: "bg-violet-500/15", border: "border-violet-500/30", text: "text-violet-400" },
  { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400" },
  { bg: "bg-rose-500/15", border: "border-rose-500/30", text: "text-rose-400" },
  { bg: "bg-cyan-500/15", border: "border-cyan-500/30", text: "text-cyan-400" },
  { bg: "bg-orange-500/15", border: "border-orange-500/30", text: "text-orange-400" },
  { bg: "bg-pink-500/15", border: "border-pink-500/30", text: "text-pink-400" },
];

// ─── Types ───────────────────────────────────────────────────────

interface WidgetGridProps {
  initialConfig: WidgetConfig[];
  data: DashboardData;
}

// ─── Grid Preview (mini grid shown in edit mode) ─────────────────

function GridPreview({
  widgets,
  activeId,
}: {
  widgets: WidgetConfig[];
  activeId: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Preview
      </p>
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gridAutoRows: `${PREVIEW_ROW_H}px`,
          gridAutoFlow: "dense",
          gap: `${PREVIEW_GAP}px`,
        }}
      >
        {widgets.map((w, i) => {
          const def = getWidgetDefinition(w.id);
          if (!def) return null;
          const { colSpan, rowSpan } = sizeToGrid(def.size);
          const color = PREVIEW_COLORS[i % PREVIEW_COLORS.length];
          const isActive = activeId === w.id;
          const height =
            PREVIEW_ROW_H * rowSpan + PREVIEW_GAP * (rowSpan - 1);

          return (
            <div
              key={w.id}
              className={`flex items-center justify-center rounded border px-1 transition-all duration-200 ${
                isActive
                  ? "border-primary bg-primary/20 ring-1 ring-primary/40 scale-[1.03]"
                  : `${color.bg} ${color.border}`
              }`}
              style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
                height: `${height}px`,
              }}
            >
              <span
                className={`text-[10px] font-medium leading-tight text-center truncate ${
                  isActive ? "text-primary" : color.text
                }`}
              >
                {def.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sortable Edit Row (compact list item for edit mode) ─────────

function SortableEditRow({
  id,
  index,
  onRemove,
}: {
  id: string;
  index: number;
  onRemove: () => void;
}) {
  const def = getWidgetDefinition(id);
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
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const sizeLabel = def?.size ?? "small";
  const color = PREVIEW_COLORS[index % PREVIEW_COLORS.length];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        className="cursor-grab text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className={`h-3 w-3 rounded-sm ${color.bg} ${color.border} border`} />
      <span className="flex-1 text-sm font-medium">
        {def?.name ?? id}
      </span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
        {sizeLabel}
      </span>
      <button
        onClick={onRemove}
        className="rounded p-1 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
        aria-label="Remove widget"
      >
        <X className="h-3.5 w-3.5" />
      </button>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Derived data ──────────────────────────────────────────────

  const activeConfig = editMode ? draftConfig : config;

  const enabledWidgets = activeConfig
    .filter((w) => w.enabled)
    .sort((a, b) => a.order - b.order);

  // ── Config persistence ────────────────────────────────────────

  function persistConfig(newConfig: WidgetConfig[]) {
    setConfig(newConfig);
    startTransition(async () => {
      await updateDashboardConfig(newConfig);
    });
  }

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
      case "win-loss-donut":
        return (
          <WinLossDonutWidget
            wins={data.metrics.winningTrades}
            losses={data.metrics.losingTrades}
          />
        );
      case "pnl-by-day":
        return <PnlByDayWidget days={data.dayOfWeekPnl} />;
      case "max-consec-wins":
        return (
          <StatWidget
            label="Max Consecutive Wins"
            value={data.metrics.maxConsecutiveWins.toString()}
            colorClass="text-profit"
          />
        );
      case "max-consec-losses":
        return (
          <StatWidget
            label="Max Consecutive Losses"
            value={data.metrics.maxConsecutiveLosses.toString()}
            colorClass="text-loss"
          />
        );
      case "pnl-by-price":
        return <PnlByPriceWidget ranges={data.priceRangePnl} />;
      case "risk-reward":
        return (
          <RiskRewardWidget
            avgWin={data.metrics.averageWin}
            avgLoss={data.metrics.averageLoss}
          />
        );
      case "pnl-by-hour":
        return <PnlByHourWidget hours={data.hourRangePnl} />;
      case "daily-pnl":
        return <DailyPnlChartWidget data={data.dailyPnl} />;
      case "drawdown":
        return <DrawdownWidget data={data.drawdownData} />;
      default:
        return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <DateRangeFilter />

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

      {/* ── Edit mode: sortable list + grid preview ── */}
      {editMode ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-5">
            {/* Left: sortable list */}
            <SortableContext
              items={enabledWidgets.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex w-[340px] shrink-0 flex-col gap-1.5">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Drag to reorder
                </p>
                {enabledWidgets.map((w, i) => (
                  <SortableEditRow
                    key={w.id}
                    id={w.id}
                    index={i}
                    onRemove={() => removeWidget(w.id)}
                  />
                ))}
              </div>
            </SortableContext>

            {/* Right: live grid preview */}
            <div className="flex-1 min-w-0">
              <GridPreview widgets={enabledWidgets} activeId={activeId} />
            </div>
          </div>

          <DragOverlay>
            {activeId ? (
              <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-card px-3 py-2 opacity-90 shadow-lg">
                <GripVertical className="h-4 w-4 text-muted-foreground/60" />
                <span className="text-sm font-medium">
                  {getWidgetDefinition(activeId)?.name ?? activeId}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* ── View mode: 4-column fixed grid ── */
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gridAutoRows: `${ROW_H}px`,
            gridAutoFlow: "dense",
            gap: `${GAP}px`,
          }}
        >
          {enabledWidgets.map((w) => {
            const def = getWidgetDefinition(w.id);
            if (!def) return null;
            const { colSpan, rowSpan } = sizeToGrid(def.size);
            return (
              <div
                key={w.id}
                className="overflow-hidden"
                style={{
                  gridColumn: `span ${colSpan}`,
                  gridRow: `span ${rowSpan}`,
                  height: `${spanHeight(rowSpan)}px`,
                }}
              >
                <div className="h-full [&>*]:h-full [&>*]:overflow-hidden">
                  {renderWidgetContent(w.id)}
                </div>
              </div>
            );
          })}
        </div>
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
