export type ConciergeUsageIncrementStatus =
  | 'incremented'
  | 'limit_reached'
  | 'monthly_limit_reached'
  | 'verification_unavailable';

export interface ConciergeUsageIncrementResult {
  status: ConciergeUsageIncrementStatus;
  error?: unknown;
}

/**
 * Monthly per-user limits by plan. 0 = unlimited.
 * These are global (across all trips) to control cost at the user level.
 */
const MONTHLY_USER_LIMITS: Record<string, number> = {
  free: 20,
  explorer: 100,
  frequent_traveler: 0, // unlimited
  frequent_chraveler: 0, // branded alias used by lovable-concierge
};

/**
 * Increment per-trip usage AND per-user monthly usage.
 * Checks monthly limit first (cheaper to reject early).
 */
export async function incrementConciergeTripUsage(
  supabase: any,
  tripId: string,
  tripQueryLimit: number,
  userId?: string,
  userPlan?: string,
): Promise<ConciergeUsageIncrementResult> {
  // 1. Check per-user monthly limit first (if userId provided)
  if (userId) {
    const plan = userPlan || 'free';
    const monthlyLimit = MONTHLY_USER_LIMITS[plan] ?? MONTHLY_USER_LIMITS.free;

    if (monthlyLimit > 0) {
      const { data: monthlyResult, error: monthlyError } = await supabase.rpc(
        'increment_user_concierge_monthly_usage',
        {
          p_user_id: userId,
          p_monthly_limit: monthlyLimit,
        },
      );

      if (!monthlyError && monthlyResult?.status === 'limit_reached') {
        return { status: 'monthly_limit_reached' };
      }
      // On error, fall through (don't block the user for a tracking failure)
    }
  }

  // 2. Check per-trip limit
  const { data: incrementResult, error: incrementError } = await supabase.rpc(
    'increment_concierge_trip_usage',
    {
      p_trip_id: tripId,
      p_limit: tripQueryLimit,
    },
  );

  if (incrementError) {
    return {
      status: 'verification_unavailable',
      error: incrementError,
    };
  }

  const incrementRow = Array.isArray(incrementResult) ? incrementResult[0] : incrementResult;
  if (incrementRow?.incremented === false) {
    return {
      status: 'limit_reached',
    };
  }

  return {
    status: 'incremented',
  };
}
