import { TripContext } from '../types/tripContext';
import { conciergeRepo } from '@/domain/trip/conciergeRepo';
import { Trip, getTripById, generateTripMockData } from '../data/tripsData';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripData } from '../types/pro';
import { isDemoTrip } from '@/utils/demoUtils'; // Ensure we have a util for checking demo IDs

export type { TripContext };

export class TripContextService {

  /**
   * Get Trip Context.
   * Delegates to TDAL (conciergeRepo) for real trips.
   * Uses legacy mock data generators for Demo trips.
   */
  static async getTripContext(tripId: string, userIdOrIsPro?: string | boolean, isProTripOpt?: boolean): Promise<TripContext> {
    try {
      // Handle overload mapping:
      // signature 1: (tripId: string, isProTrip?: boolean) -> legacy
      // signature 2: (tripId: string, userId: string, isProTrip?: boolean) -> new
      let userId: string | undefined;
      let isProTrip = false;

      if (typeof userIdOrIsPro === 'boolean') {
          isProTrip = userIdOrIsPro;
      } else if (typeof userIdOrIsPro === 'string') {
          userId = userIdOrIsPro;
          isProTrip = isProTripOpt || false;
      }

      // 1. Check if Demo Trip
      if (isDemoTrip(tripId)) {
          if (isProTrip) {
            return this.getProTripContext(tripId);
          } else {
            return this.getConsumerTripContext(tripId);
          }
      }

      // 2. Resolve User ID if missing (Backward Compatibility)
      if (!userId) {
          const { supabase } = await import('@/integrations/supabase/client');
          const { getCachedAuthUser } = await import('@/lib/authCache');

          const cached = await getCachedAuthUser();
          if (cached?.id) {
              userId = cached.id;
          } else {
              const { data } = await supabase.auth.getUser();
              userId = data.user?.id;
          }
      }

      if (!userId) {
          throw new Error('User authentication required to fetch trip context.');
      }

      // 3. Real Trip -> Use TDAL
      return await conciergeRepo.buildContext(tripId, userId);

    } catch (error) {
      console.error('Error fetching trip context:', error);
      throw new Error('Failed to fetch trip context');
    }
  }

  // --- Legacy Mock Methods (Preserved for Demo Mode) ---

  private static getConsumerTripContext(tripId: string): TripContext {
    const trip = getTripById(parseInt(tripId));
    if (!trip) {
      throw new Error('Trip not found');
    }

    const mockData = generateTripMockData(trip);
    const today = new Date().toISOString().split('T')[0];

    return {
      tripId,
      title: trip.title,
      location: trip.location,
      dateRange: trip.dateRange,
      participants: trip.participants.map(p => ({
        id: p.id.toString(),
        name: p.name,
        role: 'participant',
      })),
      itinerary: mockData.itinerary.map((day, index) => ({
        id: index.toString(),
        title: `Day ${index + 1}`,
        date: day.date,
        events: day.events,
      })),
      accommodation: mockData.basecamp.name,
      currentDate: today,
      upcomingEvents: this.getUpcomingEvents(mockData.itinerary, today),
      recentUpdates: mockData.broadcasts.map((b, i) => ({
        id: i.toString(),
        type: 'broadcast',
        message: b.content,
        timestamp: b.timestamp,
      })),
      confirmationNumbers: {
        hotel: 'HTL-' + Math.random().toString(36).substr(2, 9),
        rental_car: 'CAR-' + Math.random().toString(36).substr(2, 9),
        flight: 'FLT-' + Math.random().toString(36).substr(2, 9),
      },
    };
  }

  private static getProTripContext(tripId: string): TripContext {
    const proTrip: ProTripData = proTripMockData[tripId];
    if (!proTrip) {
      throw new Error('Pro trip not found');
    }

    const today = new Date().toISOString().split('T')[0];

    return {
      tripId,
      title: proTrip.title,
      location: proTrip.location,
      dateRange: proTrip.dateRange,
      participants: proTrip.participants.map(p => ({
        id: p.id.toString(),
        name: p.name,
        role: p.role,
      })),
      itinerary: (proTrip.itinerary || []).map((day, index) => ({
        id: index.toString(),
        title: `Day ${index + 1}`,
        date: day.date,
        events: day.events as any, // Mock data - type assertion for simplified event structure
      })),
      accommodation: `${proTrip.location} Accommodation`,
      currentDate: today,
      upcomingEvents: this.getUpcomingEvents(proTrip.itinerary || [], today),
      recentUpdates: [
        {
          id: '1',
          type: 'description',
          message: proTrip.description,
          timestamp: today,
        },
      ],
      confirmationNumbers: {
        venue: 'VEN-' + Math.random().toString(36).substr(2, 9),
        transportation: 'TRN-' + Math.random().toString(36).substr(2, 9),
      },
    };
  }

  private static getUpcomingEvents(itinerary: any[], currentDate: string): any[] {
    // Filter events that are today or in the future
    return itinerary
      .filter(day => day.date >= currentDate)
      .flatMap(
        day =>
          day.events?.map((event: any) => ({
            ...event,
            date: day.date,
          })) || [],
      )
      .slice(0, 5); // Return next 5 upcoming events
  }

  static formatContextForAI(context: TripContext): string {
    const participantList = context.participants.map(p => p.name).join(', ');
    const upcomingEventsList = context.upcomingEvents
      .map(event => `- ${event.title} at ${event.time} (${event.location})`)
      .join('\n');

    const confirmationsList = Object.entries(context.confirmationNumbers || {})
      .map(([type, number]) => `- ${type.replace('_', ' ')}: ${number}`)
      .join('\n');

    return `
TRIP INFORMATION:
- Trip: ${context.title}
- Location: ${context.location}
- Dates: ${typeof context.dateRange === 'string' ? context.dateRange : `${context.dateRange.start} to ${context.dateRange.end}`}
- Participants: ${participantList}
- Accommodation: ${typeof context.accommodation === 'string' ? context.accommodation : context.accommodation?.name || 'Not specified'}

TODAY'S DATE: ${context.currentDate}

UPCOMING EVENTS:
${upcomingEventsList || 'No upcoming events scheduled'}

CONFIRMATION NUMBERS:
${confirmationsList}

RECENT UPDATES:
${context.recentUpdates.map(update => `- ${update.message}`).join('\n')}
    `.trim();
  }
}
