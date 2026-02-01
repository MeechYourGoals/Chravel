import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';
import { isSuperAdminEmail } from '@/utils/isSuperAdmin';

/**
 * Per-trip PDF export limits for freemium model
 *
 * Free: 1 export per trip (creates friction to upgrade, but gives users a sample)
 * Explorer+: Unlimited exports
 * Super Admins: Unlimited exports (founder bypass)
 */
const FREE_TIER_LIMIT = 1;

type UserTier = 'free' | 'explorer' | 'frequent-chraveler' | 'pro';

export interface PdfExportUsage {
  exportCount: number;
  limit: number;
  remaining: number;
  hasExported: boolean;
  canExport: boolean;
}

export const usePdfExportUsage = (tripId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Super admins always get unlimited (founder bypass)
  const isSuperAdmin = isSuperAdminEmail(user?.email);

  // Fetch user tier from profile
  const { data: profileData } = useQuery({
    queryKey: ['user-profile-tier', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('app_role, subscription_product_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Determine tier from profile (super admins always get pro tier)
  const getTier = (): UserTier => {
    if (isSuperAdmin) return 'pro'; // Founder bypass
    if (!profileData) return 'free';
    const appRole = profileData.app_role;
    const productId = profileData.subscription_product_id;

    // Check product ID for subscription tier
    if (productId?.includes('frequent') || productId?.includes('Tc0W')) return 'frequent-chraveler';
    if (productId?.includes('explorer') || productId?.includes('Tc0S')) return 'explorer';
    if (productId?.includes('pro') || productId?.includes('enterprise')) return 'pro';

    // Fall back to app_role
    if (appRole === 'plus' || appRole === 'explorer') return 'explorer';
    if (appRole === 'frequent-chraveler') return 'frequent-chraveler';
    if (appRole === 'pro' || appRole === 'enterprise') return 'pro';

    return 'free';
  };

  const tier = getTier();
  const isPaidUser = tier !== 'free' || isSuperAdmin;

  // Fetch export count for this trip - use localStorage for simplicity
  // In production, this could be a database table like concierge_usage
  const { data: usage, isLoading, refetch } = useQuery({
    queryKey: ['pdf-export-usage', tripId, user?.id],
    queryFn: async (): Promise<PdfExportUsage> => {
      if (!user?.id || !tripId) {
        return {
          exportCount: 0,
          limit: FREE_TIER_LIMIT,
          remaining: FREE_TIER_LIMIT,
          hasExported: false,
          canExport: true,
        };
      }

      // Paid users have unlimited exports
      if (isPaidUser) {
        return {
          exportCount: 0,
          limit: -1, // Unlimited
          remaining: -1,
          hasExported: false,
          canExport: true,
        };
      }

      // For free users, check localStorage (could be database in production)
      const storageKey = `pdf_export_${user.id}_${tripId}`;
      const exportData = localStorage.getItem(storageKey);
      const exportCount = exportData ? JSON.parse(exportData).count : 0;
      const hasExported = exportCount > 0;
      const remaining = Math.max(0, FREE_TIER_LIMIT - exportCount);
      const canExport = exportCount < FREE_TIER_LIMIT;

      return {
        exportCount,
        limit: FREE_TIER_LIMIT,
        remaining,
        hasExported,
        canExport,
      };
    },
    enabled: !!user?.id && !!tripId,
    staleTime: 10 * 1000, // 10 seconds
  });

  // Mutation to record an export
  const recordExport = useMutation({
    mutationFn: async () => {
      if (!user?.id || !tripId || isPaidUser) return;

      const storageKey = `pdf_export_${user.id}_${tripId}`;
      const exportData = localStorage.getItem(storageKey);
      const currentCount = exportData ? JSON.parse(exportData).count : 0;

      localStorage.setItem(storageKey, JSON.stringify({
        count: currentCount + 1,
        lastExport: new Date().toISOString(),
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdf-export-usage', tripId, user?.id] });
    },
  });

  const getUsageStatus = (): {
    status: 'available' | 'used' | 'unlimited';
    message: string;
  } => {
    if (!usage) {
      return { status: 'available', message: 'Loading...' };
    }

    if (usage.limit === -1) {
      return { status: 'unlimited', message: 'Unlimited exports' };
    }

    if (usage.hasExported) {
      return {
        status: 'used',
        message: `Free export used (${usage.exportCount}/${usage.limit})`
      };
    }

    return {
      status: 'available',
      message: `1 free export available`
    };
  };

  return {
    usage,
    isLoading,
    refetch,
    recordExport: recordExport.mutate,
    isRecording: recordExport.isPending,
    getUsageStatus,
    tier,
    isPaidUser,
    canExport: usage?.canExport ?? true,
  };
};
