import { ReportsNav } from "@/components/reports/reports-nav";
import { DateRangeFilter } from "@/components/dashboard/date-range-filter";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Reports</h1>
        <DateRangeFilter />
      </div>
      <ReportsNav />
      {children}
    </div>
  );
}
