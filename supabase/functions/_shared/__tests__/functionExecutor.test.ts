import { describe, it, expect, vi } from 'vitest';

// Mock Deno global before importing the module
(globalThis as any).Deno = {
  env: {
    get: vi.fn().mockReturnValue('mock-key'),
  },
  resolveDns: vi.fn(),
};

import { executeFunctionCall } from '../functionExecutor.ts';

describe('functionExecutor idempotency', () => {
  it('should reject browseWebsite requests to private IPs before fetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.mocked((globalThis as any).Deno.resolveDns).mockReset();

    const result = await executeFunctionCall(
      {},
      'browseWebsite',
      { url: 'https://169.254.169.254/latest/meta-data/' },
      'trip-1',
      'user-1',
    );

    expect(result).toEqual({ error: 'URL must be a public HTTPS URL' });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('should reject browseWebsite requests when DNS resolves to a private IP', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.mocked((globalThis as any).Deno.resolveDns).mockImplementation(
      async (_hostname: string, recordType: string) =>
        recordType === 'A' ? ['169.254.169.254'] : ([] as string[]),
    );

    const result = await executeFunctionCall(
      {},
      'browseWebsite',
      { url: 'https://travel.example.com/menu' },
      'trip-1',
      'user-1',
    );

    expect(result).toEqual({ error: 'URL must be a public HTTPS URL' });
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

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
        trip_id: 'trip-1',
        user_id: 'user-1',
        tool_name: 'createTask',
        source_type: 'ai_concierge',
        payload: expect.objectContaining({
          title: 'Passports',
          description: 'Get them',
          creator_id: 'user-1',
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
        tool_name: 'createTask',
        trip_id: 'trip-1',
        payload: expect.objectContaining({
          title: 'Passports',
        }),
      }),
    );
  });
});
