/**
 * Schema Adapter Utilities
 *
 * Transforms data between different trip schema formats to maintain
 * backward compatibility while enabling richer demo mode data.
 */

import { Trip as TripServiceTrip } from '@/services/tripService';

// Import type from tripsData for type safety
interface TripsDataTrip {
  id: number;
  title: string;
  location: string;
  dateRange: string;
  description: string;
  participants: Array<{ id: number; name: string; avatar: string }>;
  coverPhoto?: string;
  enabled_features?: string[];
  trip_type?: 'consumer' | 'pro' | 'event';
  archived?: boolean;
  privacy_mode?: 'standard' | 'high';
  ai_access_enabled?: boolean;
}

/**
 * Adapts tripsData schema to tripService.Trip schema
 *
 * This adapter ensures backward compatibility by converting the rich
 * demo mode trip data (tripsData) into the database-compatible Trip interface
 * that existing components expect.
 *
 * @param tripsDataArray - Array of trips from src/data/tripsData.ts
 * @returns Array of trips matching tripService.Trip interface
 */
export function adaptTripsDataToTripSchema(
  tripsDataArray: TripsDataTrip[]
): TripServiceTrip[] {
  return tripsDataArray.map(trip => {
    // Parse dateRange string (e.g., "Mar 15 - Mar 22, 2026") into start/end dates
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (trip.dateRange) {
      try {
        const parts = trip.dateRange.split(' - ');
        if (parts.length === 2) {
          // Extract year from the end date (e.g., "Mar 22, 2026")
          const yearMatch = parts[1].match(/\d{4}/);
          const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

          // Convert "Mar 15" to "2026-03-15" format
          const startDateStr = parts[0].trim();
          const endDateStr = parts[1].replace(/,?\s*\d{4}/, '').trim();

          // Simple month mapping
          const monthMap: Record<string, string> = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
          };

          const parseDate = (dateStr: string) => {
            const match = dateStr.match(/([A-Za-z]{3})\s+(\d{1,2})/);
            if (match) {
              const month = monthMap[match[1]] || '01';
              const day = match[2].padStart(2, '0');
              return `${year}-${month}-${day}`;
            }
            return undefined;
          };

          startDate = parseDate(startDateStr);
          endDate = parseDate(endDateStr);
        }
      } catch (error) {
        console.warn('Failed to parse dateRange:', trip.dateRange, error);
      }
    }

    return {
      // Type conversion: number → string (required by database)
      id: String(trip.id),

      // Field rename: title → name (database field name)
      name: trip.title,

      // Direct mapping: description
      description: trip.description,

      // Date parsing: dateRange → start_date/end_date
      start_date: startDate,
      end_date: endDate,

      // Field rename: location → destination (database field name)
      destination: trip.location,

      // Field rename: coverPhoto → cover_image_url (database field name)
      // Note: coverPhoto in tripsData may be an imported image object
      cover_image_url: typeof trip.coverPhoto === 'string' ? trip.coverPhoto : '',

      // Demo mode metadata: All demo trips created by demo user
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      // Field rename: archived → is_archived (database field name)
      is_archived: trip.archived || false,

      // Direct mapping: trip_type
      trip_type: trip.trip_type || 'consumer',

      // Optional fields: Not present in tripsData, set to undefined
      basecamp_name: undefined,
      basecamp_address: undefined
    };
  });
}

/**
 * Type guard to check if data matches tripsData schema
 */
export function isTripsDataFormat(data: any): data is TripsDataTrip {
  return (
    typeof data === 'object' &&
    typeof data.id === 'number' &&
    typeof data.title === 'string' &&
    typeof data.location === 'string' &&
    Array.isArray(data.participants)
  );
}
