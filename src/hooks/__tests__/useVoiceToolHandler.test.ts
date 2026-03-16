import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceToolHandler } from '../useVoiceToolHandler';

const mocks = vi.hoisted(() => {
  const insert = vi.fn();
  const select = vi.fn();
  const single = vi.fn();
  const eq = vi.fn();
  const order = vi.fn();
  const limit = vi.fn();
  const invoke = vi.fn();

  return { insert, select, single, eq, order, limit, invoke };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mocks.insert,
      select: mocks.select,
      eq: mocks.eq,
      order: mocks.order,
      limit: mocks.limit,
    })),
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

describe('useVoiceToolHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.select.mockReturnValue({
      single: mocks.single,
      eq: mocks.eq,
      order: mocks.order,
      limit: mocks.limit,
    });
    mocks.single.mockResolvedValue({
      data: { id: 'row-1', title: 'Task A', question: 'Q' },
      error: null,
    });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.eq.mockReturnValue({ order: mocks.order, limit: mocks.limit, eq: mocks.eq });
    mocks.order.mockReturnValue({ limit: mocks.limit });
    mocks.limit.mockResolvedValue({ data: [], error: null });
    mocks.invoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('routes mutation tools through execute-concierge-tool', async () => {
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
      body: { toolName: 'createTask', args: { title: 'Buy snacks' }, tripId: 'trip-1' },
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
      body: { toolName: 'searchPlaces', args: { query: 'coffee near me' }, tripId: 'trip-1' },
    });
  });

  it('returns error for invalid createPoll payload', async () => {
    const { result } = renderHook(() =>
      useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
    );

    const response = await result.current.handleToolCall({
      id: '3',
      name: 'createPoll',
      args: { question: 'Dinner?', options: ['Only one'] },
    });

    expect(response.success).toBe(true);
    expect(mocks.invoke).toHaveBeenCalledWith('execute-concierge-tool', {
      body: {
        toolName: 'createPoll',
        args: { question: 'Dinner?', options: ['Only one'] },
        tripId: 'trip-1',
      },
    });
  });

  it('parses stringified tool arguments before invoking the edge function', async () => {
    const { result } = renderHook(() =>
      useVoiceToolHandler({ tripId: 'trip-1', userId: 'user-1' }),
    );

    const response = await result.current.handleToolCall({
      id: '4',
      name: 'searchPlaces',
      args: '{"query":"coffee near me"}',
    });

    expect(response.success).toBe(true);
    expect(mocks.invoke).toHaveBeenCalledWith('execute-concierge-tool', {
      body: { toolName: 'searchPlaces', args: { query: 'coffee near me' }, tripId: 'trip-1' },
    });
  });
});
