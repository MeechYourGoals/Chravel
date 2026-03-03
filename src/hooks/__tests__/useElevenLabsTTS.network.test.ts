import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useElevenLabsTTS } from '../useElevenLabsTTS';

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

describe('useElevenLabsTTS network failure mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });

    global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  });

  it('maps failed fetch errors to actionable connectivity guidance and retries once', async () => {
    const { result } = renderHook(() => useElevenLabsTTS());

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
