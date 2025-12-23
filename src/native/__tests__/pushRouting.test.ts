/**
 * Push Notification Routing Tests
 * Verifies payload parsing and route building
 */

import { describe, it, expect, vi } from 'vitest';
import { buildRouteFromPayload, handleNotificationNavigation, getTripIdFromPayload } from '../pushRouting';
import { ChravelPushPayload } from '../push';

describe('buildRouteFromPayload', () => {
  it('routes chat_message to chat tab', () => {
    const payload: ChravelPushPayload = {
      type: 'chat_message',
      tripId: 'trip-123',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=chat');
  });

  it('routes chat_message with threadId to specific thread', () => {
    const payload: ChravelPushPayload = {
      type: 'chat_message',
      tripId: 'trip-123',
      threadId: 'thread-456',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=chat&thread=thread-456');
  });

  it('routes chat_message with threadId and messageId', () => {
    const payload: ChravelPushPayload = {
      type: 'chat_message',
      tripId: 'trip-123',
      threadId: 'thread-456',
      messageId: 'msg-789',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=chat&thread=thread-456&message=msg-789');
  });

  it('routes poll_update to polls tab', () => {
    const payload: ChravelPushPayload = {
      type: 'poll_update',
      tripId: 'trip-123',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=polls');
  });

  it('routes poll_update with pollId', () => {
    const payload: ChravelPushPayload = {
      type: 'poll_update',
      tripId: 'trip-123',
      pollId: 'poll-999',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=polls&poll=poll-999');
  });

  it('routes task_update to tasks tab', () => {
    const payload: ChravelPushPayload = {
      type: 'task_update',
      tripId: 'trip-123',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=tasks');
  });

  it('routes task_update with taskId', () => {
    const payload: ChravelPushPayload = {
      type: 'task_update',
      tripId: 'trip-123',
      taskId: 'task-abc',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=tasks&task=task-abc');
  });

  it('routes calendar_event to calendar tab', () => {
    const payload: ChravelPushPayload = {
      type: 'calendar_event',
      tripId: 'trip-123',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=calendar');
  });

  it('routes calendar_event with eventId', () => {
    const payload: ChravelPushPayload = {
      type: 'calendar_event',
      tripId: 'trip-123',
      eventId: 'event-xyz',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=calendar&event=event-xyz');
  });

  it('routes broadcast to chat broadcasts view', () => {
    const payload: ChravelPushPayload = {
      type: 'broadcast',
      tripId: 'trip-123',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123?tab=chat&view=broadcasts');
  });

  it('routes trip_update to trip overview (no params)', () => {
    const payload: ChravelPushPayload = {
      type: 'trip_update',
      tripId: 'trip-123',
    };
    expect(buildRouteFromPayload(payload)).toBe('/trip/trip-123');
  });
});

describe('handleNotificationNavigation', () => {
  it('calls navigate with correct route', () => {
    const mockNavigate = vi.fn();
    const payload: ChravelPushPayload = {
      type: 'task_update',
      tripId: 'trip-123',
      taskId: 'task-abc',
    };
    
    handleNotificationNavigation(payload, mockNavigate);
    expect(mockNavigate).toHaveBeenCalledWith('/trip/trip-123?tab=tasks&task=task-abc');
  });

  it('calls navigate for chat message with thread', () => {
    const mockNavigate = vi.fn();
    const payload: ChravelPushPayload = {
      type: 'chat_message',
      tripId: 'trip-456',
      threadId: 'thread-789',
    };
    
    handleNotificationNavigation(payload, mockNavigate);
    expect(mockNavigate).toHaveBeenCalledWith('/trip/trip-456?tab=chat&thread=thread-789');
  });
});

describe('getTripIdFromPayload', () => {
  it('extracts tripId from valid payload', () => {
    const payload: ChravelPushPayload = {
      type: 'chat_message',
      tripId: 'trip-123',
    };
    expect(getTripIdFromPayload(payload)).toBe('trip-123');
  });

  it('returns null for null payload', () => {
    expect(getTripIdFromPayload(null)).toBeNull();
  });
});
