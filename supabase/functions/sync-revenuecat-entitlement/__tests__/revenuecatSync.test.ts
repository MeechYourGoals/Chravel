import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  deriveRevenueCatEntitlementState,
  fetchRevenueCatSubscriber,
  resolveRevenueCatServerApiKey,
} from '../revenuecat.ts';

describe('sync-revenuecat-entitlement security hardening', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a server-side RevenueCat secret instead of trusting public config', () => {
    const getEnv = vi.spyOn(Deno.env, 'get');
    getEnv.mockImplementation(key => {
      if (key === 'REVENUECAT_SECRET_KEY') return 'sk_test_server_secret';
      return '';
    });

    expect(resolveRevenueCatServerApiKey()).toBe('sk_test_server_secret');
  });

  it('derives active entitlements from RevenueCat server data and ignores expired ones', () => {
    const state = deriveRevenueCatEntitlementState(
      {
        original_app_user_id: 'user-123',
        entitlements: {
          chravel_explorer: {
            expires_date: '2026-04-01T00:00:00.000Z',
            product_identifier: 'explorer_monthly',
          },
          chravel_pro_growth: {
            expires_date: '2026-03-01T00:00:00.000Z',
            product_identifier: 'pro_growth_monthly',
          },
        },
        subscriptions: {
          explorer_monthly: {
            expires_date: '2026-04-01T00:00:00.000Z',
            period_type: 'trial',
          },
          pro_growth_monthly: {
            expires_date: '2026-03-01T00:00:00.000Z',
            period_type: 'normal',
          },
        },
      },
      new Date('2026-03-16T00:00:00.000Z'),
    );

    expect(state).toEqual({
      plan: 'explorer',
      status: 'trialing',
      currentPeriodEnd: '2026-04-01T00:00:00.000Z',
      entitlementIds: ['chravel_explorer'],
      revenueCatCustomerId: 'user-123',
    });
  });

  it('fetches the authenticated user subscriber record from RevenueCat', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        subscriber: {
          original_app_user_id: 'user-456',
          entitlements: {},
        },
      }),
    });

    const subscriber = await fetchRevenueCatSubscriber(
      fetchMock as unknown as typeof fetch,
      'sk_test_server_secret',
      'user-456',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.revenuecat.com/v1/subscribers/user-456',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test_server_secret',
        }),
      }),
    );
    expect(subscriber?.original_app_user_id).toBe('user-456');
  });
});
