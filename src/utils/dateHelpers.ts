/**
 * Extract a YYYY-MM-DD string using the Date's **local** year/month/day.
 *
 * Unlike `date.toISOString().split('T')[0]`, this avoids shifting the date
 * when the local timezone is behind UTC.
 */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
