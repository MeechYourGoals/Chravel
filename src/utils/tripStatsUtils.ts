// Utility functions for calculating trip statistics

import { ProTripData } from '../types/pro';
import { EventData } from '../types/events';

// Generic trip interface for consumer trips
interface GenericTrip {
  participants: Array<{ id: number | string; name: string; role?: string }>;
  dateRange: string;
  itinerary?: Array<{ location?: string; venue?: string; place?: string }>;
}

// Get raw people count number
export const getPeopleCountValue = (
  trip: GenericTrip | ProTripData | EventData
): number => {
  // For EventData, prioritize attendanceExpected over participants count
  if ('attendanceExpected' in trip && trip.attendanceExpected && trip.attendanceExpected > 0) {
    return trip.attendanceExpected;
  }
  
  // Fallback to participants count for ProTripData or when attendanceExpected is not available
  return trip.participants?.length || 0;
};

// Format people count for display
export const formatPeopleCount = (count: number): string => {
  if (count === 0) return "—";
  return count.toLocaleString();
};

// Calculate number of people (Legacy wrapper)
export const calculatePeopleCount = (
  trip: GenericTrip | ProTripData | EventData
): string => {
  let count = getPeopleCountValue(trip);
  // Ensure at least 1 person (creator) is counted
  if (count === 0) count = 1;
  return formatPeopleCount(count);
};

// Calculate number of days
export const calculateDaysCount = (dateRange: string): string => {
  if (!dateRange) return "—";
  
  try {
    // Handle various date range formats
    if (dateRange.includes(" - ")) {
      const [startStr, endStr] = dateRange.split(" - ");
      
      // Parse dates more intelligently
      // Handle formats like "Feb 1 - May 31, 2025" and "Sep 13 - Sep 14, 2025"
      // Check if the dateRange has a year at the end
      const yearMatch = dateRange.match(/, (\d{4})$/);
      const year = yearMatch ? yearMatch[1] : new Date().getFullYear().toString();
      
      // Clean the start and end strings
      const cleanStartStr = startStr.trim();
      const cleanEndStr = endStr.replace(/, \d{4}$/, '').trim();
      
      // Add year to both dates if not present
      const startWithYear = cleanStartStr.includes(',') ? cleanStartStr : `${cleanStartStr}, ${year}`;
      const endWithYear = cleanEndStr.includes(',') ? cleanEndStr : `${cleanEndStr}, ${year}`;
      
      const startDate = new Date(startWithYear);
      const endDate = new Date(endWithYear);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return "—";
      }
      
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
      
      return diffDays.toString();
    }
    
    // Single date
    return "1";
  } catch {
    return "—";
  }
};

// Calculate number of places for consumer trips
export const calculatePlacesCount = (trip: GenericTrip): string => {
  if (!trip.itinerary || trip.itinerary.length === 0) return "—";
  
  const uniquePlaces = new Set<string>();
  
  trip.itinerary.forEach((item) => {
    const place = item.location || item.venue || item.place;
    if (place) {
      uniquePlaces.add(place.toLowerCase().trim());
    }
  });
  
  const count = uniquePlaces.size;
  return count > 0 ? count.toString() : "—";
};

// Calculate number of places for pro trips
export const calculateProTripPlacesCount = (trip: ProTripData): string => {
  const uniquePlaces = new Set<string>();
  
  // Check schedule locations
  if (trip.schedule) {
    trip.schedule.forEach((event) => {
      if (event.location) {
        uniquePlaces.add(event.location.toLowerCase().trim());
      }
    });
  }
  
  // Check itinerary locations
  if (trip.itinerary) {
    trip.itinerary.forEach((day) => {
      if (day.events) {
        day.events.forEach((event) => {
          if (event.location) {
            uniquePlaces.add(event.location.toLowerCase().trim());
          }
        });
      }
    });
  }
  
  // Fallback to main trip location if no specific places found
  if (uniquePlaces.size === 0 && trip.location) {
    uniquePlaces.add(trip.location.toLowerCase().trim());
  }
  
  const count = uniquePlaces.size;
  return count > 0 ? count.toString() : "—";
};

// Calculate number of places for events
export const calculateEventPlacesCount = (event: EventData): string => {
  const uniquePlaces = new Set<string>();
  
  // Check sessions for locations
  if (event.sessions) {
    event.sessions.forEach((session) => {
      if (session.location) {
        uniquePlaces.add(session.location.toLowerCase().trim());
      }
    });
  }
  
  // Check itinerary for locations
  if (event.itinerary) {
    event.itinerary.forEach((day) => {
      if (day.events) {
        day.events.forEach((evt) => {
          if (evt.location) {
            uniquePlaces.add(evt.location.toLowerCase().trim());
          }
        });
      }
    });
  }
  
  // Fallback to main event location
  if (uniquePlaces.size === 0 && event.location) {
    uniquePlaces.add(event.location.toLowerCase().trim());
  }
  
  const count = uniquePlaces.size;
  return count > 0 ? count.toString() : "—";
};