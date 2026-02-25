// Unified semantic keyword search + date facet filter for trips
// Supports partial matching, case-insensitive, multi-field search
// Supports category synonyms and cat:<value> power syntax

import { PRO_CATEGORIES_ORDERED, normalizeLegacyCategory } from '../types/proCategories';

interface TripSearchableFields {
  id: string | number;
  title: string;
  description?: string;
  location?: string;
  tags?: string[];
  categories?: string[];
  dateRange: string;
  metadata?: Record<string, any>;
  // Pro trip category for category-aware search
  proTripCategory?: string;
}

export type DateFacet = 'upcoming' | 'completed' | 'inProgress' | 'total';

// Normalize string for fuzzy matching - removes special chars, lowercase
const normalize = (s?: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Build a flat synonym map: keyword -> enum value
const SYNONYM_MAP: Record<string, string> = {};
for (const cat of PRO_CATEGORIES_ORDERED) {
  // Map each synonym to the category's label (normalized) for matching
  for (const syn of cat.searchSynonyms) {
    SYNONYM_MAP[normalize(syn)] = cat.id;
  }
  // Also map the label itself
  SYNONYM_MAP[normalize(cat.label)] = cat.id;
}

// Parse date range to get start and end dates
const getDateRange = (dateRange: string): { start: Date | null; end: Date | null } => {
  try {
    if (dateRange.includes(' - ') && dateRange.includes(',')) {
      const parts = dateRange.split(',');
      const year = parseInt(parts[1].trim());
      const datePart = parts[0].trim();
      const [startPart, endPart] = datePart.split(' - ');

      if (startPart && endPart) {
        const startMatch = startPart.trim().match(/(\w+)\s+(\d+)/);
        const endMatch = endPart.trim().match(/(\w+)\s+(\d+)/);

        if (startMatch && endMatch) {
          const startMonth = new Date(`${startMatch[1]} 1, ${year}`).getMonth();
          const endMonth = new Date(`${endMatch[1]} 1, ${year}`).getMonth();
          const startDay = parseInt(startMatch[2]);
          const endDay = parseInt(endMatch[2]);

          return {
            start: new Date(year, startMonth, startDay),
            end: new Date(year, endMonth, endDay),
          };
        }
      }
    }

    if (dateRange.includes('-') && dateRange.includes(',') && !dateRange.includes(' - ')) {
      const parts = dateRange.split(',');
      const year = parseInt(parts[1].trim());
      const monthDay = parts[0].trim();
      const [monthPart, dayRange] = monthDay.split(' ');

      if (dayRange && dayRange.includes('-')) {
        const [startDay, endDay] = dayRange.split('-').map(d => parseInt(d.trim()));
        const month = new Date(`${monthPart} 1, ${year}`).getMonth();
        return {
          start: new Date(year, month, startDay),
          end: new Date(year, month, parseInt(endDay.toString())),
        };
      }
    }

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

/**
 * Parse `cat:<value>` power syntax from query.
 * Returns { catFilter, remainingQuery }.
 */
function parseCatSyntax(query: string): { catFilter: string | null; remainingQuery: string } {
  const match = query.match(/\bcat:(\S+)/i);
  if (!match) return { catFilter: null, remainingQuery: query };

  const rawCat = match[1].toLowerCase();
  const normalized = normalizeLegacyCategory(rawCat);
  const remaining = query.replace(match[0], '').trim();
  return { catFilter: normalized, remainingQuery: remaining };
}

// Check if trip matches semantic query (including category synonyms)
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
    ...Object.values(trip.metadata || {}).map(v => normalize(String(v))),
  ];

  // If trip has a proTripCategory, add its synonyms to searchable fields
  if (trip.proTripCategory) {
    const catEnum = normalizeLegacyCategory(trip.proTripCategory);
    const catConfig = PRO_CATEGORIES_ORDERED.find(c => c.id === catEnum);
    if (catConfig) {
      searchableFields.push(normalize(catConfig.label));
      for (const syn of catConfig.searchSynonyms) {
        searchableFields.push(normalize(syn));
      }
    }
  }

  // Substring matching across all fields (OR logic)
  return searchableFields.some(field => field.includes(q));
};

// Check if trip matches date facet
const matchesDateFacet = (trip: TripSearchableFields, facet: DateFacet | ''): boolean => {
  if (!facet || facet === 'total') return true;
  const status = getStatus(trip.dateRange);
  return status === facet;
};

// Check if trip matches a category filter
const matchesCategoryFilter = (trip: TripSearchableFields, catFilter: string | null): boolean => {
  if (!catFilter) return true;
  if (!trip.proTripCategory) return false;
  const tripCat = normalizeLegacyCategory(trip.proTripCategory);
  return tripCat === catFilter;
};

/**
 * Main filter function - combines semantic search + date facet + category filter
 */
export const filterTrips = <T extends TripSearchableFields>(
  trips: T[],
  query: string,
  facet: DateFacet | '',
  categoryFilter?: string | null,
): T[] => {
  // Parse cat: syntax from query
  const { catFilter: parsedCat, remainingQuery } = parseCatSyntax(query);
  const effectiveCat = categoryFilter || parsedCat;

  return trips.filter(
    trip =>
      matchesQuery(trip, remainingQuery) &&
      matchesDateFacet(trip, facet) &&
      matchesCategoryFilter(trip, effectiveCat),
  );
};

/**
 * Filter Pro trips (Record format)
 */
export const filterProTrips = <T extends TripSearchableFields>(
  proTrips: Record<string, T>,
  query: string,
  facet: DateFacet | '',
  categoryFilter?: string | null,
): Record<string, T> => {
  const trips = Object.values(proTrips);
  const filtered = filterTrips(trips, query, facet, categoryFilter);

  return filtered.reduce(
    (acc, trip) => {
      acc[trip.id] = trip;
      return acc;
    },
    {} as Record<string, T>,
  );
};

/**
 * Filter Events (Record format)
 */
export const filterEvents = <T extends TripSearchableFields>(
  events: Record<string, T>,
  query: string,
  facet: DateFacet | '',
): Record<string, T> => {
  const eventList = Object.values(events);
  const filtered = filterTrips(eventList, query, facet);

  return filtered.reduce(
    (acc, event) => {
      acc[event.id] = event;
      return acc;
    },
    {} as Record<string, T>,
  );
};
