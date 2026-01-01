/**
 * ICS Branding Utility
 *
 * Centralizes logic for adding ChravelApp branding to iCalendar event titles.
 * This ensures consistent branding across all .ics export paths while avoiding
 * double-prefixing and respecting existing meeting platform prefixes.
 */

const CHRAVEL_PREFIX = 'ChravelApp:';
const FALLBACK_TITLE = 'Chravel Event';

/**
 * Known meeting platform prefixes that should NOT receive ChravelApp branding.
 * These are typically already branded by their respective platforms.
 */
const KNOWN_MEETING_PREFIXES = [
  'ZOOM:',
  'Google Meet:',
  'Teams:',
  'Webex:',
  'Microsoft Teams:',
  'Skype:',
  'GoToMeeting:',
  'BlueJeans:',
];

/**
 * Check if a title already has a known meeting platform prefix or ChravelApp prefix.
 * Case-insensitive comparison.
 *
 * @param title - The event title to check
 * @returns true if the title already has a prefix that should skip branding
 */
export function shouldSkipBranding(title: string): boolean {
  if (!title || typeof title !== 'string') {
    return false;
  }

  const trimmed = title.trim();
  const upperTitle = trimmed.toUpperCase();

  // Check if already has ChravelApp prefix (case-insensitive)
  if (upperTitle.startsWith(CHRAVEL_PREFIX.toUpperCase())) {
    return true;
  }

  // Check if has any known meeting platform prefix
  return KNOWN_MEETING_PREFIXES.some(prefix =>
    upperTitle.startsWith(prefix.toUpperCase())
  );
}

/**
 * Apply ChravelApp branding to an event title for iCalendar export.
 *
 * Rules:
 * - Empty/null titles get fallback: "ChravelApp: Chravel Event"
 * - Titles with leading/trailing whitespace are trimmed
 * - Already branded titles (ChravelApp:, ZOOM:, etc.) are returned as-is
 * - All other titles get "ChravelApp: " prefix
 *
 * @param originalTitle - The original event title from the database
 * @returns The branded title suitable for the SUMMARY field in .ics files
 *
 * @example
 * brandEventTitleForIcs('Team Meeting')
 * // Returns: 'ChravelApp: Team Meeting'
 *
 * @example
 * brandEventTitleForIcs('ZOOM: Daily Standup')
 * // Returns: 'ZOOM: Daily Standup' (no double-prefix)
 *
 * @example
 * brandEventTitleForIcs('ChravelApp: Beach Day')
 * // Returns: 'ChravelApp: Beach Day' (no double-prefix)
 *
 * @example
 * brandEventTitleForIcs('')
 * // Returns: 'ChravelApp: Chravel Event'
 */
export function brandEventTitleForIcs(originalTitle: string): string {
  // Handle empty/null/undefined titles
  if (!originalTitle || typeof originalTitle !== 'string' || originalTitle.trim() === '') {
    return `${CHRAVEL_PREFIX} ${FALLBACK_TITLE}`;
  }

  const trimmed = originalTitle.trim();

  // Skip branding if already has a known prefix
  if (shouldSkipBranding(trimmed)) {
    return trimmed;
  }

  // Apply ChravelApp branding
  return `${CHRAVEL_PREFIX} ${trimmed}`;
}

/**
 * Batch-brand multiple event titles.
 * Useful for processing arrays of events before export.
 *
 * @param titles - Array of event titles
 * @returns Array of branded titles in the same order
 */
export function brandEventTitles(titles: string[]): string[] {
  return titles.map(brandEventTitleForIcs);
}
