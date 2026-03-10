import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConciergeTTS } from '../useConciergeTTS';

const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
  SUPABASE_PROJECT_URL: 'https://demo.supabase.co',
  SUPABASE_PUBLIC_ANON_KEY: 'anon-key',
}));

describe('useConciergeTTS network failure mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });

    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  });

  it('maps failed fetch errors to actionable connectivity guidance and retries once', async () => {
    const { result } = renderHook(() => useConciergeTTS());

    await act(async () => {
      await result.current.play('msg-network', 'Network test');
    });

    await waitFor(() => {
      expect(result.current.playbackState).toBe('error');
      expect(result.current.errorMessage).toContain('Unable to reach the voice service');
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
