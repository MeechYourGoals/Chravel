import { supabase } from '@/integrations/supabase/client';
import { cacheEntity, getCachedEntity } from '@/offline/cache';
import { getTripById, generateTripMockData } from '@/data/tripsData';
import { PlaceCategory, PlaceWithDistance } from '@/types/basecamp';

const cityCenterCoords: Record<string, { lat: number; lng: number }> = {
  Cancun: { lat: 21.1619, lng: -86.8515 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Bali: { lat: -8.5069, lng: 115.2625 },
  Nashville: { lat: 36.1627, lng: -86.7816 },
  Indio: { lat: 33.7206, lng: -116.2156 },
  Aspen: { lat: 39.1911, lng: -106.8175 },
  Phoenix: { lat: 33.4484, lng: -112.074 },
  Tulum: { lat: 20.211, lng: -87.4659 },
  'Napa Valley': { lat: 38.5, lng: -122.3 },
  'Port Canaveral': { lat: 28.4101, lng: -80.6188 },
  Yellowstone: { lat: 44.4279, lng: -110.5885 },
};

const mapLinkCategoryToPlaceCategory = (label: string): PlaceCategory => {
  const categoryMap: Record<string, PlaceCategory> = {
    Accommodation: 'Accommodation',
    Activities: 'Activity',
    Attractions: 'Attraction',
    Food: 'Appetite',
    Nightlife: 'Other',
    Event: 'Other',
    Tips: 'Other',
    Entrance: 'Other',
    Cruise: 'Other',
    General: 'Other',
    Transportation: 'Other',
  };
  return categoryMap[label] || 'Other';
};

const loadDemoPlacesFromTripsData = async (tripId: string): Promise<PlaceWithDistance[]> => {
  const trip = getTripById(Number(tripId));
  if (!trip) return [];

  if (typeof trip.id === 'number' && trip.id > 6) return [];

  const { links } = generateTripMockData(trip);
  const city = trip.location.split(',')[0].trim();
  const coords = cityCenterCoords[city];

  return links.slice(0, 5).map((link, i) => ({
    id: `mock-link-${trip.id}-${i + 1}`,
    name: link.title,
    address: '',
    coordinates: coords,
    category: mapLinkCategoryToPlaceCategory(link.category),
    rating: 0,
    url: link.url,
  }));
};

export const fetchTripPlaces = async (
  tripId: string,
  isDemoMode: boolean,
): Promise<PlaceWithDistance[]> => {
  const cacheKey = `${tripId}:places`;
  const cached = await getCachedEntity({ entityType: 'trip_links', entityId: cacheKey });
  const cachedPlaces = (cached?.data as PlaceWithDistance[] | undefined) ?? [];

  if (isDemoMode) {
    return loadDemoPlacesFromTripsData(tripId);
  }

  if (navigator.onLine === false && cachedPlaces.length > 0) {
    return cachedPlaces;
  }

  const { data, error } = await supabase
    .from('trip_link_index')
    .select('id, og_description, og_title, url, created_at')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (cachedPlaces.length > 0) return cachedPlaces;
    throw error;
  }

  if (!data || data.length === 0) {
    return loadDemoPlacesFromTripsData(tripId);
  }

  const placesWithDistance: PlaceWithDistance[] = data.map(link => {
    const placeIdMatch = link.og_description?.match(/place_id:([^ |]+)/);
    const placeId = placeIdMatch ? placeIdMatch[1] : link.id.toString();

    const coordsMatch = link.og_description?.match(/coords:([^,]+),([^ |]+)/);
    const coordinates = coordsMatch
      ? { lat: parseFloat(coordsMatch[1]), lng: parseFloat(coordsMatch[2]) }
      : undefined;

    const categoryMatch = link.og_description?.match(/category:([^ |]+)/);
    const category = categoryMatch ? categoryMatch[1] : 'other';

    const addressMatch = link.og_description?.match(/Saved from Places: ([^|]+)/);
    const address = addressMatch ? addressMatch[1].trim() : '';

    return {
      id: placeId,
      name: link.og_title || 'Unnamed Place',
      address,
      coordinates,
      category: category as PlaceCategory,
      rating: 0,
      url: link.url || '',
    };
  });

  await cacheEntity({
    entityType: 'trip_links',
    entityId: cacheKey,
    tripId,
    data: placesWithDistance,
  });

  return placesWithDistance;
};
