/**
 * Deterministic hash for calendar import idempotency.
 *
 * Prevents duplicate events when the same screenshot/PDF is imported multiple
 * times. The hash is stored in `source_data.import_hash` on the trip_events row.
 */

export function createHash(
  tripId: string,
  title: string,
  startDatetime: string,
  source: string,
): string {
  const input = `${tripId}|${title.trim().toLowerCase()}|${startDatetime}|${source.trim().toLowerCase()}`;
  // Simple deterministic hash (djb2)
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return `imp_${(hash >>> 0).toString(36)}`;
}
