/**
 * Converts a range search-param value ("30d" | "60d" | "90d") into a cutoff Date.
 * Returns null when the range is "all" or unrecognised (= no filtering).
 */
export function getDateCutoff(range: string | undefined): Date | null {
  const days =
    range === "30d" ? 30 : range === "60d" ? 60 : range === "90d" ? 90 : null;
  if (!days) return null;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

/**
 * Build an entryDate Prisma filter from search params.
 * Supports both preset ranges (?range=30d) and custom date ranges (?dateFrom=...&dateTo=...).
 * Custom date range takes priority over preset range.
 */
export function getDateFilter(params: {
  range?: string;
  dateFrom?: string;
  dateTo?: string;
}): { gte?: Date; lte?: Date } | undefined {
  // Custom date range takes priority
  if (params.dateFrom || params.dateTo) {
    const filter: { gte?: Date; lte?: Date } = {};
    if (params.dateFrom) {
      const [y, m, d] = params.dateFrom.split("-").map(Number);
      filter.gte = new Date(y, m - 1, d);
    }
    if (params.dateTo) {
      const [y, m, d] = params.dateTo.split("-").map(Number);
      // End of day so we include trades on that date
      filter.lte = new Date(y, m - 1, d, 23, 59, 59, 999);
    }
    return filter;
  }

  // Fall back to preset range
  const cutoff = getDateCutoff(params.range);
  return cutoff ? { gte: cutoff } : undefined;
}
