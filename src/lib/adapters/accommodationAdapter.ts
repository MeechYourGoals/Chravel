/**
 * Accommodation adapter: converts between Supabase DB rows and app-level types.
 *
 * DB table: user_accommodations (accommodation_name, accommodation_type, check_in/check_out)
 * App type: UserAccommodation (label, no type/check-in/check-out)
 *
 * Key mismatch resolved:
 * - accommodation_name -> label
 */

import type { Database } from '../../integrations/supabase/types';
import type { UserAccommodation } from '../../types/accommodations';

type AccommodationRow = Database['public']['Tables']['user_accommodations']['Row'];

/**
 * Converts a Supabase user_accommodations row to an app-level UserAccommodation.
 *
 * Handles:
 * - accommodation_name -> label
 * - Nullable address -> empty string fallback
 * - is_private defaults to false (not in DB; app-only concept)
 * - place_id not in DB; defaults to undefined
 */
export function toAppAccommodation(row: AccommodationRow): UserAccommodation {
  return {
    id: row.id,
    trip_id: row.trip_id,
    user_id: row.user_id,
    label: row.accommodation_name,
    address: row.address ?? '',
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    place_id: undefined, // Not stored in DB
    is_private: false, // Not stored in DB; app default
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
  };
}

/**
 * Converts app-level accommodation data to a DB-compatible insert payload.
 */
export function toDbAccommodationInsert(
  tripId: string,
  userId: string,
  data: {
    label?: string;
    address: string;
    latitude?: number;
    longitude?: number;
  },
): Database['public']['Tables']['user_accommodations']['Insert'] {
  return {
    trip_id: tripId,
    user_id: userId,
    accommodation_name: data.label ?? data.address,
    address: data.address,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  };
}
