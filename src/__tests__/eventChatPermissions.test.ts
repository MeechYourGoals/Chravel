import { describe, expect, it } from 'vitest';
import {
  EVENT_OPEN_CHAT_MAX_ATTENDEES,
  canEnableEveryoneChat,
  canPostInMainChat,
  resolveEffectiveMainChatMode,
} from '@/lib/eventChatPermissions';

describe('eventChatPermissions', () => {
  it('allows everyone mode for events at exactly 50 attendees', () => {
    expect(canEnableEveryoneChat('event', EVENT_OPEN_CHAT_MAX_ATTENDEES)).toBe(true);
    expect(resolveEffectiveMainChatMode('everyone', 'event', EVENT_OPEN_CHAT_MAX_ATTENDEES)).toBe(
      'everyone',
    );
  });

  it('forces admin_only behavior for events above 50 attendees', () => {
    expect(canEnableEveryoneChat('event', EVENT_OPEN_CHAT_MAX_ATTENDEES + 1)).toBe(false);
    expect(
      resolveEffectiveMainChatMode('everyone', 'event', EVENT_OPEN_CHAT_MAX_ATTENDEES + 1),
    ).toBe('admin_only');
  });

  it('blocks attendee posting in large event even with legacy everyone value', () => {
    const attendeeCanPost = canPostInMainChat({
      chatMode: 'everyone',
      tripType: 'event',
      attendeeCount: EVENT_OPEN_CHAT_MAX_ATTENDEES + 20,
      userRole: 'member',
      isLoading: false,
    });

    const adminCanPost = canPostInMainChat({
      chatMode: 'everyone',
      tripType: 'event',
      attendeeCount: EVENT_OPEN_CHAT_MAX_ATTENDEES + 20,
      userRole: 'admin',
      isLoading: false,
    });

    expect(attendeeCanPost).toBe(false);
    expect(adminCanPost).toBe(true);
  });
});
