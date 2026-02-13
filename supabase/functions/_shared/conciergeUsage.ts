export type ConciergeUsageIncrementStatus = 'incremented' | 'limit_reached' | 'verification_unavailable';

export interface ConciergeUsageIncrementResult {
  status: ConciergeUsageIncrementStatus;
  error?: unknown;
}

export async function incrementConciergeTripUsage(
  supabase: any,
  tripId: string,
  tripQueryLimit: number,
): Promise<ConciergeUsageIncrementResult> {
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
