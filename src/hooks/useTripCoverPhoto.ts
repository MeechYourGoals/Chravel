import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { demoModeService } from '@/services/demoModeService';
import { toast } from 'sonner';

export const useTripCoverPhoto = (tripId: string, initialPhotoUrl?: string) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();
  const [coverPhoto, setCoverPhoto] = useState<string | undefined>(initialPhotoUrl);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load demo mode cover photo on mount
  useEffect(() => {
    if (isDemoMode) {
      const demoPhoto = demoModeService.getCoverPhoto(tripId);
      if (demoPhoto) {
        setCoverPhoto(demoPhoto);
      }
    }
  }, [isDemoMode, tripId]);

  const updateCoverPhoto = async (photoUrl: string): Promise<boolean> => {
    // Reject blob URLs from being saved to database (except in demo mode)
    if (photoUrl.startsWith('blob:') && !isDemoMode) {
      console.warn('[useTripCoverPhoto] Rejecting blob URL - not persistable');
      toast.error('Upload in progress, please wait...');
      return false;
    }

    // Demo mode: update session storage
    if (isDemoMode) {
      setCoverPhoto(photoUrl);
      demoModeService.setCoverPhoto(tripId, photoUrl);
      toast.success('Cover photo updated (demo mode)');
      return true;
    }

    // Authenticated mode: update database
    if (!user) {
      toast.error('Please sign in to update cover photos');
      return false;
    }

    setIsUpdating(true);
    try {
      // Use .select() to verify the update actually happened
      // RLS policy "Trip creators can update their trips" handles authorization
      const { data, error } = await supabase
        .from('trips')
        .update({ cover_image_url: photoUrl })
        .eq('id', tripId)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      // Check if any row was actually updated
      if (!data) {
        console.error('[useTripCoverPhoto] No rows updated - user may not have permission');
        toast.error("You don't have permission to update this trip's cover photo");
        return false;
      }

      setCoverPhoto(photoUrl);
      // Invalidate React Query cache to immediately reflect changes in trip lists
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Cover photo updated');
      return true;
    } catch (error) {
      console.error('Error updating cover photo:', error);
      toast.error('Failed to update cover photo');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const removeCoverPhoto = async (): Promise<boolean> => {
    // Demo mode: remove from session storage
    if (isDemoMode) {
      setCoverPhoto(undefined);
      demoModeService.removeCoverPhoto(tripId);
      toast.success('Cover photo removed (demo mode)');
      return true;
    }

    // Authenticated mode: remove from database
    if (!user) {
      toast.error('Please sign in to remove cover photos');
      return false;
    }

    setIsUpdating(true);
    try {
      // Use .select() to verify the update actually happened
      // RLS policy handles authorization
      const { data, error } = await supabase
        .from('trips')
        .update({ cover_image_url: null })
        .eq('id', tripId)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      // Check if any row was actually updated
      if (!data) {
        console.error('[useTripCoverPhoto] No rows updated - user may not have permission');
        toast.error("You don't have permission to update this trip's cover photo");
        return false;
      }

      // Optional: Delete file from storage if needed
      if (coverPhoto && coverPhoto.includes('supabase')) {
        const fileName = coverPhoto.split('/').pop();
        if (fileName) {
          await supabase.storage.from('advertiser-assets').remove([`${tripId}/${fileName}`]);
        }
      }

      setCoverPhoto(undefined);
      // Invalidate React Query cache to immediately reflect changes in trip lists
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Cover photo removed');
      return true;
    } catch (error) {
      console.error('Error removing cover photo:', error);
      toast.error('Failed to remove cover photo');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    coverPhoto,
    updateCoverPhoto,
    removeCoverPhoto,
    isUpdating,
  };
};
