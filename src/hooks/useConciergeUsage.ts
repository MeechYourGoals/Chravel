import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';
import { isSuperAdminEmail } from '@/utils/isSuperAdmin';

/**
 * Per-trip AI query limits for freemium model
 * 
 * IMPORTANT: These are per user, per trip limits (NO daily reset):
 * - Free: 5 queries per user per trip
 * - Explorer: 10 queries per user per trip
 * - Frequent Chraveler/Pro/Super Admin: Unlimited
 */
const FREE_TIER_LIMIT = 5; // 5 queries per user per trip
const EXPLORER_TIER_LIMIT = 10; // 10 queries per user per trip
const PAID_TIER_LIMIT = -1; // Unlimited

type UserTier = 'free' | 'explorer' | 'frequent-chraveler' | 'pro' | 'super_admin';

const getTierFromRole = (appRole?: string): UserTier => {
  // Super admin roles get unlimited access
  if (appRole === 'super_admin' || appRole === 'enterprise_admin') return 'super_admin';
  if (!appRole || appRole === 'consumer') return 'free';
  if (appRole === 'plus' || appRole === 'explorer') return 'explorer';
  if (appRole === 'frequent-chraveler') return 'frequent-chraveler';
  if (appRole === 'pro' || appRole === 'enterprise' || appRole === 'advertiser') return 'pro';
  return 'free';
};

const getLimitForTier = (tier: UserTier): number => {
  if (tier === 'super_admin') return PAID_TIER_LIMIT; // Super admins always unlimited
  if (tier === 'free') return FREE_TIER_LIMIT;
  if (tier === 'explorer') return EXPLORER_TIER_LIMIT;
  return PAID_TIER_LIMIT; // Unlimited for Frequent Chraveler and Pro
};

const getUpgradeUrlForTier = (tier: UserTier): string => {
  // All upgrade actions go to settings - the billing section handles tier selection
  return '/settings';
};

export interface ConciergeUsage {
  dailyCount: number;
  limit: number;
  remaining: number;
  isLimitReached: boolean;
  resetTime: string;
}

export const useConciergeUsage = (tripId: string, userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const userEmail = user?.email;

  // Check if user is super admin by email (founder failsafe)
  const isSuperAdminByEmail = isSuperAdminEmail(userEmail);

  // Fetch user tier from profile
  const { data: profileData } = useQuery({
    queryKey: ['user-profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('app_role, email')
        .eq('user_id', targetUserId)
        .single();

      if (error) {
        console.error('Failed to fetch user profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Super admin by email takes precedence, then check app_role
  const userTier: UserTier = isSuperAdminByEmail 
    ? 'super_admin' 
    : getTierFromRole(profileData?.app_role);
  const tierLimit = getLimitForTier(userTier);

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey: ['concierge-usage', tripId, targetUserId, userTier],
    queryFn: async (): Promise<ConciergeUsage> => {
      if (!targetUserId || !tripId) {
        return {
          dailyCount: 0,
          limit: FREE_TIER_LIMIT,
          remaining: FREE_TIER_LIMIT,
          isLimitReached: false,
          resetTime: new Date().toISOString()
        };
      }

      // Paid tiers have unlimited queries
      if (tierLimit === PAID_TIER_LIMIT) {
        return {
          dailyCount: 0,
          limit: -1,
          remaining: -1,
          isLimitReached: false,
          resetTime: new Date().toISOString()
        };
      }

      // Query per-trip usage (context_id = tripId)
      // Table may not exist in generated types yet, so use an explicit any-cast.
      const { data, error } = await (supabase as any)
        .from('concierge_usage')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('context_id', tripId);

      if (error) {
        console.error('Failed to fetch usage data:', error);
        return {
          dailyCount: 0,
          limit: tierLimit,
          remaining: tierLimit,
          isLimitReached: false,
          resetTime: new Date().toISOString()
        };
      }

      const tripCount = data?.length || 0;
      const remaining = Math.max(0, tierLimit - tripCount);
      const isLimitReached = tripCount >= tierLimit;

      return {
        dailyCount: tripCount,
        limit: tierLimit,
        remaining,
        isLimitReached,
        resetTime: new Date().toISOString()
      };
    },
    enabled: !!targetUserId && !!tripId,
    staleTime: 10 * 1000, // 10 seconds - refresh more often for per-trip tracking
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  const formatTimeUntilReset = (resetTime: string): string => {
    const now = new Date();
    const reset = new Date(resetTime);
    const diffMs = reset.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Reset now';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getUsageStatus = (): {
    status: 'ok' | 'warning' | 'limit_reached';
    message: string;
    color: string;
  } => {
    if (!usage) {
      return {
        status: 'ok',
        message: 'Loading...',
        color: 'text-muted-foreground'
      };
    }

    if (usage.limit === -1) {
      return {
        status: 'ok',
        message: 'Unlimited queries',
        color: 'text-green-500'
      };
    }

    if (usage.isLimitReached) {
      return {
        status: 'limit_reached',
        message: `Trip limit reached (${usage.dailyCount}/${usage.limit} used)`,
        color: 'text-red-500'
      };
    }

    if (usage.remaining <= 2 && usage.remaining > 0) {
      return {
        status: 'warning',
        message: `${usage.remaining} ${usage.remaining === 1 ? 'query' : 'queries'} left for this trip`,
        color: 'text-yellow-500'
      };
    }

    return {
      status: 'ok',
      message: `${usage.remaining}/${usage.limit} queries left`,
      color: 'text-green-500'
    };
  };

  return {
    usage,
    isLoading,
    error,
    refetch,
    formatTimeUntilReset,
    getUsageStatus,
    isFreeUser: userTier === 'free',
    isExplorerUser: userTier === 'explorer',
    isSuperAdmin: userTier === 'super_admin' || isSuperAdminByEmail,
    userTier,
    upgradeUrl: getUpgradeUrlForTier(userTier)
  };
};
