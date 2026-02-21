import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDemoMode } from './useDemoMode';
import { getDomain } from '@/services/urlUtils';
import { detectTripTier } from '../utils/tripTierDetector';
import { proTripMockData } from '../data/proTripMockData';
import { eventsMockData } from '../data/eventsMockData';
import TripSpecificMockDataService from '../services/tripSpecificMockDataService';
import UniversalMockDataService from '../services/UniversalMockDataService';
import { cacheEntity, getCachedEntity } from '@/offline/cache';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { fetchTripMediaItems, TripMediaItem } from '@/services/tripMediaService';

export type MediaItem = TripMediaItem;

export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  image_url?: string;
  created_at: string;
  source: 'chat' | 'manual' | 'places';
  tags?: string[];
}

export type MediaType = 'all' | 'photos' | 'videos' | 'files' | 'links';

export const useMediaManagement = (tripId: string) => {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  const { data: mediaItems = [], isLoading: mediaLoading } = useQuery({
    queryKey: tripKeys.media(tripId, isDemoMode),
    queryFn: async (): Promise<MediaItem[]> => {
      if (isDemoMode) {
        const tripTier = detectTripTier(tripId);
        if (
          tripTier === 'consumer' &&
          TripSpecificMockDataService.getTripMediaItems(parseInt(tripId)).length > 0
        ) {
          return TripSpecificMockDataService.getTripMediaItems(parseInt(tripId));
        }
        if (tripTier === 'pro' && proTripMockData[tripId]) {
          const proData = proTripMockData[tripId];
          return [
            ...(proData.photos || []).map(item => ({ ...item, media_type: 'image' as const })),
            ...(proData.videos || []).map(item => ({ ...item, media_type: 'video' as const })),
            ...(proData.files || []).map(item => ({ ...item, media_type: 'document' as const })),
          ];
        }
        if (tripTier === 'event' && eventsMockData[tripId]) {
          const eventData = eventsMockData[tripId];
          return [
            ...(eventData.photos || []).map(item => ({ ...item, media_type: 'image' as const })),
            ...(eventData.videos || []).map(item => ({ ...item, media_type: 'video' as const })),
            ...(eventData.files || []).map(item => ({ ...item, media_type: 'document' as const })),
          ];
        }
        return UniversalMockDataService.getCombinedMediaItems(tripId);
      }

      return fetchTripMediaItems(tripId);
    },
    enabled: !!tripId,
    staleTime: QUERY_CACHE_CONFIG.media.staleTime,
    gcTime: QUERY_CACHE_CONFIG.media.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.media.refetchOnWindowFocus,
  });

  const { data: linkItems = [], isLoading: linksLoading } = useQuery({
    queryKey: ['tripLinks', tripId, isDemoMode],
    queryFn: async (): Promise<LinkItem[]> => {
      const tripTier = detectTripTier(tripId);
      const listKey = `${tripId}:list`;

      if (isDemoMode) {
        if (
          tripTier === 'consumer' &&
          TripSpecificMockDataService.getTripLinkItems(parseInt(tripId)).length > 0
        ) {
          return TripSpecificMockDataService.getTripLinkItems(parseInt(tripId));
        }
        if (tripTier === 'pro' && proTripMockData[tripId]) {
          return proTripMockData[tripId].links || [];
        }
        if (tripTier === 'event' && eventsMockData[tripId]) {
          return eventsMockData[tripId].links || [];
        }
        return UniversalMockDataService.getLinkItems(tripId);
      }

      try {
        const [linksResponse, manualLinksResponse] = await Promise.all([
          supabase
            .from('trip_link_index')
            .select(
              'id, url, og_title, og_description, domain, og_image_url, created_at, message_id',
            )
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false })
            .limit(100),
          supabase
            .from('trip_links')
            .select('id, url, title, description, created_at')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false })
            .limit(100),
        ]);

        const items = [
          ...(linksResponse.data || []).map(item => {
            const isFromPlaces =
              item.og_description?.includes('place_id:') ||
              item.og_description?.includes('Saved from Places');
            return {
              id: item.id,
              url: item.url,
              title: item.og_title || 'Untitled Link',
              description: item.og_description || '',
              domain: item.domain || getDomain(item.url) || 'unknown',
              image_url: item.og_image_url,
              created_at: item.created_at,
              source: isFromPlaces
                ? ('places' as const)
                : ((item.message_id ? 'chat' : 'manual') as 'chat' | 'manual'),
              tags: [],
            };
          }),
          ...(manualLinksResponse.data || []).map(item => ({
            id: item.id,
            url: item.url,
            title: item.title || 'Untitled Link',
            description: item.description || '',
            domain: getDomain(item.url) || 'unknown',
            image_url: undefined,
            created_at: item.created_at,
            source: 'manual' as const,
            tags: [],
          })),
        ];

        await cacheEntity({ entityType: 'trip_links', entityId: listKey, tripId, data: items });
        return items;
      } catch {
        const cached = await getCachedEntity({ entityType: 'trip_links', entityId: listKey });
        return (cached?.data as LinkItem[] | undefined) ?? [];
      }
    },
    enabled: !!tripId,
    staleTime: QUERY_CACHE_CONFIG.places.staleTime,
    gcTime: QUERY_CACHE_CONFIG.places.gcTime,
  });

  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const channel = supabase.channel(`media-mgmt:${tripId}`);
    const invalidateMedia = () =>
      queryClient.invalidateQueries({ queryKey: tripKeys.media(tripId) });
    const invalidateLinks = () =>
      queryClient.invalidateQueries({ queryKey: ['tripLinks', tripId] });

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_media_index',
        filter: `trip_id=eq.${tripId}`,
      },
      invalidateMedia,
    );
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_files', filter: `trip_id=eq.${tripId}` },
      invalidateMedia,
    );
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_link_index',
        filter: `trip_id=eq.${tripId}`,
      },
      invalidateLinks,
    );
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_links', filter: `trip_id=eq.${tripId}` },
      invalidateLinks,
    );

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, queryClient]);

  const loading = mediaLoading || linksLoading;

  const filterByType = useCallback(
    (type: MediaType) => {
      if (type === 'all') return [...mediaItems, ...linkItems];
      if (type === 'photos') return mediaItems.filter(item => item.media_type === 'image');
      if (type === 'videos') return mediaItems.filter(item => item.media_type === 'video');
      if (type === 'files') return mediaItems.filter(item => item.media_type === 'document');
      if (type === 'links') return linkItems;
      return mediaItems;
    },
    [mediaItems, linkItems],
  );

  const getAllItemsSorted = useCallback(() => {
    return [...mediaItems, ...linkItems].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [mediaItems, linkItems]);

  return {
    mediaItems,
    linkItems,
    loading,
    totalItems: mediaItems.length + linkItems.length,
    filterByType,
    getAllItemsSorted,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.media(tripId) });
      queryClient.invalidateQueries({ queryKey: ['tripLinks', tripId] });
    },
  };
};
