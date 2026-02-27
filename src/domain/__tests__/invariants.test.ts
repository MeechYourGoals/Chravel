import { describe, it, expect, vi } from 'vitest';
import { Invariants } from '../invariants';

describe('Domain Invariants', () => {
  describe('Membership', () => {
    it('throws when asserting member but user is missing', () => {
      const members = [{ id: 'user-1', name: 'User 1' }];
      expect(() => {
        Invariants.Membership.assertIsMember('user-2', members as any);
      }).toThrow(/Invariant Violation/);
    });

    it('passes when user is a member', () => {
      const members = [{ id: 'user-1', name: 'User 1' }];
      expect(() => {
        Invariants.Membership.assertIsMember('user-1', members as any);
      }).not.toThrow();
    });
  });

  describe('Payments', () => {
    it('throws when split participants include non-members', () => {
      const members = [{ id: 'user-1', name: 'A' }];
      const splits = ['user-1', 'user-2']; // user-2 is invalid
      expect(() => {
        Invariants.Payments.assertValidSplitParticipants(splits, members as any);
      }).toThrow(/Invariant Violation/);
    });

    it('throws when split sum does not match total', () => {
      const total = 100;
      const splits = [{ amount: 33 }, { amount: 33 }, { amount: 33 }]; // Sum 99
      expect(() => {
        Invariants.Payments.assertSplitSumEqualsTotal(total, splits);
      }).toThrow(/Invariant Violation/);
    });
  });

  describe('Concierge', () => {
    it('throws on cross-trip access attempt', () => {
      expect(() => {
        Invariants.Concierge.assertTripScopedAccess('trip-B', 'trip-A');
      }).toThrow(/Invariant Violation/);
    });
  });
});
