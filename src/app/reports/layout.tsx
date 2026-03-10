import { ReportsNav } from "@/components/reports/reports-nav";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Reports</h1>
      </div>
      <ReportsNav />
      {children}
    </div>
  );
}
