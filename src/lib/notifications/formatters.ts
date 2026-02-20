/**
 * Notification formatting helpers.
 *
 * These provide consistent date ranges, location summaries, and trip display
 * names across push/email/SMS channels.
 */

export function formatDateRange(
  startDate: string | Date | undefined,
  endDate: string | Date | undefined,
): string {
  if (!startDate) return '';

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(start.getTime())) return '';

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const fmtDay = (d: Date) =>
    `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

  const fmtShort = (d: Date) =>
    `${monthNames[d.getMonth()]} ${d.getDate()}`;

  if (!endDate) return fmtDay(start);

  const end = endDate instanceof Date ? endDate : new Date(endDate);
  if (Number.isNaN(end.getTime())) return fmtDay(start);

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  ) {
    return fmtDay(start);
  }

  if (start.getFullYear() === end.getFullYear()) {
    return `${fmtShort(start)}\u2013${fmtDay(end)}`;
  }

  return `${fmtDay(start)}\u2013${fmtDay(end)}`;
}

export function formatLocationSummary(
  locations: string | string[] | undefined,
): string {
  if (!locations) return '';
  const list = Array.isArray(locations) ? locations : [locations];
  const filtered = list.filter(Boolean).map(l => l.trim());
  if (filtered.length === 0) return '';
  if (filtered.length <= 3) return filtered.join(', ');
  return `${filtered.slice(0, 2).join(', ')} +${filtered.length - 2} more`;
}

export function formatTripDisplayName(name: string | undefined): string {
  if (!name) return 'your trip';
  const trimmed = name.trim();
  if (trimmed.length > 50) return `${trimmed.substring(0, 47)}...`;
  return trimmed;
}

/**
 * Build the contextual suffix for trip/event notifications.
 * Example: " (Tokyo, Kyoto, Osaka \u2022 Jun 10\u2013Jun 25, 2026)"
 */
export function buildTripContext(ctx: {
  location?: string | string[];
  startDate?: string | Date;
  endDate?: string | Date;
}): string {
  const parts: string[] = [];
  const loc = formatLocationSummary(ctx.location);
  if (loc) parts.push(loc);
  const dates = formatDateRange(ctx.startDate, ctx.endDate);
  if (dates) parts.push(dates);
  if (parts.length === 0) return '';
  return ` (${parts.join(' \u2022 ')})`;
}

export function truncate(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, Math.max(maxLength - 3, 1))}...`;
}
