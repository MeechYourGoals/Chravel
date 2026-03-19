import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useEventLineupFiles } from '../useEventLineupFiles';

const { mockList, mockCreateSignedUrl, mockGetPublicUrl, mockStorageFrom, mockWithTimeout } =
  vi.hoisted(() => ({
    mockList: vi.fn(),
    mockCreateSignedUrl: vi.fn(),
    mockGetPublicUrl: vi.fn(),
    mockStorageFrom: vi.fn(),
    mockWithTimeout: vi.fn((promise: Promise<unknown>) => promise),
  }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: mockStorageFrom,
    },
  },
}));

vi.mock('@/utils/timeout', () => ({
  withTimeout: mockWithTimeout,
}));

describe('useEventLineupFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockList.mockResolvedValue({
      data: [
        {
          id: 'file-1',
          name: 'uuid-1--Rob_Manfred.jpg',
          metadata: { mimetype: 'image/jpeg', size: 15000 },
          created_at: '2026-03-19T00:00:00.000Z',
        },
      ],
      error: null,
    });

    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'https://public.example.com/storage/v1/object/public/trip-media/file.jpg',
      },
    });

    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example.com/storage/v1/object/sign/trip-media/file.jpg' },
      error: null,
    });

    mockStorageFrom.mockReturnValue({
      list: mockList,
      getPublicUrl: mockGetPublicUrl,
      createSignedUrl: mockCreateSignedUrl,
      upload: vi.fn(),
      remove: vi.fn(),
    });
  });

  it('uses signed URLs for lineup previews when trip-media is secured', async () => {
    const { result } = renderHook(() => useEventLineupFiles({ eventId: 'event-123' }));

    await waitFor(() => {
      expect(result.current.files).toHaveLength(1);
    });

    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      'event-123/lineup-files/uuid-1--Rob_Manfred.jpg',
      60 * 30,
    );
    expect(result.current.files[0]?.publicUrl).toBe(
      'https://signed.example.com/storage/v1/object/sign/trip-media/file.jpg',
    );
  });
});
