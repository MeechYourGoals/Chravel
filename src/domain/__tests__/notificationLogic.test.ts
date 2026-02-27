import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationLogic } from '../notifications/notificationLogic';
import { membershipRepo } from '../trip/membershipRepo';
import { supabase } from '@/integrations/supabase/client';
import { Invariants } from '../invariants';

// Mock dependencies
vi.mock('../trip/membershipRepo', () => ({
  membershipRepo: {
    getMembers: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(),
    })),
  },
}));

describe('Notification Audience Resolution', () => {
  const tripId = 'trip-123';
  const actorId = 'user-actor';

  const mockMembers = [
    { id: 'user-1', role: 'member' },
    { id: 'user-2', role: 'member' },
    { id: 'user-actor', role: 'admin' }, // The person doing the action
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (membershipRepo.getMembers as any).mockResolvedValue(mockMembers);
  });

  it('excludes the actor from the audience', async () => {
    // Mock preferences: everyone wants push
    const mockGlobalPrefs = mockMembers.map(m => ({ user_id: m.id, push_enabled: true }));
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({ // Generic mock for chained calls
         in: vi.fn().mockResolvedValue({ data: mockGlobalPrefs, error: null }),
         eq: vi.fn().mockReturnValue({ // For trip_member_preferences
             in: vi.fn().mockResolvedValue({ data: [], error: null })
         })
      })
    });

    const audience = await notificationLogic.resolveNotificationAudience({
      tripId,
      type: 'message',
      actorId,
    });

    expect(audience.push).toContain('user-1');
    expect(audience.push).toContain('user-2');
    expect(audience.push).not.toContain('user-actor');
  });

  it('respects global push disabled preference', async () => {
    const mockGlobalPrefs = [
      { user_id: 'user-1', push_enabled: true },
      { user_id: 'user-2', push_enabled: false }, // Disabled push
    ];

    (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
           in: vi.fn().mockResolvedValue({ data: mockGlobalPrefs, error: null }),
           eq: vi.fn().mockReturnValue({
               in: vi.fn().mockResolvedValue({ data: [], error: null })
           })
        })
      });

    const audience = await notificationLogic.resolveNotificationAudience({
      tripId,
      type: 'message',
      actorId,
    });

    expect(audience.push).toContain('user-1');
    expect(audience.push).not.toContain('user-2');
  });

  it('respects quiet hours for standard notifications', async () => {
    // Mock time to 23:00 (11 PM)
    vi.useFakeTimers();
    const date = new Date(2023, 1, 1, 23, 0, 0);
    vi.setSystemTime(date);

    const mockGlobalPrefs = [
      {
          user_id: 'user-1',
          push_enabled: true,
          quiet_hours_enabled: true,
          quiet_start: '22:00',
          quiet_end: '08:00'
      },
    ];

    (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
           in: vi.fn().mockResolvedValue({ data: mockGlobalPrefs, error: null }),
           eq: vi.fn().mockReturnValue({
               in: vi.fn().mockResolvedValue({ data: [], error: null })
           })
        })
      });

    const audience = await notificationLogic.resolveNotificationAudience({
      tripId,
      type: 'message', // Standard type
      actorId,
    });

    expect(audience.push).not.toContain('user-1'); // Should be suppressed
    vi.useRealTimers();
  });

  it('bypasses quiet hours for broadcasts', async () => {
    // Mock time to 23:00 (11 PM)
    vi.useFakeTimers();
    const date = new Date(2023, 1, 1, 23, 0, 0);
    vi.setSystemTime(date);

    const mockGlobalPrefs = [
      {
          user_id: 'user-1',
          push_enabled: true,
          quiet_hours_enabled: true,
          quiet_start: '22:00',
          quiet_end: '08:00'
      },
    ];

    (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
           in: vi.fn().mockResolvedValue({ data: mockGlobalPrefs, error: null }),
           eq: vi.fn().mockReturnValue({
               in: vi.fn().mockResolvedValue({ data: [], error: null })
           })
        })
      });

    const audience = await notificationLogic.resolveNotificationAudience({
      tripId,
      type: 'broadcast', // Urgent type
      actorId,
    });

    expect(audience.push).toContain('user-1'); // Should bypass
    vi.useRealTimers();
  });
});
