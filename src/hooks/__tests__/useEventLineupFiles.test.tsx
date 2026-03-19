/// <reference types="vitest/globals" />

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventLineupFiles } from '@/hooks/useEventLineupFiles';

const mockList = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (...args: unknown[]) => mockFrom(...args),
    },
  },
}));

vi.mock('@/utils/timeout', () => ({
  withTimeout: async <T,>(promise: Promise<T>) => promise,
}));

describe('useEventLineupFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFrom.mockReturnValue({
      list: (...args: unknown[]) => mockList(...args),
      getPublicUrl: (...args: unknown[]) => mockGetPublicUrl(...args),
      createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args),
      upload: (...args: unknown[]) => mockUpload(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
    });
  });

  it('uses signed URLs for lineup files when available', async () => {
    mockList.mockResolvedValue({
      data: [
        {
          id: 'file-1',
          name: 'abc123--Roster.pdf',
          created_at: '2026-03-19T00:00:00.000Z',
          metadata: { mimetype: 'application/pdf', size: 1024 },
        },
      ],
      error: null,
    });

    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/roster.pdf?token=abc' },
      error: null,
    });

    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://public.example/roster.pdf' },
    });

    const { result } = renderHook(() => useEventLineupFiles({ eventId: 'trip-1' }));

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      'trip-1/lineup-files/abc123--Roster.pdf',
      3600,
    );
    expect(result.current.files[0]?.publicUrl).toBe('https://signed.example/roster.pdf?token=abc');
  });
});
