interface StatWidgetProps {
  label: string;
  value: string;
  colorClass?: string;
}

export function StatWidget({
  label,
  value,
  colorClass = "text-foreground",
}: StatWidgetProps) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-xl font-semibold tabular-nums ${colorClass}`}
      >
        {value}
      </p>
    </div>
  );
}
