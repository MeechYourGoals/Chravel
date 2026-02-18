/**
 * Format session date/time for display.
 * Handles invalid dates gracefully with fallback.
 */

import { format, parseISO, isValid } from 'date-fns';

/**
 * Format session_date for display (e.g. "MMM d").
 * Returns empty string if date is invalid.
 */
export function formatSessionDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    return isValid(d) ? format(d, 'MMM d') : dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Format full session date + time range for display.
 * e.g. "MMM d — 09:00 - 10:30"
 */
export function formatSessionDateTime(
  sessionDate: string | undefined,
  startTime?: string,
  endTime?: string,
): string {
  const datePart = formatSessionDate(sessionDate);
  const timePart = [startTime, endTime].filter(Boolean).join(' - ');
  if (datePart && timePart) return `${datePart} — ${timePart}`;
  if (datePart) return datePart;
  return timePart || '';
}
