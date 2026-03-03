import { describe, it, expect, vi } from 'vitest';

// Mock Deno global before importing the module
(globalThis as any).Deno = {
  env: {
    get: vi.fn().mockReturnValue('mock-key'),
  },
};

import { executeFunctionCall } from '../functionExecutor.ts';

describe('functionExecutor idempotency', () => {
  it('should correctly build payload with idempotency_key for create_task', async () => {
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
      { title: 'Passports', notes: 'Get them', idempotency_key: 'idemp-1' },
      'trip-1',
      'user-1',
    );

    expect(mockFrom).toHaveBeenCalledWith('trip_tasks');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Passports',
        idempotency_key: 'idemp-1',
      }),
    );
    expect(result.success).toBe(true);
    expect(result.task).toEqual({ id: 'task-1' });
  });

  it('should handle unique constraint violation and fetch existing task by idempotency_key', async () => {
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'task-1-existing' }, error: null });
    const mockEqIdemp = vi.fn().mockReturnValue({ single: mockSingle });
    const mockEqTrip = vi.fn().mockReturnValue({ eq: mockEqIdemp });
    const mockSelectLookup = vi.fn().mockReturnValue({ eq: mockEqTrip });

    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } });
    const mockSelectInsert = vi
      .fn()
      .mockReturnValue({ maybeSingle: mockMaybeSingle, single: mockMaybeSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelectInsert });

    let isLookup = false;
    const mockFrom = vi.fn().mockImplementation(table => {
      if (table === 'trip_tasks') {
        if (isLookup) {
          return { select: mockSelectLookup };
        }
        isLookup = true; // next call is lookup
        return { insert: mockInsert, select: mockSelectLookup };
      }
      return {};
    });
    const mockSupabase = { from: mockFrom };

    const result = await executeFunctionCall(
      mockSupabase,
      'createTask',
      { title: 'Passports', notes: 'Get them', idempotency_key: 'idemp-1' },
      'trip-1',
      'user-1',
    );

    expect(mockFrom).toHaveBeenCalledWith('trip_tasks');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Passports',
        idempotency_key: 'idemp-1',
      }),
    );
    expect(result.success).toBe(true);
    expect(result.task).toEqual({ id: 'task-1-existing' });
  });
});
