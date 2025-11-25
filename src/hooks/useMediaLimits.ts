/**
 * useMediaLimits Hook
 * 
 * Tracks per-trip media upload limits for freemium model:
 * - Free: 5 photos, 5 videos, 5 files per trip
 * - Explorer/Frequent Chraveler: Unlimited per trip
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useConsumerSubscription } from './useConsumerSubscription';
import { FREEMIUM_LIMITS } from '@/utils/featureTiers';

interface MediaLimits {
  photos: { used: number; limit: number; canUpload: boolean };
  videos: { used: number; limit: number; canUpload: boolean };
  files: { used: number; limit: number; canUpload: boolean };
  isLoading: boolean;
}

export const useMediaLimits = (tripId: string): MediaLimits => {
  const { tier, isLoading: tierLoading } = useConsumerSubscription();
  const limits = FREEMIUM_LIMITS[tier];

  const { data: mediaCounts, isLoading: countsLoading } = useQuery({
    queryKey: ['media-limits', tripId],
    queryFn: async () => {
      // Query trip_media_index for counts by type
      const { data, error } = await supabase
        .from('trip_media_index')
        .select('media_type')
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error fetching media counts:', error);
        return { photos: 0, videos: 0, files: 0 };
      }

      const counts = { photos: 0, videos: 0, files: 0 };
      data?.forEach((item) => {
        if (item.media_type === 'image') counts.photos++;
        else if (item.media_type === 'video') counts.videos++;
        else if (item.media_type === 'document') counts.files++;
      });

      return counts;
    },
    enabled: !!tripId,
    staleTime: 10 * 1000, // 10 seconds
  });

  const isLoading = tierLoading || countsLoading;

  if (isLoading || !mediaCounts) {
    return {
      photos: { used: 0, limit: limits.photosPerTrip, canUpload: true },
      videos: { used: 0, limit: limits.videosPerTrip, canUpload: true },
      files: { used: 0, limit: limits.filesPerTrip, canUpload: true },
      isLoading: true,
    };
  }

  // Check limits (-1 means unlimited)
  const photosLimit = limits.photosPerTrip;
  const videosLimit = limits.videosPerTrip;
  const filesLimit = limits.filesPerTrip;

  return {
    photos: {
      used: mediaCounts.photos,
      limit: photosLimit,
      canUpload: photosLimit === -1 || mediaCounts.photos < photosLimit,
    },
    videos: {
      used: mediaCounts.videos,
      limit: videosLimit,
      canUpload: videosLimit === -1 || mediaCounts.videos < videosLimit,
    },
    files: {
      used: mediaCounts.files,
      limit: filesLimit,
      canUpload: filesLimit === -1 || mediaCounts.files < filesLimit,
    },
    isLoading: false,
  };
};
