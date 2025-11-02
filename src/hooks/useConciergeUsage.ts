import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';

const FREE_TIER_LIMIT = 10;

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

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey: ['concierge-usage', targetUserId],
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
          limit: FREE_TIER_LIMIT,
          remaining: FREE_TIER_LIMIT,
          isLimitReached: false,
          resetTime: new Date().toISOString()
        };
      }

      const dailyCount = data?.length || 0;
      const remaining = Math.max(0, FREE_TIER_LIMIT - dailyCount);
      const isLimitReached = dailyCount >= FREE_TIER_LIMIT;

      // Calculate reset time (next midnight)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        dailyCount,
        limit: FREE_TIER_LIMIT,
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
    isFreeUser: true, // TODO: Check user's actual tier
    upgradeUrl: '/settings/billing' // TODO: Make this dynamic
  };
};
