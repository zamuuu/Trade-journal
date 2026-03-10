import { ImportForm } from "@/components/import/import-form";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Import Trades</h1>
        <p className="text-sm text-muted-foreground">
          Upload your execution files to import and reconstruct trades.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
