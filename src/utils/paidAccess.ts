export type PaidAccessTier =
  | 'free'
  | 'explorer'
  | 'frequent-chraveler'
  | 'pro-starter'
  | 'pro-growth'
  | 'pro-enterprise';

export type PaidAccessStatus = 'active' | 'trial' | 'expired' | 'inactive' | 'cancelled';

interface PaidAccessInput {
  tier?: PaidAccessTier | null;
  status?: PaidAccessStatus | null;
  isSuperAdmin?: boolean;
}

/**
 * Single source-of-truth for paid feature gating.
 * Any active/trial non-free tier (including trip passes mapped by check-subscription)
 * should be treated as paid access.
 */
export function hasPaidAccess({ tier, status, isSuperAdmin }: PaidAccessInput): boolean {
  if (isSuperAdmin) return true;

  const normalizedTier = tier ?? 'free';
  const normalizedStatus = status ?? 'inactive';

  if (normalizedTier === 'free') return false;

  return normalizedStatus === 'active' || normalizedStatus === 'trial';
}
