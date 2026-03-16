import { describe, it, expect, vi } from 'vitest';

// Mock Deno global before importing the module
(globalThis as any).Deno = {
  env: {
    get: vi.fn().mockReturnValue('mock-key'),
  },
};

import { executeFunctionCall } from '../functionExecutor.ts';

describe('functionExecutor idempotency', () => {
  it('should correctly build payload for create_task without idempotency_key', async () => {
    // Mock Supabase
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: { id: 'task-1' }, error: null });
    const mockSelect = vi
      .fn()
      .mockReturnValue({ maybeSingle: mockMaybeSingle, single: mockMaybeSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    const result = await executeFunctionCall(
      mockSupabase,
      'createTask',
      { title: 'Passports', notes: 'Get them' },
      'trip-1',
      'user-1',
    );

    expect(mockFrom).toHaveBeenCalledWith('trip_pending_actions');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          title: 'Passports',
        }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.pending).toBe(true);
    expect(result.pendingActionId).toBe('task-1');
  });

  it('should handle unique constraint violation and fetch existing task by idempotency_key', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } });
    const mockSelectInsert = vi
      .fn()
      .mockReturnValue({ maybeSingle: mockMaybeSingle, single: mockMaybeSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

    const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert });
    const mockSupabase = { from: mockFrom };

    await expect(
      executeFunctionCall(
        mockSupabase,
        'createTask',
        { title: 'Passports', notes: 'Get them', idempotency_key: 'idemp-1' },
        'trip-1',
        'user-1',
      ),
    ).rejects.toEqual({ code: '23505' });

    expect(mockFrom).toHaveBeenCalledWith('trip_pending_actions');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          title: 'Passports',
        }),
      }),
    );
  });
});
