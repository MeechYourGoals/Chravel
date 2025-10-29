import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from './useDemoMode';
import { detectTripTier } from '../utils/tripTierDetector';
import { proTripMockData } from '../data/proTripMockData';
import { eventsMockData } from '../data/eventsMockData';
import TripSpecificMockDataService from '../services/tripSpecificMockDataService';
import UniversalMockDataService from '../services/UniversalMockDataService';

export interface MediaItem {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: any;
  created_at: string;
  source: 'chat' | 'upload';
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

      if (isDemoMode || TripSpecificMockDataService.isEnabled()) {
        // Trip-specific mock data
        if (tripTier === 'consumer' && TripSpecificMockDataService.getTripMediaItems(parseInt(tripId)).length > 0) {
          items = TripSpecificMockDataService.getTripMediaItems(parseInt(tripId));
        } else if (tripTier === 'pro' && proTripMockData[tripId]) {
          const proData = proTripMockData[tripId];
          items = [
            ...(proData.photos || []).map(item => ({ ...item, media_type: 'image' as const })),
            ...(proData.videos || []).map(item => ({ ...item, media_type: 'video' as const })),
            ...(proData.files || []).map(item => ({ ...item, media_type: 'document' as const }))
          ];
        } else if (tripTier === 'event' && eventsMockData[tripId]) {
          const eventData = eventsMockData[tripId];
          items = [
            ...(eventData.photos || []).map(item => ({ ...item, media_type: 'image' as const })),
            ...(eventData.videos || []).map(item => ({ ...item, media_type: 'video' as const })),
            ...(eventData.files || []).map(item => ({ ...item, media_type: 'document' as const }))
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
            .order('created_at', { ascending: false })
        ]);

        items = [
          ...(mediaResponse.data || []).map(item => ({
            id: item.id,
            media_url: item.media_url,
            filename: item.filename || 'Untitled',
            media_type: item.media_type as MediaItem['media_type'],
            metadata: item.metadata || {},
            created_at: item.created_at,
            source: 'chat' as const
          })),
          ...(filesResponse.data || []).map(item => ({
            id: item.id,
            media_url: `/storage/trip-files/${item.name}`,
            filename: item.name,
            media_type: item.file_type as MediaItem['media_type'],
            metadata: { extracted_events: item.extracted_events },
            created_at: item.created_at,
            source: 'upload' as const
          }))
        ];
      }

      setMediaItems(items);
    } catch (error) {
      console.error('Error fetching media items:', error);
      if (isDemoMode) {
        setMediaItems(UniversalMockDataService.getCombinedMediaItems(tripId));
      } else {
        setMediaItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [tripId, isDemoMode]);

  const fetchLinkItems = useCallback(async () => {
    try {
      let items: LinkItem[] = [];
      const tripTier = detectTripTier(tripId);

      if (isDemoMode || TripSpecificMockDataService.isEnabled()) {
        if (tripTier === 'consumer' && TripSpecificMockDataService.getTripLinkItems(parseInt(tripId)).length > 0) {
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
            .order('created_at', { ascending: false })
        ]);

        items = [
          ...(linksResponse.data || []).map(item => {
            // Determine source based on og_description metadata
            const isFromPlaces = item.og_description?.includes('place_id:') || item.og_description?.includes('Saved from Places');
            return {
              id: item.id,
              url: item.url,
              title: item.og_title || 'Untitled Link',
              description: item.og_description || '',
              domain: item.domain || new URL(item.url).hostname,
              image_url: item.og_image_url,
              created_at: item.created_at,
              source: isFromPlaces ? 'places' as const : 'chat' as const,
              tags: []
            };
          }),
          ...(manualLinksResponse.data || []).map(item => ({
            id: item.id,
            url: item.url,
            title: item.title || 'Untitled Link',
            description: item.description || '',
            domain: new URL(item.url).hostname,
            image_url: undefined,
            created_at: item.created_at,
            source: 'manual' as const,
            tags: []
          }))
        ];
      }

      setLinkItems(items);
    } catch (error) {
      console.error('Error fetching link items:', error);
      if (isDemoMode) {
        setLinkItems(UniversalMockDataService.getLinkItems(tripId));
      } else {
        setLinkItems([]);
      }
    }
  }, [tripId, isDemoMode]);

  useEffect(() => {
    fetchMediaItems();
    fetchLinkItems();
  }, [fetchMediaItems, fetchLinkItems]);

  const filterByType = useCallback((type: MediaType) => {
    if (type === 'all') return [...mediaItems, ...linkItems];
    if (type === 'photos') return mediaItems.filter(item => item.media_type === 'image');
    if (type === 'videos') return mediaItems.filter(item => item.media_type === 'video');
    if (type === 'files') return mediaItems.filter(item => item.media_type === 'document');
    if (type === 'links') return linkItems;
    return mediaItems;
  }, [mediaItems, linkItems]);

  const getAllItemsSorted = useCallback(() => {
    return [...mediaItems, ...linkItems].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
    }
  };
};
