import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';

const FREE_TIER_LIMIT = 10;
const PLUS_TIER_LIMIT = 50;
const PRO_TIER_LIMIT = -1; // Unlimited

type UserTier = 'free' | 'plus' | 'pro';

const getTierFromRole = (appRole?: string): UserTier => {
  if (!appRole || appRole === 'consumer') return 'free';
  if (appRole === 'plus') return 'plus';
  if (appRole === 'pro' || appRole === 'enterprise' || appRole === 'advertiser') return 'pro';
  return 'free';
};

const getLimitForTier = (tier: UserTier): number => {
  switch (tier) {
    case 'pro': return PRO_TIER_LIMIT;
    case 'plus': return PLUS_TIER_LIMIT;
    default: return FREE_TIER_LIMIT;
  }
};

const getUpgradeUrlForTier = (tier: UserTier): string => {
  if (tier === 'free') return '/settings/billing?plan=plus';
  if (tier === 'plus') return '/settings/billing?plan=pro';
  return '/settings/billing'; // Pro users see billing page
};

export interface ConciergeUsage {
  dailyCount: number;
  limit: number;
  remaining: number;
  isLimitReached: boolean;
  resetTime: string;
}

export const useConciergeUsage = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  // Fetch user tier from profile
  const { data: profileData } = useQuery({
    queryKey: ['user-profile', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('app_role')
        .eq('id', targetUserId)
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

  const userTier = getTierFromRole(profileData?.app_role);
  const tierLimit = getLimitForTier(userTier);

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey: ['concierge-usage', targetUserId, userTier],
    queryFn: async (): Promise<ConciergeUsage> => {
      if (!targetUserId) {
        return {
          dailyCount: 0,
          limit: FREE_TIER_LIMIT,
          remaining: FREE_TIER_LIMIT,
          isLimitReached: false,
          resetTime: new Date().toISOString()
        };
      }

      // Pro tier has unlimited queries
      if (tierLimit === PRO_TIER_LIMIT) {
        return {
          dailyCount: 0,
          limit: -1,
          remaining: -1,
          isLimitReached: false,
          resetTime: new Date().toISOString()
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // @ts-ignore - Supabase type instantiation issue
      const result = await supabase
        // @ts-ignore - Supabase type instantiation issue
        .from('concierge_usage')
        .select('id')
        .eq('user_id', targetUserId)
        .gte('created_at', today.toISOString());

      // @ts-ignore - Supabase type instantiation issue
      const { data, error } = result;

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

      const dailyCount = data?.length || 0;
      const remaining = Math.max(0, tierLimit - dailyCount);
      const isLimitReached = dailyCount >= tierLimit;

      // Calculate reset time (next midnight)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        dailyCount,
        limit: tierLimit,
        remaining,
        isLimitReached,
        resetTime: tomorrow.toISOString()
      };
    },
    enabled: !!targetUserId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
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
        message: 'Loading usage data...',
        color: 'text-gray-500'
      };
    }

    if (usage.isLimitReached) {
      return {
        status: 'limit_reached',
        message: `Daily limit reached (${usage.dailyCount}/${usage.limit})`,
        color: 'text-red-500'
      };
    }

    if (usage.remaining <= 2) {
      return {
        status: 'warning',
        message: `${usage.remaining} queries remaining today`,
        color: 'text-yellow-500'
      };
    }

    return {
      status: 'ok',
      message: `${usage.remaining} queries remaining today`,
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
    userTier,
    upgradeUrl: getUpgradeUrlForTier(userTier)
  };
};
