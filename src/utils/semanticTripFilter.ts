// Unified semantic keyword search + date facet filter for trips
// Supports partial matching, case-insensitive, multi-field search

interface TripSearchableFields {
  id: string | number;
  title: string;
  description?: string;
  location?: string;
  tags?: string[];
  categories?: string[];
  dateRange: string;
  metadata?: Record<string, any>;
}

export type DateFacet = 'upcoming' | 'completed' | 'inProgress' | 'total';

// Normalize string for fuzzy matching - removes special chars, lowercase
const normalize = (s?: string): string => 
  (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Parse date range to get start and end dates
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
          end: new Date(year, month, parseInt(endDay.toString()))
        };
      }
    }
    
    // For single month formats like "January 2025", assume full month
    if (dateRange.includes(' ') && !dateRange.includes('-')) {
      const [month, year] = dateRange.split(' ');
      const date = new Date(parseInt(year), new Date(`${month} 1, ${year}`).getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return { start: date, end: endOfMonth };
    }
    
    return { start: null, end: null };
  } catch {
    return { start: null, end: null };
  }
};

// Get trip status based on date range
const getStatus = (dateRange: string): DateFacet => {
  const now = new Date();
  const { start, end } = getDateRange(dateRange);
  
  if (!start || !end) return 'inProgress';
  
  if (now >= start && now <= end) return 'inProgress';
  if (start > now) return 'upcoming';
  return 'completed';
};

// Check if trip matches semantic query
const matchesQuery = (trip: TripSearchableFields, query: string): boolean => {
  if (!query) return true;
  const q = normalize(query);
  
  // Build searchable fields array
  const searchableFields = [
    normalize(trip.title),
    normalize(trip.description),
    normalize(trip.location),
    ...(trip.tags || []).map(normalize),
    ...(trip.categories || []).map(normalize),
    // Expand metadata if exists
    ...Object.values(trip.metadata || {}).map(v => normalize(String(v)))
  ];
  
  // Substring matching across all fields (OR logic)
  return searchableFields.some(field => field.includes(q));
};

// Check if trip matches date facet
const matchesDateFacet = (trip: TripSearchableFields, facet: DateFacet | ''): boolean => {
  if (!facet || facet === 'total') return true;
  const status = getStatus(trip.dateRange);
  return status === facet;
};

/**
 * Main filter function - combines semantic search + date facet
 * @param trips - Array of trips to filter
 * @param query - Search query string
 * @param facet - Date filter facet
 * @returns Filtered trips matching both query AND facet
 */
export const filterTrips = <T extends TripSearchableFields>(
  trips: T[],
  query: string,
  facet: DateFacet | ''
): T[] => {
  return trips.filter(trip => 
    matchesQuery(trip, query) && matchesDateFacet(trip, facet)
  );
};

/**
 * Filter Pro trips (Record format)
 */
export const filterProTrips = <T extends TripSearchableFields>(
  proTrips: Record<string, T>,
  query: string,
  facet: DateFacet | ''
): Record<string, T> => {
  const trips = Object.values(proTrips);
  const filtered = filterTrips(trips, query, facet);
  
  // Convert back to Record format
  return filtered.reduce((acc, trip) => {
    acc[trip.id] = trip;
    return acc;
  }, {} as Record<string, T>);
};

/**
 * Filter Events (Record format)
 */
export const filterEvents = <T extends TripSearchableFields>(
  events: Record<string, T>,
  query: string,
  facet: DateFacet | ''
): Record<string, T> => {
  const eventList = Object.values(events);
  const filtered = filterTrips(eventList, query, facet);
  
  // Convert back to Record format
  return filtered.reduce((acc, event) => {
    acc[event.id] = event;
    return acc;
  }, {} as Record<string, T>);
};
