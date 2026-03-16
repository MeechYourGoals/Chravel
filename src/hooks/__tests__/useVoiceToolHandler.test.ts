import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceToolHandler } from '../useVoiceToolHandler';

const mocks = vi.hoisted(() => {
  const invoke = vi.fn();

  return { invoke };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

describe('useVoiceToolHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('routes createTask through execute-concierge-tool', async () => {
    const { result } = renderHook(() =>
      useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
    );

    const response = await result.current.handleToolCall({
      id: '1',
      name: 'createTask',
      args: { title: 'Buy snacks' },
    });

    expect(response.success).toBe(true);
    expect(mocks.invoke).toHaveBeenCalledWith('execute-concierge-tool', {
      body: {
        toolName: 'createTask',
        args: { title: 'Buy snacks', idempotency_key: '1' },
        tripId: 'trip-1',
      },
    });
  });

  it('routes server-side tools through execute-concierge-tool', async () => {
    const { result } = renderHook(() =>
      useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
    );

    const response = await result.current.handleToolCall({
      id: '2',
      name: 'searchPlaces',
      args: { query: 'coffee near me' },
    });

    expect(response.success).toBe(true);
    expect(mocks.invoke).toHaveBeenCalledWith('execute-concierge-tool', {
      body: {
        toolName: 'searchPlaces',
        args: { query: 'coffee near me', idempotency_key: '2' },
        tripId: 'trip-1',
      },
    });
  });

  it('returns error for invalid createPoll payload', async () => {
    mocks.invoke.mockResolvedValue({
      data: null,
      error: { message: 'A poll requires at least 2 options' },
    });

    const { result } = renderHook(() =>
      useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
    );

    const response = await result.current.handleToolCall({
      id: '3',
      name: 'createPoll',
      args: { question: 'Dinner?', options: ['Only one'] },
    });

    expect(response.success).toBe(false);
    expect(String(response.error)).toMatch(/requires at least 2/i);
  });
});
