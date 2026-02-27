import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getTripLinks } from '@/services/tripLinksService';
import { tripKeys } from '@/lib/queryKeys';
import type { PlaceResult } from '@/features/chat/components/PlaceResultCards';
import type { FlightResult } from '@/features/chat/components/FlightResultCards';
import type { Database } from '@/integrations/supabase/types';

type TripLink = Database['public']['Tables']['trip_links']['Row'];

interface SavePayload {
  title: string;
  url: string;
  description: string;
  category: string;
}

interface SaveResult {
  link: TripLink;
  wasDuplicate: boolean;
}

function normalizePlaceToPayload(place: PlaceResult): SavePayload {
  const url =
    place.mapsUrl ||
    (place.placeId
      ? `https://www.google.com/maps/place/?q=place_id:${place.placeId}`
      : `https://www.google.com/maps/search/${encodeURIComponent(place.name)}`);

  const descParts: string[] = [];
  if (place.address) descParts.push(place.address);
  if (place.rating != null) descParts.push(`Rating: ${place.rating}`);
  descParts.push('Source: AI Concierge');

  return {
    title: place.name,
    url,
    description: descParts.join(' \u00b7 '),
    category: 'attraction',
  };
}

function normalizeFlightToPayload(flight: FlightResult): SavePayload {
  const title = `${flight.origin} \u2192 ${flight.destination}`;
  const datePart = flight.returnDate
    ? `${flight.departureDate} \u2013 ${flight.returnDate}`
    : flight.departureDate;

  const descParts = [datePart, `${flight.passengers} passenger(s)`, 'Source: AI Concierge'];

  return {
    title,
    url: flight.deeplink,
    description: descParts.join(' \u00b7 '),
    category: 'transportation',
  };
}

function dedupeKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    let normalized = parsed.toString();
    if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    return normalized;
  } catch {
    return url.toLowerCase().replace(/\/+$/, '');
  }
}

function makeDemoLink(tripId: string, userId: string, payload: SavePayload): TripLink {
  return {
    id: `demo-link-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    trip_id: tripId,
    url: payload.url,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    added_by: userId || 'anonymous',
    votes: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

interface UseSaveToTripPlacesOptions {
  tripId: string;
  userId: string;
  isDemoMode: boolean;
  onNavigateToPlaces?: () => void;
}

export function useSaveToTripPlaces({
  tripId,
  userId,
  isDemoMode,
  onNavigateToPlaces,
}: UseSaveToTripPlacesOptions) {
  const queryClient = useQueryClient();
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());

  const tripLinksQueryKey = tripKeys.tripLinks(tripId, isDemoMode);

  const mutation = useMutation({
    mutationFn: async (payload: SavePayload): Promise<SaveResult> => {
      const normalizedUrl = dedupeKey(payload.url);

      const existingLinks = await getTripLinks(tripId, isDemoMode);
      const duplicate = existingLinks.find(link => dedupeKey(link.url) === normalizedUrl);

      if (duplicate) {
        return { link: duplicate, wasDuplicate: true };
      }

      if (isDemoMode) {
        const demoLink = makeDemoLink(tripId, userId, payload);
        const demoKey = `demo_trip_links_${tripId}`;
        try {
          const stored = localStorage.getItem(demoKey);
          const all: TripLink[] = stored ? JSON.parse(stored) : [];
          all.push(demoLink);
          localStorage.setItem(demoKey, JSON.stringify(all));
        } catch {
          // localStorage unavailable — link was already added optimistically
        }
        return { link: demoLink, wasDuplicate: false };
      }

      const { data, error } = await supabase
        .from('trip_links')
        .insert({
          trip_id: tripId,
          url: payload.url,
          title: payload.title,
          description: payload.description,
          category: payload.category,
          added_by: userId || '',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return { link: data, wasDuplicate: false };
    },
    onMutate: async (payload: SavePayload) => {
      setSavedUrls(prev => new Set(prev).add(dedupeKey(payload.url)));

      await queryClient.cancelQueries({ queryKey: tripLinksQueryKey });

      const previousLinks = queryClient.getQueryData<TripLink[]>(tripLinksQueryKey);

      const optimisticLink: TripLink = {
        id: `optimistic-${Date.now()}`,
        trip_id: tripId,
        url: payload.url,
        title: payload.title,
        description: payload.description,
        category: payload.category,
        added_by: userId || 'anonymous',
        votes: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<TripLink[]>(tripLinksQueryKey, old =>
        old ? [optimisticLink, ...old] : [optimisticLink],
      );

      return { previousLinks, payload };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousLinks !== undefined) {
        queryClient.setQueryData(tripLinksQueryKey, context.previousLinks);
      }
      if (context?.payload) {
        setSavedUrls(prev => {
          const next = new Set(prev);
          next.delete(dedupeKey(context.payload.url));
          return next;
        });
      }
      toast.error("Couldn't save. Try again.");
    },
    onSuccess: (result: SaveResult) => {
      setSavedUrls(prev => new Set(prev).add(dedupeKey(result.link.url)));

      if (result.wasDuplicate) {
        toast('Already saved', { icon: '\u2713' });
      } else {
        toast.success('Saved to Places', {
          action: onNavigateToPlaces ? { label: 'View', onClick: onNavigateToPlaces } : undefined,
        });
      }

      queryClient.invalidateQueries({ queryKey: tripLinksQueryKey });
    },
  });

  const savePlace = useCallback(
    (place: PlaceResult) => {
      const payload = normalizePlaceToPayload(place);
      const key = dedupeKey(payload.url);

      if (savedUrls.has(key)) {
        toast('Already saved', { icon: '\u2713' });
        return;
      }

      mutation.mutate(payload);
    },
    [mutation, savedUrls],
  );

  const saveFlight = useCallback(
    (flight: FlightResult) => {
      const payload = normalizeFlightToPayload(flight);
      const key = dedupeKey(payload.url);

      if (savedUrls.has(key)) {
        toast('Already saved', { icon: '\u2713' });
        return;
      }

      mutation.mutate(payload);
    },
    [mutation, savedUrls],
  );

  const isUrlSaved = useCallback(
    (url: string): boolean => savedUrls.has(dedupeKey(url)),
    [savedUrls],
  );

  return {
    savePlace,
    saveFlight,
    isUrlSaved,
    isSaving: mutation.isPending,
  };
}
