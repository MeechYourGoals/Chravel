import { useState, useEffect } from 'react';
import { useConsumerSubscription } from './useConsumerSubscription';
import { supabase } from '@/integrations/supabase/client';
import { StorageQuota } from '@/types/consumer';
import { useDemoMode } from './useDemoMode';

// Storage limits in MB
const FREE_TIER_STORAGE_MB = 500;
const PLUS_TIER_STORAGE_MB = 50000; // 50GB for Plus

export const useStorageQuota = (tripId?: string) => {
  const { isPlus } = useConsumerSubscription();
  const { isDemoMode } = useDemoMode();
  const [quota, setQuota] = useState<StorageQuota>({
    usedMB: 0,
    quotaMB: isPlus ? PLUS_TIER_STORAGE_MB : FREE_TIER_STORAGE_MB,
    percentUsed: 0,
    isNearLimit: false,
    isOverLimit: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: Show sample storage usage
      setQuota({
        usedMB: 127,
        quotaMB: FREE_TIER_STORAGE_MB,
        percentUsed: 25.4,
        isNearLimit: false,
        isOverLimit: false,
      });
      setLoading(false);
      return;
    }

    calculateStorageUsage();
  }, [tripId, isPlus, isDemoMode]);

  const calculateStorageUsage = async () => {
    setLoading(true);
    try {
      let totalBytes = 0;

      // Query trip_media_index for file sizes
      const query = supabase.from('trip_media_index').select('file_size');

      if (tripId) {
        query.eq('trip_id', tripId);
      }

      const { data: mediaData } = await query;

      if (mediaData) {
        totalBytes = mediaData.reduce((sum, item) => sum + (item.file_size || 0), 0);
      }

      // Note: trip_files table structure may vary - skipping for now
      // Can be added when file upload feature is fully implemented

      const usedMB = totalBytes / (1024 * 1024); // Convert bytes to MB
      const quotaMB = isPlus ? PLUS_TIER_STORAGE_MB : FREE_TIER_STORAGE_MB;
      const percentUsed = (usedMB / quotaMB) * 100;

      setQuota({
        usedMB: Math.round(usedMB * 10) / 10, // Round to 1 decimal
        quotaMB,
        percentUsed: Math.round(percentUsed * 10) / 10,
        isNearLimit: percentUsed >= 80,
        isOverLimit: percentUsed >= 100,
      });
    } catch (error) {
      console.error('Error calculating storage usage:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    quota,
    loading,
    refresh: calculateStorageUsage,
    canUpload: !quota.isOverLimit || isPlus || isDemoMode,
  };
};
