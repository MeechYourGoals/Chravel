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

class MockAudio {
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  pause = vi.fn();
  removeAttribute = vi.fn();
  load = vi.fn();
  play = vi.fn().mockResolvedValue(undefined);

  constructor(public src: string) {}
}

describe('useElevenLabsTTS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });

    global.fetch = vi.fn();
    global.Audio = MockAudio as unknown as typeof Audio;
    global.URL.createObjectURL = vi.fn(() => 'blob:voice-test');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('enters error state when voice endpoint returns non-audio content type', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useElevenLabsTTS());

    await act(async () => {
      await result.current.play('msg-1', 'Test speech');
    });

    await waitFor(() => {
      expect(result.current.playbackState).toBe('error');
      expect(result.current.errorMessage).toContain('unexpected response format');
    });
  });

  it('clears stale error state when stop is called', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate limited' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useElevenLabsTTS());

    await act(async () => {
      await result.current.play('msg-2', 'Speak this');
    });

    await waitFor(() => {
      expect(result.current.playbackState).toBe('error');
      expect(result.current.errorMessage).toBeTruthy();
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.playbackState).toBe('idle');
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.playingMessageId).toBeNull();
  });
});
