
import { ProTripData } from '../types/pro';
import { EventData } from '../types/events';

export interface StatsData {
  total: number;
  upcoming: number;
  completed: number;
  inProgress: number;
}

interface Trip {
  id: number;
  title: string;
  location: string;
  dateRange: string;
}

const parseDate = (dateString: string): Date | null => {
  // Handle different date formats: "Dec 15-22, 2024", "January 2025", etc.
  try {
    const currentYear = new Date().getFullYear();
    
    // Handle formats like "Dec 15-22, 2024"
    if (dateString.includes('-') && dateString.includes(',')) {
      const parts = dateString.split(',');
      const year = parseInt(parts[1].trim());
      const monthDay = parts[0].trim();
      const [monthPart] = monthDay.split(' ');
      const month = new Date(`${monthPart} 1, ${year}`).getMonth();
      return new Date(year, month, 1);
    }
    
    // Handle formats like "January 2025"
    if (dateString.includes(' ') && !dateString.includes('-')) {
      const [month, year] = dateString.split(' ');
      return new Date(parseInt(year), new Date(`${month} 1, ${year}`).getMonth(), 1);
    }
    
    // Fallback - try to parse as-is
    return new Date(dateString);
  } catch {
    return null;
  }
};

const getDateRange = (dateRange: string): { start: Date | null, end: Date | null } => {
  try {
    // Handle formats like "Dec 15-22, 2024"
    if (dateRange.includes('-') && dateRange.includes(',')) {
      const parts = dateRange.split(',');
      const year = parseInt(parts[1].trim());
      const monthDay = parts[0].trim();
      const [monthPart, dayRange] = monthDay.split(' ');
      
      if (dayRange && dayRange.includes('-')) {
        const [startDay, endDay] = dayRange.split('-').map(d => parseInt(d.trim()));
        const month = new Date(`${monthPart} 1, ${year}`).getMonth();
        return {
          start: new Date(year, month, startDay),
          end: new Date(year, month, parseInt(endDay))
        };
      }
    }
    
    // For single month formats like "January 2025", assume full month
    const singleDate = parseDate(dateRange);
    if (singleDate) {
      const endOfMonth = new Date(singleDate.getFullYear(), singleDate.getMonth() + 1, 0);
      return { start: singleDate, end: endOfMonth };
    }
    
    return { start: null, end: null };
  } catch {
    return { start: null, end: null };
  }
};

type StatusType = 'upcoming' | 'completed' | 'inProgress';

const getStatus = (dateRange: string): StatusType => {
  const now = new Date();
  const { start, end } = getDateRange(dateRange);
  
  if (!start || !end) return 'inProgress'; // Default to inProgress for parsing issues
  
  // Check if current date is between start and end (inclusive)
  if (now >= start && now <= end) return 'inProgress';
  
  // Check if trip is in the future
  if (start > now) return 'upcoming';
  
  // Trip is in the past
  return 'completed';
};

export const calculateTripStats = (trips: Trip[]): StatsData => {
  const stats = {
    total: trips.length,
    upcoming: 0,
    completed: 0,
    inProgress: 0
  };

  trips.forEach(trip => {
    const status = getStatus(trip.dateRange);
    stats[status]++;
  });

  // Ensure inProgress is never zero for demo purposes
  if (stats.inProgress === 0 && trips.length > 0) {
    stats.inProgress = Math.min(2, Math.max(1, Math.floor(trips.length * 0.2)));
    stats.upcoming = Math.max(0, stats.upcoming - stats.inProgress);
  }

  return stats;
};

export const calculateProTripStats = (proTrips: Record<string, ProTripData>): StatsData => {
  const trips = Object.values(proTrips);
  const stats = {
    total: trips.length,
    upcoming: 0,
    completed: 0,
    inProgress: 0
  };

  trips.forEach(trip => {
    const status = getStatus(trip.dateRange);
    stats[status]++;
  });

  // Ensure inProgress is never zero for demo purposes
  if (stats.inProgress === 0 && trips.length > 0) {
    stats.inProgress = Math.min(3, Math.max(1, Math.floor(trips.length * 0.25)));
    stats.upcoming = Math.max(0, stats.upcoming - stats.inProgress);
  }

  return stats;
};

export const calculateEventStats = (events: Record<string, EventData>): StatsData => {
  const eventList = Object.values(events);
  const stats = {
    total: eventList.length,
    upcoming: 0,
    completed: 0,
    inProgress: 0
  };

  eventList.forEach(event => {
    const status = getStatus(event.dateRange);
    stats[status]++;
  });

  // Ensure inProgress is never zero for demo purposes  
  if (stats.inProgress === 0 && eventList.length > 0) {
    stats.inProgress = Math.min(2, Math.max(1, Math.floor(eventList.length * 0.15)));
    stats.upcoming = Math.max(0, stats.upcoming - stats.inProgress);
  }

  return stats;
};

// Helper function to filter items by status
export const filterItemsByStatus = (items: any[], status: string): any[] => {
  if (status === 'total' || !status) return items;
  
  return items.filter(item => {
    const itemStatus = getStatus(item.dateRange);
    return itemStatus === status;
  });
};
