/**
 * Share Trip Hook
 *
 * Provides share link generation and native share capabilities for trips.
 * Integrates with useOGMeta to update page meta tags when viewing a trip.
 */

import { useMemo, useCallback } from 'react';
import { buildTripPreviewLink } from '@/lib/unfurlConfig';
import { toast } from 'sonner';

interface TripShareData {
  id: string | number;
  name: string;
  destination?: string;
  dateRange?: string;
  coverImageUrl?: string;
  participantCount?: number;
}

interface UseShareTripReturn {
  /** Branded preview link for the trip (p.chravel.app/t/{id}) */
  previewLink: string;
  /** Pre-formatted share text */
  shareText: string;
  /** Copy link to clipboard */
  copyLink: () => Promise<boolean>;
  /** Trigger native share sheet (if available) */
  nativeShare: () => Promise<boolean>;
  /** Whether native share is available */
  canNativeShare: boolean;
  /** OG meta data for this trip (pass to useOGMeta) */
  ogMeta: {
    title: string;
    description: string;
    image: string;
    url: string;
  };
}

export function useShareTrip(trip: TripShareData): UseShareTripReturn {
  const previewLink = useMemo(() => buildTripPreviewLink(trip.id), [trip.id]);

  const chravelerCount = Math.max(trip.participantCount ?? 1, 1);

  const shareText = useMemo(() => {
    const parts = [`Check out ${trip.name}`];
    if (trip.destination) parts.push(`a trip to ${trip.destination}`);
    parts.push(`${chravelerCount} Chravelers are going.`);
    return parts.join(' - ') + '!';
  }, [trip.name, trip.destination, chravelerCount]);

  const ogMeta = useMemo(
    () => ({
      title: trip.name,
      description: [
        trip.destination ? `${trip.destination}` : '',
        trip.dateRange || '',
        `${chravelerCount} Chravelers`,
      ]
        .filter(Boolean)
        .join(' - '),
      image: trip.coverImageUrl || 'https://chravel.app/chravelapp-social-20251219.png',
      url: previewLink,
    }),
    [trip.name, trip.destination, trip.dateRange, trip.coverImageUrl, chravelerCount, previewLink],
  );

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const copyLink = useCallback(async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(previewLink);
      toast.success('Link copied to clipboard!');
      return true;
    } catch {
      toast.error('Failed to copy link');
      return false;
    }
  }, [previewLink]);

  const nativeShare = useCallback(async (): Promise<boolean> => {
    if (!canNativeShare) return false;
    try {
      await navigator.share({
        title: trip.name,
        text: shareText,
        url: previewLink,
      });
      return true;
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        toast.error('Share failed');
      }
      return false;
    }
  }, [canNativeShare, trip.name, shareText, previewLink]);

  return {
    previewLink,
    shareText,
    copyLink,
    nativeShare,
    canNativeShare,
    ogMeta,
  };
}

export default useShareTrip;
