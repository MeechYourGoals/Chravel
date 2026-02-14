import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseLineupText, parseLineupURL } from '@/utils/lineupImportParsers';
import { supabase } from '@/integrations/supabase/client';

// Use `as any` for mock return values to bypass strict FunctionsResponse typing

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('lineupImportParsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes, deduplicates and sorts extracted names from URL', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: {
        success: true,
        names: ['  Zedd ', 'amy Poehler', 'zedd', 'Ali Wong'],
        names_found: 4,
      },
      error: null,
    } as any);

    const result = await parseLineupURL('https://example.com/lineup');

    expect(supabase.functions.invoke).toHaveBeenCalledWith('scrape-lineup', {
      body: { url: 'https://example.com/lineup' },
    });
    expect(result.isValid).toBe(true);
    expect(result.names).toEqual(['Ali Wong', 'amy Poehler', 'Zedd']);
    expect(result.sourceFormat).toBe('url');
  });

  it('returns extraction failure when function reports no names', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false, error: 'No lineup names found' },
      error: null,
    } as any);

    const result = await parseLineupText('some pasted content');

    expect(result.isValid).toBe(false);
    expect(result.names).toEqual([]);
    expect(result.errors[0]).toContain('No lineup names found');
    expect(result.sourceFormat).toBe('text');
  });

  it('returns invoke error details when edge function fails', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Network timeout' },
    } as any);

    const result = await parseLineupURL('https://example.com');

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Network timeout');
  });
});
