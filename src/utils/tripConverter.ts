import { Trip as MockTrip } from '@/data/tripsData';
import { Trip as SupabaseTrip } from '@/services/tripService';
import { format } from 'date-fns';

/**
 * Converts a Supabase trip to the mock trip format expected by UI components
 */
export function convertSupabaseTripToMock(supabaseTrip: SupabaseTrip): MockTrip {
  // Format date range from start_date and end_date
  let dateRange = '';
  if (supabaseTrip.start_date && supabaseTrip.end_date) {
    try {
      const startDate = new Date(supabaseTrip.start_date);
      const endDate = new Date(supabaseTrip.end_date);
      dateRange = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    } catch (e) {
      dateRange = `${supabaseTrip.start_date} - ${supabaseTrip.end_date}`;
    }
  }

  return {
    id: supabaseTrip.id as any, // Keep UUID string for service calls
    title: supabaseTrip.name || 'Untitled Trip',
    location: supabaseTrip.destination || 'No destination',
    dateRange,
    description: supabaseTrip.description || '',
    participants: [], // Participants loaded separately via trip_members
    coverPhoto: supabaseTrip.cover_image_url,
    trip_type: (supabaseTrip.trip_type || 'consumer') as 'consumer' | 'pro' | 'event',
    archived: supabaseTrip.is_archived,
  };
}

/**
 * Converts an array of Supabase trips to mock format
 */
export function convertSupabaseTripsToMock(supabaseTrips: SupabaseTrip[]): MockTrip[] {
  return supabaseTrips.map(convertSupabaseTripToMock);
}
