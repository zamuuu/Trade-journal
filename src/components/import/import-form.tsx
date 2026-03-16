"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { previewImport, confirmImport } from "@/actions/import-actions";
import { ReconstructedTrade } from "@/types";

export function ImportForm() {
  const [broker, setBroker] = useState("sterling");
  const [tradeDate, setTradeDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    trades: ReconstructedTrade[];
    duplicateCount: number;
    totalExecutions: number;
    skippedExecutions: number;
    newTradesCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    importedCount?: number;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const needsDate = broker === "das" || broker === "hammer";
  const fileAccept = broker === "hammer" ? ".xlsx" : ".txt,.csv";
  const canPreview = file && (!needsDate || tradeDate);

  async function handlePreview() {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setPreview(null);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("broker", broker);
    if (tradeDate) formData.set("tradeDate", tradeDate);

    const res = await previewImport(formData);
    if ("error" in res) {
      setResult({ error: res.error });
    } else {
      setPreview(res as typeof preview);
    }
    setLoading(false);
  }

  async function handleConfirm() {
    if (!file) return;
    setImporting(true);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("broker", broker);
    if (tradeDate) formData.set("tradeDate", tradeDate);

    const res = await confirmImport(formData);
    setResult(res);
    setImporting(false);
    if (res.success) {
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload section */}
      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-3 text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Upload File</p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground">Broker</label>
            <Select
              value={broker}
              onValueChange={(v) => {
                if (!v) return;
                setBroker(v);
                setFile(null);
                setPreview(null);
                setResult(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            >
              <SelectTrigger className="h-9 w-64 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sterling">Sterling Trader Pro</SelectItem>
                <SelectItem value="das">DAS Trader Pro</SelectItem>
                <SelectItem value="hammer">Hammer Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {needsDate && (
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-muted-foreground">
                Trade Date for this import
              </label>
              <input
                type="date"
                value={tradeDate}
                onChange={(e) => {
                  setTradeDate(e.target.value);
                  setPreview(null);
                  setResult(null);
                }}
                className="flex h-9 w-64 rounded-md border border-border bg-card px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-muted-foreground">File</label>
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border py-8 transition-colors hover:border-muted-foreground hover:bg-accent/30"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-[12px] text-muted-foreground">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              ) : (
                <>
                  <Upload className="mb-1.5 h-5 w-5 text-muted-foreground" />
                  <p className="text-[13px] text-muted-foreground">
                    Click to select a {broker === "hammer" ? ".xlsx" : ".txt or .csv"} file
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={fileAccept}
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setPreview(null);
                  setResult(null);
                }}
              />
            </div>
          </div>

          <Button onClick={handlePreview} disabled={!canPreview || loading} className="h-9 w-full text-sm">
            {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Preview Import
          </Button>
        </div>
      </div>

      {/* Error */}
      {result?.error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </div>
      )}

      {/* Success */}
      {result?.success && (
        <div className="flex items-center gap-2 rounded-md border border-profit/30 bg-profit/5 px-3 py-2 text-sm text-profit">
          <Check className="h-4 w-4 shrink-0" />
          Imported {result.importedCount} trade{result.importedCount !== 1 ? "s" : ""} successfully.
        </div>
      )}

      {/* Preview */}
      {preview && preview.trades.length > 0 && (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">Preview</p>
            <div className="flex gap-3 text-[12px] text-muted-foreground">
              <span>{preview.totalExecutions} executions</span>
              <span>{preview.trades.length} trades</span>
              {preview.duplicateCount > 0 && (
                <span className="text-loss">{preview.duplicateCount} duplicate(s)</span>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Symbol</TableHead>
                  <TableHead className="h-9 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Side</TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Qty</TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Entry</TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Exit</TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">PnL</TableHead>
                  <TableHead className="h-9 text-right text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Execs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.trades.map((trade, i) => (
                  <TableRow key={i} className="hover:bg-transparent">
                    <TableCell className="py-1.5 text-[13px] font-medium">{trade.symbol}</TableCell>
                    <TableCell className="py-1.5">
                      <span className={`text-[12px] font-semibold ${trade.side === "LONG" ? "text-profit" : "text-loss"}`}>
                        {trade.side}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">{trade.totalQuantity}</TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">${trade.avgEntryPrice.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[13px] tabular-nums">${trade.avgExitPrice?.toFixed(2) ?? "--"}</TableCell>
                    <TableCell className={`py-1.5 text-right font-mono text-[13px] font-semibold tabular-nums ${
                      trade.pnl > 0 ? "text-profit" : trade.pnl < 0 ? "text-loss" : "text-flat"
                    }`}>
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-[12px] tabular-nums text-muted-foreground">
                      {trade.executions.length}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-[13px]">
              <span className="text-muted-foreground">Total PnL: </span>
              <span className={`font-mono font-semibold tabular-nums ${
                preview.trades.reduce((s, t) => s + t.pnl, 0) >= 0 ? "text-profit" : "text-loss"
              }`}>
                ${preview.trades.reduce((s, t) => s + t.pnl, 0).toFixed(2)}
              </span>
            </div>
            <Button onClick={handleConfirm} disabled={importing} size="sm" className="h-8">
              {importing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Confirm Import ({preview.newTradesCount} new)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
