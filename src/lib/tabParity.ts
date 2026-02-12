/**
 * Shared layout tokens for tab/action visual parity.
 *
 * Rule:
 * - If an action button is meant to align under a top tab,
 *   place it in the same parity column using these constants.
 */

export const PARITY_ACTION_BUTTON_CLASS =
  'w-full min-h-[42px] px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200';

// Use when a component needs parity size but custom radius/padding.
export const PARITY_ACTION_BUTTON_SIZE_CLASS = 'w-full min-h-[42px] transition-all duration-200';

// Consumer/Trip tabs (8 columns)
export const TRIP_PARITY_ROW_CLASS = 'grid grid-cols-1 sm:grid-cols-8 gap-2 items-center';
export const TRIP_PARITY_HEADER_SPAN_CLASS = 'sm:col-span-7';
export const TRIP_PARITY_COL_START = {
  chat: 'sm:col-start-1',
  calendar: 'sm:col-start-2',
  concierge: 'sm:col-start-3',
  media: 'sm:col-start-4',
  payments: 'sm:col-start-5',
  places: 'sm:col-start-6',
  polls: 'sm:col-start-7',
  tasks: 'sm:col-start-8',
} as const;

// Event tabs (7 columns)
export const EVENT_PARITY_ROW_CLASS = 'grid grid-cols-1 md:grid-cols-7 gap-2 items-center';
export const EVENT_PARITY_HEADER_SPAN_CLASS = 'md:col-span-6';
export const EVENT_PARITY_COL_START = {
  agenda: 'md:col-start-1',
  calendar: 'md:col-start-2',
  chat: 'md:col-start-3',
  media: 'md:col-start-4',
  lineup: 'md:col-start-5',
  polls: 'md:col-start-6',
  tasks: 'md:col-start-7',
} as const;

// Pro tabs (9 columns)
export const PRO_PARITY_ROW_CLASS = 'grid grid-cols-1 md:grid-cols-9 gap-2 items-center';
export const PRO_PARITY_COL_START = {
  chat: 'md:col-start-1',
  calendar: 'md:col-start-2',
  concierge: 'md:col-start-3',
  media: 'md:col-start-4',
  payments: 'md:col-start-5',
  places: 'md:col-start-6',
  polls: 'md:col-start-7',
  tasks: 'md:col-start-8',
  team: 'md:col-start-9',
} as const;
