import { Trip, getTripById, generateTripMockData } from '../data/tripsData';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripData } from '../types/pro';

// Use the enhanced TripContext from types
import { TripContext } from '../types/tripContext';

export type { TripContext };

export class TripContextService {
  static async getTripContext(tripId: string, isProTrip = false): Promise<TripContext> {
    try {
      if (isProTrip) {
        return this.getProTripContext(tripId);
      } else {
        return this.getConsumerTripContext(tripId);
      }
    } catch (error) {
      console.error('Error fetching trip context:', error);
      throw new Error('Failed to fetch trip context');
    }
  }

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

    const confirmationsList = Object.entries(context.confirmationNumbers)
      .map(([type, number]) => `- ${type.replace('_', ' ')}: ${number}`)
      .join('\n');

    return `
TRIP INFORMATION:
- Trip: ${context.title}
- Location: ${context.location}
- Dates: ${context.dateRange}
- Participants: ${participantList}
- Accommodation: ${context.accommodation || 'Not specified'}

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
