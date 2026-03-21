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
<<<<<<< HEAD
=======

  it('treats null chat_mode as open chat for non-event trips', () => {
    expect(resolveEffectiveMainChatMode(null, 'consumer', 4)).toBe('everyone');

    const memberCanPost = canPostInMainChat({
      chatMode: null,
      tripType: 'consumer',
      attendeeCount: 4,
      userRole: 'member',
      isLoading: false,
    });

    expect(memberCanPost).toBe(true);
  });

  it('treats broadcasts chat_mode as everyone for consumer trips (migration fix)', () => {
    // Migration 20260214211051 set DEFAULT 'broadcasts' for all trips.
    // Non-event trips should never be locked to broadcasts mode.
    expect(resolveEffectiveMainChatMode('broadcasts', 'consumer', 4)).toBe('everyone');
    expect(resolveEffectiveMainChatMode('broadcasts', 'pro', 10)).toBe('everyone');
    expect(resolveEffectiveMainChatMode('broadcasts', null, 4)).toBe('everyone');
  });

  it('preserves broadcasts mode for event trips', () => {
    expect(resolveEffectiveMainChatMode('broadcasts', 'event', 30)).toBe('broadcasts');
  });

  it('allows consumer trip member to post even if chat_mode is broadcasts', () => {
    const memberCanPost = canPostInMainChat({
      chatMode: 'broadcasts',
      tripType: 'consumer',
      attendeeCount: 4,
      userRole: 'member',
      isLoading: false,
    });

    expect(memberCanPost).toBe(true);
  });

  it('blocks non-admin posting in event with broadcasts mode', () => {
    const memberCanPost = canPostInMainChat({
      chatMode: 'broadcasts',
      tripType: 'event',
      attendeeCount: 30,
      userRole: 'member',
      isLoading: false,
    });

    const adminCanPost = canPostInMainChat({
      chatMode: 'broadcasts',
      tripType: 'event',
      attendeeCount: 30,
      userRole: 'admin',
      isLoading: false,
    });

    expect(memberCanPost).toBe(false);
    expect(adminCanPost).toBe(true);
  });
>>>>>>> origin/main
});
