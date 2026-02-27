
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { linkPreviewService } from '../services/linkPreviewService';
import { supabase } from '../integrations/supabase/client';

// Mock Supabase
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      upsert: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('linkPreviewService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    linkPreviewService.clearCache();
  });

  it('should return memory cached preview if available', async () => {
    const url = 'https://example.com';
    const mockPreview = {
      url,
      title: 'Example',
      status: 'ok' as const,
    };

    // Manually prime the cache (since it's private, we simulate a successful fetch first)
    // OR we just assume the first call works and second call uses cache.

    // Let's mock the edge function for the first call
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { url, title: 'Example', status: 'ok' },
      error: null,
    });

    // Mock DB miss
    (supabase.from as any).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    }));

    // First call
    await linkPreviewService.getLinkPreview(url);

    // Second call should NOT invoke edge function
    await linkPreviewService.getLinkPreview(url);

    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });

  it('should check DB cache before edge function', async () => {
    const url = 'https://cached.com';
    const dbPreview = {
      url,
      title: 'Cached Title',
      status: 'ok',
      expires_at: new Date(Date.now() + 10000).toISOString(),
    };

    // Mock DB response
    (supabase.from as any).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: dbPreview, error: null }),
        }),
      }),
    }));

    const result = await linkPreviewService.getLinkPreview(url);

    expect(result.title).toBe('Cached Title');
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('should call edge function if DB cache miss', async () => {
    const url = 'https://new.com';

    // Mock DB miss
    (supabase.from as any).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null, error: { message: 'Not found' } }),
        }),
      }),
    }));

    // Mock Edge success
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { url, title: 'New Title', status: 'ok' },
      error: null,
    });

    const result = await linkPreviewService.getLinkPreview(url);

    expect(result.title).toBe('New Title');
    expect(supabase.functions.invoke).toHaveBeenCalled();
  });

  it('should handle pending concurrent requests', async () => {
    const url = 'https://concurrent.com';

    // Slow down the first request
    (supabase.from as any).mockImplementation(() => ({
        select: () => ({
          eq: () => ({
            single: async () => {
                await new Promise(r => setTimeout(r, 50));
                return { data: null, error: { message: 'Not found' } };
            },
          }),
        }),
    }));

    (supabase.functions.invoke as any).mockResolvedValue({
      data: { url, title: 'Concurrent', status: 'ok' },
      error: null,
    });

    // Fire two requests at once
    const p1 = linkPreviewService.getLinkPreview(url);
    const p2 = linkPreviewService.getLinkPreview(url);

    await Promise.all([p1, p2]);

    // Should only call fetch/invoke once
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
  });
});
