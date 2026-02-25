/**
 * Shared layout tokens for tab/action visual parity.
 *
 * Rule:
 * - If an action button is meant to align under a top tab,
 *   place it in the same parity column using these constants.
 */

/**
 * Trip card action button styles - ensures visual parity across Recap, Invite, View, Share.
 * Used by TripCard, ProTripCard, EventCard, MobileEventCard for both demo and authenticated modes.
 * Do NOT add gold/yellow/gradient to View or Recap - all four buttons must match.
 */
export const TRIP_CARD_ACTION_BUTTON_CONSUMER =
  'bg-gray-800/50 hover:bg-gray-700/50 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700 hover:border-gray-600 text-xs md:text-sm flex items-center justify-center gap-1.5';

export const TRIP_CARD_ACTION_BUTTON_PRO_EVENT =
  'bg-black/30 hover:bg-black/40 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-xs md:text-sm flex items-center justify-center gap-2';

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

// Event tabs (8 columns)
export const EVENT_PARITY_ROW_CLASS = 'grid grid-cols-1 md:grid-cols-8 gap-2 items-center';
export const EVENT_PARITY_HEADER_SPAN_CLASS = 'md:col-span-7';
export const EVENT_PARITY_COL_START = {
  admin: 'md:col-start-1',
  agenda: 'md:col-start-2',
  calendar: 'md:col-start-3',
  chat: 'md:col-start-4',
  lineup: 'md:col-start-5',
  media: 'md:col-start-6',
  polls: 'md:col-start-7',
  tasks: 'md:col-start-8',
} as const;

// Pro tabs (9 columns)
export const PRO_PARITY_ROW_CLASS = 'grid grid-cols-1 md:grid-cols-9 gap-2 items-center';
export const PRO_PARITY_HEADER_SPAN_CLASS = 'md:col-span-8';
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
