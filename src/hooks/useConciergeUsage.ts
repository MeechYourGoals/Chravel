import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';
import { useConsumerSubscription } from './useConsumerSubscription';
import { isSuperAdminEmail } from '@/utils/isSuperAdmin';

const FREE_TIER_LIMIT = 5;
const EXPLORER_TIER_LIMIT = 10;

export type ConciergePlan = 'free' | 'explorer' | 'frequent_traveler';

export interface ConciergeUsage {
  used: number;
  limit: number | null;
  remaining: number | null;
  isLimitReached: boolean;
  plan: ConciergePlan;
}

interface IncrementUsageResult {
  used: number;
  remaining: number | null;
  incremented: boolean;
  plan: ConciergePlan;
}

interface IncrementRpcRow {
  used_count: number | null;
  remaining: number | null;
  incremented: boolean | null;
}

const getLimitForPlan = (plan: ConciergePlan): number | null => {
  if (plan === 'free') return FREE_TIER_LIMIT;
  if (plan === 'explorer') return EXPLORER_TIER_LIMIT;
  return null;
};

const mapPlanFromTier = (
  tier:
    | 'free'
    | 'explorer'
    | 'frequent-chraveler'
    | 'pro-starter'
    | 'pro-growth'
    | 'pro-enterprise',
  isSuperAdmin: boolean,
): ConciergePlan => {
  if (isSuperAdmin) return 'frequent_traveler';
  if (tier === 'explorer') return 'explorer';
  if (tier === 'free') return 'free';
  return 'frequent_traveler';
};

const normalizeIncrementRpcRow = (data: unknown): IncrementRpcRow | null => {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') return null;

  const candidate = row as Record<string, unknown>;
  return {
    used_count: typeof candidate.used_count === 'number' ? candidate.used_count : null,
    remaining: typeof candidate.remaining === 'number' ? candidate.remaining : null,
    incremented: typeof candidate.incremented === 'boolean' ? candidate.incremented : null,
  };
};

const buildUsage = (plan: ConciergePlan, used: number): ConciergeUsage => {
  const limit = getLimitForPlan(plan);
  if (limit === null) {
    return {
      used,
      limit: null,
      remaining: null,
      isLimitReached: false,
      plan,
    };
  }

  const remaining = Math.max(limit - used, 0);
  return {
    used,
    limit,
    remaining,
    isLimitReached: remaining <= 0,
    plan,
  };
};

const FALLBACK_TRIP_USAGE_SELECT = 'query_count';

export const useConciergeUsage = (tripId: string, userId?: string) => {
  const { user } = useAuth();
  const { tier } = useConsumerSubscription();
  const queryClient = useQueryClient();
  const targetUserId = userId || user?.id;
  const isSuperAdmin = isSuperAdminEmail(user?.email);
  const userPlan = mapPlanFromTier(tier, isSuperAdmin);
  const planLimit = getLimitForPlan(userPlan);
  const usageQueryKey = useMemo(
    () => ['concierge-trip-usage', tripId, targetUserId, userPlan],
    [tripId, targetUserId, userPlan],
  );

  const {
    data: usage,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: usageQueryKey,
    queryFn: async (): Promise<ConciergeUsage> => {
      if (!targetUserId || !tripId) {
        return buildUsage(userPlan, 0);
      }

      if (planLimit === null) {
        return buildUsage(userPlan, 0);
      }

      const { data, error: rpcError } = await (supabase as any).rpc('get_concierge_trip_usage', {
        p_trip_id: tripId,
      });

      if (!rpcError) {
        const used = Number(data ?? 0);
        return buildUsage(userPlan, Number.isFinite(used) ? used : 0);
      }

      // Backward compatibility fallback: derive usage from legacy event rows.
      const { data: fallbackRows, error: fallbackError } = await (supabase as any)
        .from('concierge_usage')
        .select(FALLBACK_TRIP_USAGE_SELECT)
        .eq('user_id', targetUserId)
        .eq('context_type', 'trip')
        .eq('context_id', tripId);

      if (fallbackError) {
        console.error('Failed to fetch concierge usage:', fallbackError);
        return buildUsage(userPlan, 0);
      }

      const used = (fallbackRows ?? []).reduce(
        (total: number, row: { query_count?: number }) => total + Number(row.query_count ?? 1),
        0,
      );
      return buildUsage(userPlan, used);
    },
    enabled: !!targetUserId && !!tripId,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });

  const refreshUsage = useCallback(async (): Promise<ConciergeUsage | null> => {
    const result = await refetch();
    return result.data ?? null;
  }, [refetch]);

  const incrementUsageOnSuccess = useCallback(async (): Promise<IncrementUsageResult> => {
    if (!tripId || !targetUserId) {
      return {
        used: 0,
        remaining: planLimit,
        incremented: false,
        plan: userPlan,
      };
    }

    if (planLimit === null) {
      return {
        used: usage?.used ?? 0,
        remaining: null,
        incremented: true,
        plan: userPlan,
      };
    }

    const { data, error } = await (supabase as any).rpc('increment_concierge_trip_usage', {
      p_trip_id: tripId,
      p_limit: planLimit,
    });

    if (error) {
      throw error;
    }

    const parsed = normalizeIncrementRpcRow(data);
    const used = parsed?.used_count ?? usage?.used ?? 0;
    const remaining = parsed?.remaining ?? Math.max(planLimit - used, 0);
    const incremented = parsed?.incremented ?? true;

    const nextUsage = buildUsage(userPlan, used);
    queryClient.setQueryData(usageQueryKey, nextUsage);

    return {
      used,
      remaining,
      incremented,
      plan: userPlan,
    };
  }, [planLimit, queryClient, targetUserId, tripId, usage?.used, usageQueryKey, userPlan]);

  const getUsageStatus = (): {
    status: 'ok' | 'warning' | 'limit_reached';
    message: string;
    color: string;
  } => {
    if (!usage) {
      return {
        status: 'ok',
        message: 'Loading...',
        color: 'text-muted-foreground',
      };
    }

    if (usage.limit === null) {
      return {
        status: 'ok',
        message: 'Unlimited queries',
        color: 'text-green-500',
      };
    }

    if (usage.isLimitReached) {
      return {
        status: 'limit_reached',
        message: `Queries: 0/${usage.limit}`,
        color: 'text-red-500',
      };
    }

    if ((usage.remaining ?? 0) <= 2) {
      return {
        status: 'warning',
        message: `Queries: ${usage.remaining}/${usage.limit}`,
        color: 'text-yellow-500',
      };
    }

    return {
      status: 'ok',
      message: `Queries: ${usage.remaining}/${usage.limit}`,
      color: 'text-green-500',
    };
  };

  return {
    usage,
    isLoading,
    error,
    refetch,
    refreshUsage,
    incrementUsageOnSuccess,
    getUsageStatus,
    isFreeUser: userPlan === 'free',
    isExplorerUser: userPlan === 'explorer',
    isLimitedPlan: userPlan === 'free' || userPlan === 'explorer',
    isSuperAdmin,
    userPlan,
    planLimit,
    upgradeUrl: '/settings',
  };
};
