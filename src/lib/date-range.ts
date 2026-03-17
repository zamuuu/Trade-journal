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
