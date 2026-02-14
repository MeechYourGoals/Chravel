import { describe, expect, it } from 'vitest';
import { hasPaidAccess } from '@/utils/paidAccess';

describe('hasPaidAccess', () => {
  it('returns false for free users', () => {
    expect(hasPaidAccess({ tier: 'free', status: 'active' })).toBe(false);
    expect(hasPaidAccess({ tier: 'free', status: 'inactive' })).toBe(false);
  });

  it('returns true for active paid tiers', () => {
    expect(hasPaidAccess({ tier: 'explorer', status: 'active' })).toBe(true);
    expect(hasPaidAccess({ tier: 'frequent-chraveler', status: 'active' })).toBe(true);
    expect(hasPaidAccess({ tier: 'pro-growth', status: 'active' })).toBe(true);
  });

  it('returns true for trial paid tiers and false for expired', () => {
    expect(hasPaidAccess({ tier: 'pro-enterprise', status: 'trial' })).toBe(true);
    expect(hasPaidAccess({ tier: 'explorer', status: 'expired' })).toBe(false);
  });

  it('always returns true for super admin', () => {
    expect(hasPaidAccess({ tier: 'free', status: 'inactive', isSuperAdmin: true })).toBe(true);
  });
});
