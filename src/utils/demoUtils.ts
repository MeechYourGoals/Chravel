/**
 * Demo mode utilities — shared logic for identifying demo trips.
 * Keeps demo detection consistent across payment, balance, and trip flows.
 */

/** Trip IDs 1–12 are consumer demo trips. */
const DEMO_TRIP_ID_MIN = 1;
const DEMO_TRIP_ID_MAX = 12;

/**
 * Returns true if tripId is a numeric demo trip ID (1–12).
 * Use this instead of duplicating the check across components.
 */
export function isDemoTrip(tripId: string | undefined): boolean {
  if (!tripId) return false;
  const num = parseInt(tripId, 10);
  return /^\d+$/.test(tripId) && !isNaN(num) && num >= DEMO_TRIP_ID_MIN && num <= DEMO_TRIP_ID_MAX;
}
