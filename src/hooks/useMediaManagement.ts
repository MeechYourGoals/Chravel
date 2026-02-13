import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from './useDemoMode';
import { getDomain } from '@/services/urlUtils';
import { detectTripTier } from '../utils/tripTierDetector';
import { proTripMockData } from '../data/proTripMockData';
import { eventsMockData } from '../data/eventsMockData';
import TripSpecificMockDataService from '../services/tripSpecificMockDataService';
import UniversalMockDataService from '../services/UniversalMockDataService';
import { cacheEntity, getCachedEntity } from '@/offline/cache';

export interface MediaItem {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: any;
  created_at: string;
  source: 'chat' | 'upload';
  mime_type?: string | null;
}

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
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [linkItems, setLinkItems] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDemoMode } = useDemoMode();

  const fetchMediaItems = useCallback(async () => {
    setLoading(true);
    try {
      let items: MediaItem[] = [];
      const tripTier = detectTripTier(tripId);
      const listKey = `${tripId}:list`;

      if (isDemoMode) {
        // Trip-specific mock data
        if (
          tripTier === 'consumer' &&
          TripSpecificMockDataService.getTripMediaItems(parseInt(tripId)).length > 0
        ) {
          items = TripSpecificMockDataService.getTripMediaItems(parseInt(tripId));
        } else if (tripTier === 'pro' && proTripMockData[tripId]) {
          const proData = proTripMockData[tripId];
          items = [
            ...(proData.photos || []).map(item => ({ ...item, media_type: 'image' as const })),
            ...(proData.videos || []).map(item => ({ ...item, media_type: 'video' as const })),
            ...(proData.files || []).map(item => ({ ...item, media_type: 'document' as const })),
          ];
        } else if (tripTier === 'event' && eventsMockData[tripId]) {
          const eventData = eventsMockData[tripId];
          items = [
            ...(eventData.photos || []).map(item => ({ ...item, media_type: 'image' as const })),
            ...(eventData.videos || []).map(item => ({ ...item, media_type: 'video' as const })),
            ...(eventData.files || []).map(item => ({ ...item, media_type: 'document' as const })),
          ];
        } else {
          items = UniversalMockDataService.getCombinedMediaItems(tripId);
        }
      } else {
        // Fetch from Supabase
        const [mediaResponse, filesResponse] = await Promise.all([
          supabase
            .from('trip_media_index')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false }),

          supabase
            .from('trip_files')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false }),
        ]);

        items = [
          ...(mediaResponse.data || []).map(item => ({
            id: item.id,
            media_url: item.media_url,
            filename: item.filename || 'Untitled',
            media_type: item.media_type as MediaItem['media_type'],
            metadata: item.metadata || {},
            created_at: item.created_at,
            source: (item.message_id ? 'chat' : 'upload') as 'chat' | 'upload',
            mime_type: item.mime_type,
          })),
          ...(filesResponse.data || []).map(item => ({
            id: item.id,
            media_url: `/storage/trip-files/${item.name}`,
            filename: item.name,
            media_type: item.file_type as MediaItem['media_type'],
            metadata: { extracted_events: item.extracted_events },
            created_at: item.created_at,
            source: 'upload' as const,
          })),
        ];
      }

      setMediaItems(items);

      // Cache for offline access (best-effort, authenticated only)
      if (!isDemoMode) {
        await cacheEntity({ entityType: 'trip_media', entityId: listKey, tripId, data: items });
        await cacheEntity({ entityType: 'trip_files', entityId: listKey, tripId, data: items });
      }
    } catch (error) {
      console.error('Error fetching media items:', error);
      if (isDemoMode) {
        setMediaItems(UniversalMockDataService.getCombinedMediaItems(tripId));
      } else {
        const listKey = `${tripId}:list`;
        const cached = await getCachedEntity({ entityType: 'trip_media', entityId: listKey });
        setMediaItems((cached?.data as MediaItem[] | undefined) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, isDemoMode]);

  const fetchLinkItems = useCallback(async () => {
    try {
      let items: LinkItem[] = [];
      const tripTier = detectTripTier(tripId);
      const listKey = `${tripId}:list`;

      if (isDemoMode) {
        if (
          tripTier === 'consumer' &&
          TripSpecificMockDataService.getTripLinkItems(parseInt(tripId)).length > 0
        ) {
          items = TripSpecificMockDataService.getTripLinkItems(parseInt(tripId));
        } else if (tripTier === 'pro' && proTripMockData[tripId]) {
          items = proTripMockData[tripId].links || [];
        } else if (tripTier === 'event' && eventsMockData[tripId]) {
          items = eventsMockData[tripId].links || [];
        } else {
          items = UniversalMockDataService.getLinkItems(tripId);
        }
      } else {
        const [linksResponse, manualLinksResponse] = await Promise.all([
          supabase
            .from('trip_link_index')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false }),

          supabase
            .from('trip_links')
            .select('*')
            .eq('trip_id', tripId)
            .order('created_at', { ascending: false }),
        ]);

        items = [
          ...(linksResponse.data || []).map(item => {
            // Determine source based on og_description metadata
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
      }

      setLinkItems(items);

      if (!isDemoMode) {
        await cacheEntity({ entityType: 'trip_links', entityId: listKey, tripId, data: items });
      }
    } catch (error) {
      console.error('Error fetching link items:', error);
      if (isDemoMode) {
        setLinkItems(UniversalMockDataService.getLinkItems(tripId));
      } else {
        const listKey = `${tripId}:list`;
        const cached = await getCachedEntity({ entityType: 'trip_links', entityId: listKey });
        setLinkItems((cached?.data as LinkItem[] | undefined) ?? []);
      }
    }
  }, [tripId, isDemoMode]);

  useEffect(() => {
    fetchMediaItems();
    fetchLinkItems();
  }, [fetchMediaItems, fetchLinkItems]);

  // Realtime subscription: auto-update when new media/links are inserted
  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const channel = supabase.channel(`media-mgmt:${tripId}`);

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_media_index',
        filter: `trip_id=eq.${tripId}`,
      },
      () => {
        fetchMediaItems();
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_files',
        filter: `trip_id=eq.${tripId}`,
      },
      () => {
        fetchMediaItems();
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_link_index',
        filter: `trip_id=eq.${tripId}`,
      },
      () => {
        fetchLinkItems();
      },
    );

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'trip_links',
        filter: `trip_id=eq.${tripId}`,
      },
      () => {
        fetchLinkItems();
      },
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, fetchMediaItems, fetchLinkItems]);

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
    // Data
    mediaItems,
    linkItems,
    loading,

    // Computed
    totalItems: mediaItems.length + linkItems.length,

    // Actions
    filterByType,
    getAllItemsSorted,
    refetch: () => {
      fetchMediaItems();
      fetchLinkItems();
    },
  };
};
