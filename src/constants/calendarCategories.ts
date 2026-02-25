/**
 * Canonical calendar event categories for Chravel.
 *
 * The DB and adapters should only store/return these 6 canonical values.
 * Legacy alias categories are mapped to canonical via CATEGORY_ALIAS_MAP.
 */

export const CALENDAR_CATEGORIES = [
  'dining',
  'lodging',
  'activity',
  'transportation',
  'entertainment',
  'other',
] as const;

export type CalendarCategory = (typeof CALENDAR_CATEGORIES)[number];

/**
 * Maps legacy / redundant category names to canonical values.
 * Used by the adapter when reading DB data or user input.
 */
export const CATEGORY_ALIAS_MAP: Record<string, CalendarCategory> = {
  // Identity (canonical values map to themselves)
  dining: 'dining',
  lodging: 'lodging',
  activity: 'activity',
  transportation: 'transportation',
  entertainment: 'entertainment',
  other: 'other',

  // Legacy aliases
  food: 'dining',
  accommodations: 'lodging',
  fitness: 'activity',
  attractions: 'activity',
  nightlife: 'entertainment',
  budget: 'other',
};

/**
 * Normalizes any category string to a canonical CalendarCategory.
 * Unknown values default to 'other'.
 */
export function normalizeCalendarCategory(raw: string | null | undefined): CalendarCategory {
  if (!raw) return 'other';
  return CATEGORY_ALIAS_MAP[raw] ?? 'other';
}
