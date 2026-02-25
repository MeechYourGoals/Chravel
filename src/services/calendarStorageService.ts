import { TripEvent, CreateEventData } from './calendarService';
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  platformStorage,
} from '@/platform/storage';

class CalendarStorageService {
  private getStorageKey(tripId: string): string {
    return `calendar_events_${tripId}`;
  }

  // Get all events for a trip
  async getEvents(tripId: string): Promise<TripEvent[]> {
    try {
      return await getStorageItem<TripEvent[]>(this.getStorageKey(tripId), []);
    } catch (error) {
      console.error('Error loading calendar events from storage:', error);
      return [];
    }
  }

  // Save events for a trip
  private async saveEvents(tripId: string, events: TripEvent[]): Promise<void> {
    try {
      await setStorageItem(this.getStorageKey(tripId), events);
    } catch (error) {
      console.error('Error saving calendar events to storage:', error);
    }
  }

  // Seed events for a trip (demo mode)
  async setEvents(tripId: string, events: TripEvent[]): Promise<void> {
    const sorted = [...events].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
    await this.saveEvents(tripId, sorted);
  }

  // Create a new event
  async createEvent(eventData: CreateEventData): Promise<TripEvent> {
    const events = await this.getEvents(eventData.trip_id);

    const newEvent: TripEvent = {
      id: `demo-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      trip_id: eventData.trip_id,
      title: eventData.title,
      description: eventData.description,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      location: eventData.location,
      event_category: eventData.event_category || 'other',
      include_in_itinerary: eventData.include_in_itinerary ?? true,
      source_type: eventData.source_type || 'manual',
      source_data: eventData.source_data || {},
      created_by: 'demo-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    events.push(newEvent);
    events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    await this.saveEvents(eventData.trip_id, events);
    return newEvent;
  }

  // Update an event
  async updateEvent(
    tripId: string,
    eventId: string,
    updates: Partial<TripEvent>,
  ): Promise<TripEvent | null> {
    const events = await this.getEvents(tripId);
    const eventIndex = events.findIndex(e => e.id === eventId);

    if (eventIndex === -1) return null;

    const updatedEvent = {
      ...events[eventIndex],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    events[eventIndex] = updatedEvent;
    events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    await this.saveEvents(tripId, events);
    return updatedEvent;
  }

  // Delete an event
  async deleteEvent(tripId: string, eventId: string): Promise<boolean> {
    const events = await this.getEvents(tripId);
    const filteredEvents = events.filter(e => e.id !== eventId);

    if (filteredEvents.length !== events.length) {
      await this.saveEvents(tripId, filteredEvents);
      return true;
    }

    return false;
  }

  // Clear all events for a trip (useful for demo reset)
  async clearEvents(tripId: string): Promise<void> {
    await removeStorageItem(this.getStorageKey(tripId));
  }

  // Clear all demo calendar data
  async clearAllDemoEvents(): Promise<void> {
    // Get all keys from storage
    const allKeys: string[] = [];
    for (
      let i = 0;
      i <
      ((await platformStorage.getItem('length'))
        ? parseInt((await platformStorage.getItem('length')) || '0')
        : 0);
      i++
    ) {
      const key = `calendar_events_${i}`;
      if (await platformStorage.getItem(key)) {
        allKeys.push(key);
      }
    }

    // Remove calendar event keys
    for (const key of allKeys) {
      if (key.startsWith('calendar_events_')) {
        await removeStorageItem(key);
      }
    }
  }
}

export const calendarStorageService = new CalendarStorageService();
