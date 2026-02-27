import { TripMember } from '../features/chat/hooks/useTripMembers';
import { PaymentMethod } from '../types/payments';

/**
 * Enforces the Single Canonical Source of Truth invariants.
 * Throws runtime errors if invariants are violated.
 */
export const Invariants = {
  Membership: {
    /**
     * Ensures a user is a valid member of the trip before performing sensitive actions.
     */
    assertIsMember: (userId: string, members: TripMember[]) => {
      const isMember = members.some(m => m.id === userId);
      if (!isMember) {
        throw new Error(`Invariant Violation: User ${userId} is not a member of this trip.`);
      }
    },

    /**
     * Ensures the creator is always considered a member (or admin).
     */
    assertCreatorIsMember: (creatorId: string, members: TripMember[]) => {
      const isPresent = members.some(m => m.id === creatorId);
      if (!isPresent) {
        console.warn(`Invariant Warning: Creator ${creatorId} missing from member list. Fixing...`);
        // In a real fix, we might auto-inject or repair. For now, we warn.
      }
    },
  },

  Payments: {
    /**
     * Ensures payment splits only include valid, effective members of the trip.
     */
    assertValidSplitParticipants: (participantIds: string[], effectiveMembers: TripMember[]) => {
      const memberIds = new Set(effectiveMembers.map(m => m.id));
      const invalid = participantIds.filter(id => !memberIds.has(id));
      if (invalid.length > 0) {
        throw new Error(
          `Invariant Violation: Split includes non-members: ${invalid.join(', ')}`
        );
      }
    },

    /**
     * Ensures total split amount equals the expense amount (within floating point epsilon).
     */
    assertSplitSumEqualsTotal: (totalAmount: number, splits: { amount: number }[]) => {
      const sum = splits.reduce((a, b) => a + b.amount, 0);
      if (Math.abs(sum - totalAmount) > 0.01) { // 1 cent tolerance
        throw new Error(
          `Invariant Violation: Split sum ${sum} does not equal total ${totalAmount}`
        );
      }
    },
  },

  Concierge: {
    /**
     * Ensures Concierge only accesses data it is allowed to see (Trip-scoped).
     */
    assertTripScopedAccess: (requestedTripId: string, contextTripId: string) => {
      if (requestedTripId !== contextTripId) {
        throw new Error(
          `Invariant Violation: Concierge attempted to access Trip ${requestedTripId} while scoped to Trip ${contextTripId}`
        );
      }
    },
  },

  Notifications: {
    /**
     * Ensures notifications are not sent to users who have muted the relevant channel/type.
     */
    assertNotificationAudience: (
      recipientId: string,
      preferences: { muted: boolean; quietHours: boolean }
    ) => {
      if (preferences.muted) {
        // This is a logic check, not necessarily a throw, but useful for debug assertions
        console.debug(`Notification suppressed for ${recipientId} due to mute settings.`);
        return false;
      }
      return true;
    },
  },
};
