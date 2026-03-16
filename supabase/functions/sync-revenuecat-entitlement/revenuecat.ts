export const REVENUECAT_SERVER_KEY_ENV_NAMES = ['REVENUECAT_SECRET_KEY', 'REVENUECAT_API_KEY'] as const;

const REVENUECAT_SERVER_KEY_PATTERN = /^(sk_|atk_)/;

const PLAN_PRIORITY = [
  'free',
  'explorer',
  'frequent-chraveler',
  'pro-starter',
  'pro-growth',
  'pro-enterprise',
] as const;

function getPlanPriority(plan: string): number {
  return PLAN_PRIORITY.indexOf(plan as (typeof PLAN_PRIORITY)[number]);
}

export const ENTITLEMENT_TO_PLAN: Record<string, string> = {
  chravel_explorer: 'explorer',
  chravel_frequent_chraveler: 'frequent-chraveler',
  chravel_pro_starter: 'pro-starter',
  chravel_pro_growth: 'pro-growth',
  chravel_pro_enterprise: 'pro-enterprise',
};

export interface RevenueCatSubscription {
  expires_date?: string | null;
  period_type?: string | null;
}

export interface RevenueCatEntitlement {
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string | null;
}

export interface RevenueCatSubscriber {
  original_app_user_id?: string | null;
  entitlements?: Record<string, RevenueCatEntitlement>;
  subscriptions?: Record<string, RevenueCatSubscription>;
}

interface RevenueCatSubscriberResponse {
  subscriber?: RevenueCatSubscriber;
}

export interface DerivedRevenueCatEntitlementState {
  plan: string;
  status: 'active' | 'trialing' | 'expired';
  currentPeriodEnd: string | null;
  entitlementIds: string[];
  revenueCatCustomerId: string | null;
}

function parseRevenueCatDate(value?: string | null): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function maxDateIso(currentIso: string | null, candidate: Date | null): string | null {
  if (!candidate) return currentIso;

  if (!currentIso) {
    return candidate.toISOString();
  }

  return new Date(currentIso) >= candidate ? currentIso : candidate.toISOString();
}

export function resolveRevenueCatServerApiKey(): string {
  for (const envName of REVENUECAT_SERVER_KEY_ENV_NAMES) {
    const value = Deno.env.get(envName)?.trim();
    if (!value) continue;

    if (!REVENUECAT_SERVER_KEY_PATTERN.test(value)) {
      throw new Error(
        `RevenueCat server key in ${envName} has invalid format. Expected a server key starting with "sk_" or OAuth token starting with "atk_".`,
      );
    }

    return value;
  }

  throw new Error(
    `Missing required RevenueCat server secret. Set one of: ${REVENUECAT_SERVER_KEY_ENV_NAMES.join(', ')}.`,
  );
}

export function isRevenueCatEntitlementActive(
  entitlement: RevenueCatEntitlement,
  now: Date = new Date(),
): boolean {
  const gracePeriodExpiry = parseRevenueCatDate(entitlement.grace_period_expires_date);
  if (gracePeriodExpiry && gracePeriodExpiry > now) {
    return true;
  }

  const expiry = parseRevenueCatDate(entitlement.expires_date);
  if (!expiry) {
    return true;
  }

  return expiry > now;
}

export function deriveRevenueCatEntitlementState(
  subscriber: RevenueCatSubscriber | null,
  now: Date = new Date(),
): DerivedRevenueCatEntitlementState {
  let plan = 'free';
  let status: DerivedRevenueCatEntitlementState['status'] = 'expired';
  let currentPeriodEnd: string | null = null;
  const entitlementIds: string[] = [];

  const entitlements = subscriber?.entitlements ?? {};
  const subscriptions = subscriber?.subscriptions ?? {};

  for (const [entitlementId, entitlement] of Object.entries(entitlements)) {
    if (!isRevenueCatEntitlementActive(entitlement, now)) {
      continue;
    }

    entitlementIds.push(entitlementId);

    const mappedPlan = ENTITLEMENT_TO_PLAN[entitlementId];
    if (mappedPlan && getPlanPriority(mappedPlan) > getPlanPriority(plan)) {
      plan = mappedPlan;
    }

    currentPeriodEnd = maxDateIso(
      currentPeriodEnd,
      parseRevenueCatDate(entitlement.grace_period_expires_date) ??
        parseRevenueCatDate(entitlement.expires_date),
    );

    const subscription =
      entitlement.product_identifier && subscriptions[entitlement.product_identifier]
        ? subscriptions[entitlement.product_identifier]
        : null;

    if (subscription?.period_type === 'trial') {
      status = 'trialing';
    } else if (status !== 'trialing') {
      status = 'active';
    }
  }

  return {
    plan,
    status,
    currentPeriodEnd,
    entitlementIds,
    revenueCatCustomerId: subscriber?.original_app_user_id ?? null,
  };
}

export async function fetchRevenueCatSubscriber(
  fetchImpl: typeof fetch,
  apiKey: string,
  appUserId: string,
): Promise<RevenueCatSubscriber | null> {
  const response = await fetchImpl(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`RevenueCat subscriber fetch failed with status ${response.status}`);
  }

  const payload = (await response.json()) as RevenueCatSubscriberResponse;
  if (!payload?.subscriber || typeof payload.subscriber !== 'object') {
    throw new Error('RevenueCat subscriber response missing subscriber object');
  }

  return payload.subscriber;
}
