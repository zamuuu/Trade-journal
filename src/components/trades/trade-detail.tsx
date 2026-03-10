"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Trash2,
  X,
  Plus,
  Upload,
  Loader2,
  FileText,
  Save,
  ChevronDown,
  ImageIcon,
  Clipboard,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  updateTradeNotes,
  updateTradeSetup,
  addTagToTrade,
  removeTagFromTrade,
  deleteTrade,
} from "@/actions/trade-actions";
import {
  uploadScreenshot,
  deleteScreenshot,
  updateScreenshotCaption,
} from "@/actions/screenshot-actions";
import {
  createNoteTemplate,
  deleteNoteTemplate,
} from "@/actions/template-actions";

// ─── Types ───────────────────────────────────────────────────────

interface Execution {
  id: string;
  side: string;
  quantity: number;
  price: number;
  timestamp: Date;
}

interface Tag {
  id: string;
  name: string;
}

interface Screenshot {
  id: string;
  filePath: string;
  caption: string | null;
  category: string;
  createdAt: Date;
}

interface NoteTemplate {
  id: string;
  name: string;
  content: string;
}

interface Trade {
  id: string;
  symbol: string;
  side: string;
  status: string;
  entryDate: Date;
  exitDate: Date | null;
  totalQuantity: number;
  avgEntryPrice: number;
  avgExitPrice: number | null;
  pnl: number;
  notes: string | null;
  setup: string | null;
  executions: Execution[];
  tags: Tag[];
  screenshots: Screenshot[];
}

interface TradeDetailProps {
  trade: Trade;
  allTags: Tag[];
  allSetups: string[];
  noteTemplates: NoteTemplate[];
}

// ─── Autocomplete Input ──────────────────────────────────────────

function AutocompleteInput({
  value,
  onChange,
  onSubmit,
  suggestions,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  suggestions: string[];
  placeholder: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(value.toLowerCase()) &&
          s.toLowerCase() !== value.toLowerCase()
      )
    : suggestions;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && filtered.length > 0) {
        setOpen(true);
        setHighlightIdx(0);
      } else {
        setHighlightIdx((prev) => Math.min(prev + 1, filtered.length - 1));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlightIdx >= 0 && highlightIdx < filtered.length) {
        const picked = filtered[highlightIdx];
        onChange(picked);
        onSubmit(picked);
        setOpen(false);
        setHighlightIdx(-1);
      } else {
        onSubmit(value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIdx(-1);
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightIdx(-1);
        }}
        onFocus={() => {
          if (filtered.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover py-1 shadow-lg">
          {filtered.map((item, i) => (
            <button
              key={item}
              type="button"
              className={`flex w-full items-center px-3 py-1.5 text-left text-[13px] transition-colors ${
                i === highlightIdx
                  ? "bg-accent text-foreground"
                  : "text-foreground hover:bg-accent/50"
              }`}
              onMouseEnter={() => setHighlightIdx(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(item);
                onSubmit(item);
                setOpen(false);
                setHighlightIdx(-1);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Screenshot Category Section ─────────────────────────────────

const SCREENSHOT_CATEGORIES = [
  { key: "historical", label: "Historical Chart" },
  { key: "intraday", label: "Intraday Chart" },
  { key: "other", label: "Other" },
] as const;

// ─── Image Lightbox ──────────────────────────────────────────────

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const translateStart = useRef({ x: 0, y: 0 });

  const MIN_SCALE = 0.25;
  const MAX_SCALE = 8;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta * prev)));
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    translateStart.current = { ...translate };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setTranslate({
      x: translateStart.current.x + (e.clientX - dragStart.current.x),
      y: translateStart.current.y + (e.clientY - dragStart.current.y),
    });
  }

  function handlePointerUp() {
    setDragging(false);
  }

  function resetView() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={handleWheel}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-[101] flex items-center gap-1.5">
        <button
          onClick={() => setScale((s) => Math.min(MAX_SCALE, s * 1.4))}
          className="rounded-md bg-background/60 p-2 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(MIN_SCALE, s / 1.4))}
          className="rounded-md bg-background/60 p-2 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="rounded-md bg-background/60 p-2 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={onClose}
          className="rounded-md bg-background/60 p-2 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-background/80 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-1/2 z-[101] -translate-x-1/2 rounded-md bg-background/60 px-3 py-1.5 font-mono text-[12px] text-muted-foreground tabular-nums backdrop-blur-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] select-none"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          cursor: dragging ? "grabbing" : "grab",
          transition: dragging ? "none" : "transform 0.1s ease-out",
        }}
        draggable={false}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}

// ─── Screenshot Card ─────────────────────────────────────────────

function ScreenshotCard({
  screenshot,
  onDelete,
  onCaptionSave,
  onImageClick,
}: {
  screenshot: Screenshot;
  onDelete: () => void;
  onCaptionSave: (caption: string) => void;
  onImageClick: () => void;
}) {
  const [caption, setCaption] = useState(screenshot.caption ?? "");
  const [editing, setEditing] = useState(false);

  return (
    <div className="group rounded-md border border-border bg-background/50 overflow-hidden">
      <div className="relative">
        <img
          src={screenshot.filePath}
          alt={screenshot.caption ?? "Screenshot"}
          className="w-full cursor-pointer object-cover transition-opacity hover:opacity-90"
          onClick={onImageClick}
        />
        <button
          onClick={onDelete}
          className="absolute right-1.5 top-1.5 rounded bg-background/80 p-1 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <div className="p-2">
        {editing ? (
          <div className="flex gap-1.5">
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onCaptionSave(caption);
                  setEditing(false);
                }
                if (e.key === "Escape") setEditing(false);
              }}
              placeholder="Add a caption..."
              className="h-7 text-[12px]"
              autoFocus
            />
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                onCaptionSave(caption);
                setEditing(false);
              }}
            >
              <Save className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="w-full text-left text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {caption || "Click to add caption..."}
          </button>
        )}
      </div>
    </div>
  );
}

function ScreenshotCategorySection({
  category,
  label,
  screenshots,
  tradeId,
  uploading,
  onUpload,
  onDelete,
  onCaptionSave,
  onPaste,
  onImageClick,
}: {
  category: string;
  label: string;
  screenshots: Screenshot[];
  tradeId: string;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, cat: string) => void;
  onDelete: (id: string) => void;
  onCaptionSave: (id: string, caption: string) => void;
  onPaste: (category: string) => void;
  onImageClick: (src: string, alt: string) => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Upload
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e, category)}
          />
        </label>
      </div>
      {screenshots.length > 0 ? (
        <div
          className="grid grid-cols-2 gap-2"
          tabIndex={0}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={() => onPaste(category)}
        >
          {screenshots.map((s) => (
            <ScreenshotCard
              key={s.id}
              screenshot={s}
              onDelete={() => onDelete(s.id)}
              onCaptionSave={(caption) => onCaptionSave(s.id, caption)}
              onImageClick={() =>
                onImageClick(s.filePath, s.caption ?? "Screenshot")
              }
            />
          ))}
        </div>
      ) : (
        <div
          tabIndex={0}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={() => onPaste(category)}
          className={`flex h-16 cursor-pointer items-center justify-center rounded-md border border-dashed text-[11px] transition-colors outline-none ${
            focused
              ? "border-primary/50 bg-primary/5 text-muted-foreground"
              : "border-border/50 text-muted-foreground/50 hover:border-border hover:text-muted-foreground/70"
          }`}
        >
          {uploading ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : focused ? (
            <>
              <Clipboard className="mr-1.5 h-3.5 w-3.5" />
              Ctrl+V to paste image
            </>
          ) : (
            <>
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
              Click here, then Ctrl+V to paste
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Note Templates Dropdown ─────────────────────────────────────

function NoteTemplatesDropdown({
  templates,
  onApply,
  currentNotes,
  onTemplatesChange,
}: {
  templates: NoteTemplate[];
  onApply: (content: string) => void;
  currentNotes: string;
  onTemplatesChange: (templates: NoteTemplate[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSaveAsTemplate() {
    if (!newName.trim() || !currentNotes.trim()) return;
    setSaving(true);
    const result = await createNoteTemplate(newName, currentNotes);
    setSaving(false);
    if (result.success && result.template) {
      onTemplatesChange([...templates, result.template]);
      setNewName("");
    }
  }

  async function handleDeleteTemplate(id: string) {
    await deleteNoteTemplate(id);
    onTemplatesChange(templates.filter((t) => t.id !== id));
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-[12px] text-muted-foreground"
        onClick={() => setOpen(!open)}
      >
        <FileText className="h-3.5 w-3.5" />
        Templates
        <ChevronDown className="h-3 w-3" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-border bg-popover p-2 shadow-lg">
          {/* Apply existing templates */}
          {templates.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Apply Template
              </p>
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-accent/50"
                >
                  <button
                    className="flex-1 text-left text-[13px] text-foreground"
                    onClick={() => {
                      onApply(t.content);
                      setOpen(false);
                    }}
                  >
                    {t.name}
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(t.id)}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="my-2 border-t border-border" />
            </div>
          )}

          {/* Save current as template */}
          <p className="mb-1 px-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Save Current Notes as Template
          </p>
          <div className="flex gap-1.5">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveAsTemplate();
              }}
              placeholder="Template name..."
              className="h-7 text-[12px]"
            />
            <Button
              size="sm"
              className="h-7 px-2"
              onClick={handleSaveAsTemplate}
              disabled={saving || !newName.trim() || !currentNotes.trim()}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
            </Button>
          </div>
          {!currentNotes.trim() && (
            <p className="mt-1 px-1 text-[10px] text-muted-foreground/60">
              Write notes first to save as template
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Trade Detail ────────────────────────────────────────────────

export function TradeDetail({
  trade,
  allTags,
  allSetups,
  noteTemplates: initialTemplates,
}: TradeDetailProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(trade.notes ?? "");
  const [setup, setSetup] = useState(trade.setup ?? "");
  const [newTag, setNewTag] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingSetup, setSavingSetup] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(
    null
  );
  const [templates, setTemplates] = useState(initialTemplates);
  const [lightbox, setLightbox] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  async function handleSaveNotes() {
    setSavingNotes(true);
    await updateTradeNotes(trade.id, notes);
    setSavingNotes(false);
  }

  async function handleSaveSetup() {
    setSavingSetup(true);
    await updateTradeSetup(trade.id, setup);
    setSavingSetup(false);
  }

  async function handleAddTag() {
    if (!newTag.trim()) return;
    await addTagToTrade(trade.id, newTag);
    setNewTag("");
  }

  async function handleRemoveTag(tagId: string) {
    await removeTagFromTrade(trade.id, tagId);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    await deleteTrade(trade.id);
    router.push("/trades");
  }

  async function handleUploadScreenshot(
    e: React.ChangeEvent<HTMLInputElement>,
    category: string
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCategory(category);
    const formData = new FormData();
    formData.set("file", file);
    await uploadScreenshot(trade.id, formData, category);
    setUploadingCategory(null);
    e.target.value = "";
  }

  async function handleDeleteScreenshot(screenshotId: string) {
    if (!confirm("Delete this screenshot?")) return;
    await deleteScreenshot(screenshotId);
  }

  async function handleCaptionSave(screenshotId: string, caption: string) {
    await updateScreenshotCaption(screenshotId, caption);
  }

  // Global paste listener scoped to screenshot sections
  const handlePasteForCategory = useCallback(
    async (category: string) => {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            const ext = imageType.split("/")[1] || "png";
            const file = new File([blob], `paste_${Date.now()}.${ext}`, {
              type: imageType,
            });
            setUploadingCategory(category);
            const formData = new FormData();
            formData.set("file", file);
            await uploadScreenshot(trade.id, formData, category);
            setUploadingCategory(null);
            return;
          }
        }
      } catch {
        // Clipboard API may not be available or permission denied — ignore
      }
    },
    [trade.id]
  );

  function handleImageClick(src: string, alt: string) {
    setLightbox({ src, alt });
  }

  function handleApplyTemplate(content: string) {
    if (notes.trim()) {
      setNotes(notes + "\n\n" + content);
    } else {
      setNotes(content);
    }
  }

  const sideLabel = (side: string) => {
    switch (side) {
      case "BUY":
        return "BUY";
      case "SELL":
        return "SELL";
      case "SELL_SHORT":
        return "SHORT";
      default:
        return side;
    }
  };

  const sideColor = (side: string) => {
    return side === "BUY" ? "text-profit" : "text-loss";
  };

  const pnlColor =
    trade.pnl > 0 ? "text-profit" : trade.pnl < 0 ? "text-loss" : "text-flat";

  // Group screenshots by category
  const screenshotsByCategory = SCREENSHOT_CATEGORIES.map((cat) => ({
    ...cat,
    screenshots: trade.screenshots.filter((s) => s.category === cat.key),
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/trades">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground"
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-semibold">{trade.symbol}</h1>
              <span
                className={`text-sm font-semibold ${
                  trade.side === "LONG" ? "text-profit" : "text-loss"
                }`}
              >
                {trade.side}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {trade.status}
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground">
              {format(new Date(trade.entryDate), "MMM dd, yyyy HH:mm:ss")}
              {trade.exitDate &&
                ` — ${format(new Date(trade.exitDate), "HH:mm:ss")}`}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="h-7 px-2 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            PnL
          </p>
          <p
            className={`mt-1 font-mono text-2xl font-bold tabular-nums ${pnlColor}`}
          >
            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Size
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
            {trade.totalQuantity}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Avg Entry
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
            ${trade.avgEntryPrice.toFixed(2)}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Avg Exit
          </p>
          <p className="mt-1 font-mono text-xl font-semibold tabular-nums">
            {trade.avgExitPrice
              ? `$${trade.avgExitPrice.toFixed(2)}`
              : "--"}
          </p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-[1fr_340px] gap-4">
        {/* LEFT COLUMN: Notes + Screenshots */}
        <div className="space-y-4">
          {/* Notes */}
          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
                Notes
              </p>
              <div className="flex items-center gap-1.5">
                <NoteTemplatesDropdown
                  templates={templates}
                  onApply={handleApplyTemplate}
                  currentNotes={notes}
                  onTemplatesChange={setTemplates}
                />
              </div>
            </div>
            <Textarea
              placeholder="Write your notes about this trade... analysis, mistakes, what went well, lessons learned..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              className="mb-3 min-h-[200px] text-sm leading-relaxed"
            />
            <Button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              size="sm"
              className="h-8"
            >
              {savingNotes ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              Save Notes
            </Button>
          </div>

          {/* Screenshots by category */}
          <div className="rounded-md border border-border bg-card p-4">
            <p className="mb-4 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              Screenshots
            </p>
            <div className="space-y-4">
              {screenshotsByCategory.map((cat) => (
                <ScreenshotCategorySection
                  key={cat.key}
                  category={cat.key}
                  label={cat.label}
                  screenshots={cat.screenshots}
                  tradeId={trade.id}
                  uploading={uploadingCategory === cat.key}
                  onUpload={handleUploadScreenshot}
                  onDelete={handleDeleteScreenshot}
                  onCaptionSave={handleCaptionSave}
                  onPaste={handlePasteForCategory}
                  onImageClick={handleImageClick}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Executions + Setup + Tags */}
        <div className="space-y-4">
          {/* Setup */}
          <div className="rounded-md border border-border bg-card p-4">
            <p className="mb-2 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              Setup
            </p>
            <div className="flex gap-2">
              <AutocompleteInput
                value={setup}
                onChange={setSetup}
                onSubmit={(val) => {
                  setSetup(val);
                  setSavingSetup(true);
                  updateTradeSetup(trade.id, val).then(() =>
                    setSavingSetup(false)
                  );
                }}
                suggestions={allSetups}
                placeholder="breakout, reversal, gap-up..."
                className="h-8 text-sm"
              />
              <Button
                onClick={handleSaveSetup}
                disabled={savingSetup}
                size="sm"
                className="h-8"
              >
                {savingSetup ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-md border border-border bg-card p-4">
            <p className="mb-2 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              Tags
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {trade.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="h-6 gap-1 text-[11px]"
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <AutocompleteInput
                value={newTag}
                onChange={setNewTag}
                onSubmit={(val) => {
                  if (!val.trim()) return;
                  setNewTag("");
                  addTagToTrade(trade.id, val);
                }}
                suggestions={allTags
                  .map((t) => t.name)
                  .filter(
                    (name) => !trade.tags.some((t) => t.name === name)
                  )}
                placeholder="Add tag..."
                className="h-8 text-sm"
              />
              <Button
                onClick={handleAddTag}
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Executions */}
          <div className="rounded-md border border-border bg-card p-4">
            <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              Executions ({trade.executions.length})
            </p>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Time
                  </TableHead>
                  <TableHead className="h-9 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Side
                  </TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Qty
                  </TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    Price
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trade.executions.map((exec) => (
                  <TableRow key={exec.id} className="hover:bg-transparent">
                    <TableCell className="py-2 font-mono text-sm tabular-nums text-muted-foreground">
                      {format(new Date(exec.timestamp), "HH:mm:ss")}
                    </TableCell>
                    <TableCell className="py-2">
                      <span
                        className={`text-[13px] font-semibold ${sideColor(
                          exec.side
                        )}`}
                      >
                        {sideLabel(exec.side)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm tabular-nums">
                      {exec.quantity}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm tabular-nums">
                      ${exec.price.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
