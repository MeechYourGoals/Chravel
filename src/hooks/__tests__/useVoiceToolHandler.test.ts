import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Hoist mocks before module imports
const { mockInsert, mockSelect, mockSingle, mockInvoke } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockSelect: vi.fn(),
  mockSingle: vi.fn(),
  mockInvoke: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    })),
    functions: {
      invoke: mockInvoke,
    },
  },
}));

vi.mock('@/telemetry/service', () => ({
  telemetry: {
    track: vi.fn(),
  },
}));

import { useVoiceToolHandler } from '../useVoiceToolHandler';
import type { ToolCallRequest } from '../useGeminiLive';

function makeCall(name: string, args: Record<string, unknown>): ToolCallRequest {
  return { id: `call-${Date.now()}`, name, args };
}

describe('useVoiceToolHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth gate', () => {
    it('refuses tool calls when userId is missing', async () => {
      const { result } = renderHook(() => useVoiceToolHandler({ tripId: 'trip-1', userId: '' }));

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(
          makeCall('addToCalendar', { title: 'Dinner', datetime: '2026-03-15T19:00:00Z' }),
        );
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing user or trip context');
    });

    it('refuses tool calls when tripId is missing', async () => {
      const { result } = renderHook(() => useVoiceToolHandler({ tripId: '', userId: 'user-1' }));

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(makeCall('createTask', { content: 'Test' }));
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing user or trip context');
    });
  });

  describe('idempotency cache', () => {
    it('deduplicates write calls with same idempotency_key', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'evt-1', title: 'Dinner', start_time: '2026-03-15T19:00:00Z' },
        error: null,
      });

      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      const args = {
        title: 'Dinner',
        datetime: '2026-03-15T19:00:00Z',
        idempotency_key: 'key-abc',
      };

      let first: Record<string, unknown> = {};
      let second: Record<string, unknown> = {};
      await act(async () => {
        first = await result.current.handleToolCall(makeCall('addToCalendar', args));
      });
      await act(async () => {
        second = await result.current.handleToolCall(makeCall('addToCalendar', args));
      });

      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(second._deduplicated).toBe(true);
      // Only one insert call should have been made
      expect(mockInsert).toHaveBeenCalledTimes(1);
    });

    it('allows different idempotency keys to execute separately', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'evt-1', title: 'Dinner', start_time: '2026-03-15T19:00:00Z' },
        error: null,
      });

      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      await act(async () => {
        await result.current.handleToolCall(
          makeCall('addToCalendar', {
            title: 'Dinner',
            datetime: '2026-03-15T19:00:00Z',
            idempotency_key: 'key-1',
          }),
        );
      });
      await act(async () => {
        await result.current.handleToolCall(
          makeCall('addToCalendar', {
            title: 'Lunch',
            datetime: '2026-03-15T12:00:00Z',
            idempotency_key: 'key-2',
          }),
        );
      });

      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it('clears cache on resetIdempotencyCache', async () => {
      mockSingle.mockResolvedValue({
        data: { id: 'evt-1', title: 'Dinner', start_time: '2026-03-15T19:00:00Z' },
        error: null,
      });

      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      const args = {
        title: 'Dinner',
        datetime: '2026-03-15T19:00:00Z',
        idempotency_key: 'key-abc',
      };

      await act(async () => {
        await result.current.handleToolCall(makeCall('addToCalendar', args));
      });

      act(() => {
        result.current.resetIdempotencyCache();
      });

      await act(async () => {
        await result.current.handleToolCall(makeCall('addToCalendar', args));
      });

      // After cache reset, a second insert should have been made
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('validation', () => {
    it('returns error for addToCalendar without title', async () => {
      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(
          makeCall('addToCalendar', { datetime: '2026-03-15T19:00:00Z' }),
        );
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('title is required');
    });

    it('returns error for addToCalendar without datetime', async () => {
      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(
          makeCall('addToCalendar', { title: 'Dinner' }),
        );
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('datetime is required');
    });

    it('returns error for createTask without content', async () => {
      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(makeCall('createTask', {}));
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('content is required');
    });

    it('returns error for createPoll with fewer than 2 options', async () => {
      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(
          makeCall('createPoll', { question: 'Where to eat?', options: ['Pizza'] }),
        );
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('at least 2');
    });

    it('returns error for invalid datetime', async () => {
      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(
          makeCall('addToCalendar', { title: 'Dinner', datetime: 'not-a-date' }),
        );
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('not a valid date');
    });
  });

  describe('server-side tools', () => {
    it('routes server-side tools to execute-concierge-tool', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, results: [] },
        error: null,
      });

      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(
          makeCall('searchPlaces', { query: 'restaurants nearby' }),
        );
      });

      expect(mockInvoke).toHaveBeenCalledWith('execute-concierge-tool', {
        body: {
          toolName: 'searchPlaces',
          args: { query: 'restaurants nearby' },
          tripId: 'trip-1',
        },
      });
      expect(response.success).toBe(true);
    });

    it('returns error when server tool fails', async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: 'Service unavailable' },
      });

      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(
          makeCall('searchPlaces', { query: 'restaurants' }),
        );
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Service unavailable');
    });
  });

  describe('unknown tools', () => {
    it('returns error for unrecognized tool name', async () => {
      const { result } = renderHook(() =>
        useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
      );

      let response: Record<string, unknown> = {};
      await act(async () => {
        response = await result.current.handleToolCall(makeCall('nonExistentTool', {}));
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown tool');
    });
  });
});
