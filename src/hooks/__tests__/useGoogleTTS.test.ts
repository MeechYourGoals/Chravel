import { renderHook, act } from '@testing-library/react';
import { useGoogleTTS } from '../useGoogleTTS';
import { supabase } from '@/integrations/supabase/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
  SUPABASE_PROJECT_URL: 'http://localhost',
  SUPABASE_PUBLIC_ANON_KEY: 'anon-key',
}));

describe('useGoogleTTS', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock HTMLAudioElement
    global.Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      load: vi.fn(),
      removeAttribute: vi.fn(),
      onended: null,
      onerror: null,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useGoogleTTS());
    expect(result.current.playbackState).toBe('idle');
    expect(result.current.playingMessageId).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it('handles missing auth token', async () => {
    (supabase.auth.getSession as any).mockResolvedValueOnce({
      data: { session: null },
    });

    const { result } = renderHook(() => useGoogleTTS());

    await act(async () => {
      await result.current.play('msg-1', 'Hello world');
    });

    expect(result.current.playbackState).toBe('error');
    expect(result.current.errorMessage).toBe('Not authenticated. Please sign in to use voice.');
  });
});
