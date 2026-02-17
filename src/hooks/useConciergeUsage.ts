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

interface EntitlementRow {
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
}

interface ProfileSubscriptionRow {
  app_role: string | null;
  subscription_status: string | null;
  subscription_product_id: string | null;
}

interface RpcResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

const EXPLORER_PRODUCT_IDS = new Set(['prod_Tc0SWNhLkoCDIi', 'prod_Tx0AZIWAubAWD3']);

const invokeRpc = async <T>(
  functionName: string,
  params: Record<string, unknown>,
): Promise<RpcResult<T>> => {
  const rpcClient = supabase as unknown as {
    rpc: (fn: string, args?: Record<string, unknown>) => Promise<RpcResult<T>>;
  };
  return rpcClient.rpc(functionName, params);
};

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

const isActiveStatus = (status?: string | null): boolean =>
  status === 'active' || status === 'trialing';

const hasActivePeriod = (periodEnd?: string | null): boolean => {
  if (!periodEnd) return true;
  const parsed = Date.parse(periodEnd);
  if (Number.isNaN(parsed)) return true;
  return parsed > Date.now();
};

const mapRawPlanToUsagePlan = (plan?: string | null): ConciergePlan => {
  if (plan === 'free' || !plan) return 'free';
  if (plan === 'explorer' || plan === 'plus') return 'explorer';
  return 'frequent_traveler';
};

const resolvePlanFromProfile = (
  profile: ProfileSubscriptionRow | null | undefined,
  fallbackTier:
    | 'free'
    | 'explorer'
    | 'frequent-chraveler'
    | 'pro-starter'
    | 'pro-growth'
    | 'pro-enterprise',
): ConciergePlan => {
  if (profile && isActiveStatus(profile.subscription_status)) {
    const productId = profile.subscription_product_id || '';
    if (productId && EXPLORER_PRODUCT_IDS.has(productId)) {
      return 'explorer';
    }
    if (productId) {
      return 'frequent_traveler';
    }
  }

  if (profile?.app_role === 'plus' || profile?.app_role === 'explorer') return 'explorer';
  if (profile?.app_role === 'consumer' || profile?.app_role === 'free') return 'free';
  if (profile?.app_role) return 'frequent_traveler';

  return mapPlanFromTier(fallbackTier, false);
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

  const { data: entitlementData } = useQuery({
    queryKey: ['concierge-entitlement-plan', targetUserId],
    queryFn: async (): Promise<EntitlementRow | null> => {
      if (!targetUserId) return null;
      const { data, error } = await supabase
        .from('user_entitlements')
        .select('plan, status, current_period_end')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch entitlement plan:', error);
        return null;
      }

      return data;
    },
    enabled: !!targetUserId,
    staleTime: 30 * 1000,
  });

  const { data: profileData } = useQuery({
    queryKey: ['concierge-profile-plan', targetUserId],
    queryFn: async (): Promise<ProfileSubscriptionRow | null> => {
      if (!targetUserId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('app_role, subscription_status, subscription_product_id')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch profile plan fallback:', error);
        return null;
      }

      return data;
    },
    enabled: !!targetUserId,
    staleTime: 5 * 60 * 1000,
  });

  const userPlan = useMemo(() => {
    if (isSuperAdmin) return 'frequent_traveler';

    if (
      entitlementData &&
      isActiveStatus(entitlementData.status) &&
      hasActivePeriod(entitlementData.current_period_end)
    ) {
      return mapRawPlanToUsagePlan(entitlementData.plan);
    }

    return resolvePlanFromProfile(profileData, tier);
  }, [entitlementData, isSuperAdmin, profileData, tier]);

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

      const { data, error: rpcError } = await invokeRpc<number>('get_concierge_trip_usage', {
        p_trip_id: tripId,
      });

      if (!rpcError) {
        const used = Number(data ?? 0);
        return buildUsage(userPlan, Number.isFinite(used) ? used : 0);
      }

      // Backward compatibility fallback: derive usage from legacy event rows.
      const { data: fallbackRows, error: fallbackError } = await supabase
        .from('concierge_usage')
        .select(FALLBACK_TRIP_USAGE_SELECT)
        .eq('user_id', targetUserId)
        .in('context_type', ['trip', 'event'])
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

    const { data, error } = await invokeRpc<IncrementRpcRow | IncrementRpcRow[]>(
      'increment_concierge_trip_usage',
      {
        p_trip_id: tripId,
        p_limit: planLimit,
      },
    );

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
        message: 'unlimited asks',
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
