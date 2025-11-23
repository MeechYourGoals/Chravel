import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { demoModeService } from '@/services/demoModeService';
import { toast } from 'sonner';

export const useTripCoverPhoto = (tripId: string, initialPhotoUrl?: string) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
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
      const { error } = await supabase
        .from('trips')
        .update({ cover_image_url: photoUrl })
        .eq('id', tripId)
        .eq('created_by', user.id);

      if (error) throw error;

      setCoverPhoto(photoUrl);
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
      const { error } = await supabase
        .from('trips')
        .update({ cover_image_url: null })
        .eq('id', tripId)
        .eq('created_by', user.id);

      if (error) throw error;

      // Optional: Delete file from storage if needed
      if (coverPhoto && coverPhoto.includes('supabase')) {
        const fileName = coverPhoto.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('advertiser-assets')
            .remove([`${tripId}/${fileName}`]);
        }
      }

      setCoverPhoto(undefined);
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
    isUpdating
  };
};
