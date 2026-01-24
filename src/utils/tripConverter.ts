import { Trip as MockTrip } from '@/data/tripsData';
import { Trip as SupabaseTrip } from '@/services/tripService';
import { format } from 'date-fns';
import { ProTripData } from '@/types/pro';
import { EventData } from '@/types/events';

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
    } catch {
      dateRange = `${supabaseTrip.start_date} - ${supabaseTrip.end_date}`;
    }
  }

  // Extract counts from joined tables (Supabase returns [{count: N}] for count aggregates)
  const peopleCount = (supabaseTrip as any).trip_members?.[0]?.count ?? 0;
  const placesCount = (supabaseTrip as any).trip_links?.[0]?.count ?? 0;

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
    peopleCount,
    placesCount,
    membership_status: supabaseTrip.membership_status, // Preserve membership status (pending, owner, member)
    created_by: supabaseTrip.created_by, // Preserve creator ID for Exit Trip button visibility
  };
}

/**
 * Converts an array of Supabase trips to mock format
 */
export function convertSupabaseTripsToMock(supabaseTrips: SupabaseTrip[]): MockTrip[] {
  return supabaseTrips.map(convertSupabaseTripToMock);
}

/**
 * Converts a Supabase trip to ProTripData format
 */
export function convertSupabaseTripToProTrip(supabaseTrip: SupabaseTrip): ProTripData {
  const mockTrip = convertSupabaseTripToMock(supabaseTrip);

  return {
    id: supabaseTrip.id,
    title: mockTrip.title,
    description: mockTrip.description || '',
    location: mockTrip.location,
    dateRange: mockTrip.dateRange,
    proTripCategory: 'Other',
    tags: [],
    participants: [],
    budget: {
      total: 0,
      spent: 0,
      categories: [],
    },
    itinerary: [],
    roster: [],
    roomAssignments: [],
    schedule: [],
    perDiem: {
      dailyRate: 0,
      currency: 'USD',
      startDate: supabaseTrip.start_date || '',
      endDate: supabaseTrip.end_date || '',
      participants: [],
    },
    settlement: [],
    medical: [],
    compliance: [],
    media: [],
    sponsors: [],
    archived: supabaseTrip.is_archived,
    trip_type: 'pro',
    privacy_mode: 'standard',
    ai_access_enabled: true,
    coverPhoto: supabaseTrip.cover_image_url ?? undefined,
    card_color: (supabaseTrip as any).card_color ?? undefined,
  };
}

/**
 * Converts a Supabase trip to EventData format
 */
export function convertSupabaseTripToEvent(supabaseTrip: SupabaseTrip): EventData {
  const mockTrip = convertSupabaseTripToMock(supabaseTrip);

  return {
    id: supabaseTrip.id,
    title: mockTrip.title,
    location: mockTrip.location,
    dateRange: mockTrip.dateRange,
    category: 'Conference',
    description: mockTrip.description || '',
    tags: [],
    capacity: 100,
    registrationStatus: 'open',
    attendanceExpected: 0,
    groupChatEnabled: true,
    archived: supabaseTrip.is_archived,
    tracks: [],
    speakers: [],
    sessions: [],
    sponsors: [],
    exhibitors: [],
    userRole: 'organizer',
    checkedInCount: 0,
    participants: [],
    budget: {
      total: 0,
      spent: 0,
      categories: [],
    },
    itinerary: [],
    coverPhoto: supabaseTrip.cover_image_url ?? undefined,
    card_color: (supabaseTrip as any).card_color ?? undefined,
  };
}
