// 🆕 Lazy loader for events mock data to reduce bundle size
import { EventData } from '../types/events';

let eventsMockDataCache: Record<string, EventData> | null = null;

export const loadEventsMockData = async (): Promise<Record<string, EventData>> => {
  // Only load in demo mode or when explicitly requested
  if (eventsMockDataCache) {
    return eventsMockDataCache;
  }

  // Dynamic import to reduce initial bundle size
  const { eventsMockData } = await import('./eventsMockData');
  eventsMockDataCache = eventsMockData;

  return eventsMockData;
};

export const getEventById = async (eventId: string): Promise<EventData | null> => {
  const events = await loadEventsMockData();
  return events[eventId] || null;
};

export const getAllEventIds = async (): Promise<string[]> => {
  const events = await loadEventsMockData();
  return Object.keys(events);
};
