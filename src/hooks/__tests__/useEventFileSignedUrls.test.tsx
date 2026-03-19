import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEventLineupFiles } from '../useEventLineupFiles';
import { useEventAgendaFiles } from '../useEventAgendaFiles';

const storageMocks = vi.hoisted(() => ({
  from: vi.fn(),
  list: vi.fn(),
  createSignedUrl: vi.fn(),
  getPublicUrl: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: storageMocks.from,
    },
  },
}));

describe('event file hooks signed URL behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    storageMocks.from.mockReturnValue({
      list: storageMocks.list,
      createSignedUrl: storageMocks.createSignedUrl,
      getPublicUrl: storageMocks.getPublicUrl,
      upload: storageMocks.upload,
      remove: storageMocks.remove,
    });

    storageMocks.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/object' },
      error: null,
    });

    storageMocks.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://public.example/object' },
    });
  });

  it('uses signed URLs for lineup files', async () => {
    storageMocks.list.mockResolvedValue({
      data: [
        {
          id: 'lineup-1',
          name: 'lineup.pdf',
          metadata: { mimetype: 'application/pdf', size: 1200 },
          created_at: '2026-03-19T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useEventLineupFiles({ eventId: 'event-123' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(storageMocks.createSignedUrl).toHaveBeenCalledWith(
      'event-123/lineup-files/lineup.pdf',
      expect.any(Number),
    );
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].publicUrl).toBe('https://signed.example/object');
  });

  it('uses signed URLs for agenda files', async () => {
    storageMocks.list.mockResolvedValue({
      data: [
        {
          id: 'agenda-1',
          name: 'agenda.jpg',
          metadata: { mimetype: 'image/jpeg', size: 2400 },
          created_at: '2026-03-19T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useEventAgendaFiles({ eventId: 'event-456' }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(storageMocks.createSignedUrl).toHaveBeenCalledWith(
      'event-456/agenda-files/agenda.jpg',
      expect.any(Number),
    );
    expect(result.current.files).toHaveLength(1);
    expect(result.current.files[0].publicUrl).toBe('https://signed.example/object');
  });
});
