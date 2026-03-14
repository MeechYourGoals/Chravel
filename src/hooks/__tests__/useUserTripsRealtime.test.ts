import { describe, expect, it } from 'vitest';

import { shouldInvalidateTripsForMemberChange } from '../useUserTripsRealtime';

describe('useUserTripsRealtime member-change filtering', () => {
  it('invalidates only when the changed member row belongs to the current user', () => {
    const userId = 'user-1';

    expect(shouldInvalidateTripsForMemberChange({ new: { user_id: userId } }, userId)).toBe(true);
    expect(shouldInvalidateTripsForMemberChange({ old: { user_id: userId } }, userId)).toBe(true);
    expect(
      shouldInvalidateTripsForMemberChange(
        {
          new: { user_id: 'other-user' },
          old: { user_id: 'another-user' },
        },
        userId,
      ),
    ).toBe(false);
  });
});
