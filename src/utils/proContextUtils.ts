/**
 * Pro context detection for title rendering.
 *
 * Titles (Pro feature) should only be shown in Pro/Enterprise trip contexts.
 * Consumer trips never render titles even if the user has one set.
 */

/**
 * Trip type values from the DB.
 * 'pro' and 'event' are Pro contexts; 'consumer' is not.
 */
export type TripContextType = 'consumer' | 'pro' | 'event';

/**
 * Returns true if the given trip type allows Pro titles to be displayed.
 * Maps cleanly to the existing trip_type column ('consumer' | 'pro' | 'event').
 */
export function isProTitleContext(tripType: TripContextType | null | undefined): boolean {
  return tripType === 'pro' || tripType === 'event';
}
