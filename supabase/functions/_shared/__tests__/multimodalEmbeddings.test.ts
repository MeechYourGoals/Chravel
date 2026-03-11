import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Deno global
(globalThis as any).Deno = {
  env: {
    get: vi.fn((key: string) => {
      const envMap: Record<string, string> = {
        GEMINI_API_KEY: 'test-api-key',
        EMBEDDING_MODEL: 'gemini-embedding-exp-03-07',
        EMBEDDING_DIMENSIONS: '1536',
      };
      return envMap[key] || '';
    }),
  },
};

// Mock fetch globally
const mockFetch = vi.fn();
(globalThis as any).fetch = mockFetch;

// Mock the validation module
vi.mock('../validation.ts', () => ({
  validateExternalHttpsUrl: vi.fn().mockReturnValue(true),
}));

import {
  detectModality,
  MAX_TEXT_LENGTH,
  MAX_IMAGE_BYTES,
  MAX_PDF_PAGES,
} from '../multimodalEmbeddings.ts';

describe('detectModality', () => {
  it('returns "text" for null/undefined mime types', () => {
    expect(detectModality(null)).toBe('text');
    expect(detectModality(undefined)).toBe('text');
    expect(detectModality('')).toBe('text');
  });

  it('returns "image" for image mime types', () => {
    expect(detectModality('image/jpeg')).toBe('image');
    expect(detectModality('image/png')).toBe('image');
    expect(detectModality('image/gif')).toBe('image');
    expect(detectModality('image/webp')).toBe('image');
    expect(detectModality('Image/PNG')).toBe('image');
  });

  it('returns "pdf" for PDF mime type', () => {
    expect(detectModality('application/pdf')).toBe('pdf');
    expect(detectModality('Application/PDF')).toBe('pdf');
  });

  it('returns "audio" for audio mime types', () => {
    expect(detectModality('audio/mpeg')).toBe('audio');
    expect(detectModality('audio/wav')).toBe('audio');
  });

  it('returns "video" for video mime types', () => {
    expect(detectModality('video/mp4')).toBe('video');
    expect(detectModality('video/webm')).toBe('video');
  });

  it('returns "text" for unknown mime types', () => {
    expect(detectModality('application/json')).toBe('text');
    expect(detectModality('text/plain')).toBe('text');
    expect(detectModality('application/zip')).toBe('text');
  });
});

describe('Constants', () => {
  it('has correct text length limit', () => {
    expect(MAX_TEXT_LENGTH).toBe(30_000);
  });

  it('has correct image size limit', () => {
    expect(MAX_IMAGE_BYTES).toBe(6_000_000);
  });

  it('has correct PDF page limit', () => {
    expect(MAX_PDF_PAGES).toBe(6);
  });
});

describe('embedText', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('calls Gemini API with correct payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          embedding: {
            values: new Array(1536).fill(0.1),
          },
        }),
    });

    const { embedText } = await import('../multimodalEmbeddings.ts');
    const result = await embedText('test text');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('gemini-embedding-exp-03-07');
    expect(url).toContain('embedContent');

    const body = JSON.parse(options.body);
    expect(body.content.parts[0].text).toBe('test text');
    expect(body.outputDimensionality).toBe(1536);

    expect(result.provider).toBe('gemini');
    expect(result.modality).toBe('text');
    expect(result.embedding).toHaveLength(1536);
    expect(result.dimensions).toBe(1536);
  });

  it('throws when API key is missing', async () => {
    const originalGet = (globalThis as any).Deno.env.get;
    (globalThis as any).Deno.env.get = vi.fn().mockReturnValue('');

    // Force re-import to get new env
    vi.resetModules();
    const mod = await import('../multimodalEmbeddings.ts');

    await expect(mod.embedText('test')).rejects.toThrow('GEMINI_API_KEY not configured');

    (globalThis as any).Deno.env.get = originalGet;
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
    });

    const { embedText } = await import('../multimodalEmbeddings.ts');
    await expect(embedText('test')).rejects.toThrow('Gemini Embedding 2 error 400');
  });
});

describe('embedImage', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('sends inline data for base64 input', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          embedding: { values: new Array(1536).fill(0.2) },
        }),
    });

    const { embedImage } = await import('../multimodalEmbeddings.ts');
    const result = await embedImage({
      base64Data: 'dGVzdA==',
      mimeType: 'image/jpeg',
    });

    expect(result.modality).toBe('image');
    expect(result.embedding).toHaveLength(1536);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.content.parts[0].inlineData.mimeType).toBe('image/jpeg');
    expect(body.content.parts[0].inlineData.data).toBe('dGVzdA==');
  });

  it('throws when no data is provided', async () => {
    const { embedImage } = await import('../multimodalEmbeddings.ts');
    await expect(embedImage({})).rejects.toThrow('No image data provided');
  });
});

describe('embedByModality', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('routes text modality to embedText', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          embedding: { values: new Array(1536).fill(0.3) },
        }),
    });

    const { embedByModality } = await import('../multimodalEmbeddings.ts');
    const result = await embedByModality({ modality: 'text', text: 'hello' });

    expect(result.modality).toBe('text');
  });

  it('throws for audio without text fallback', async () => {
    const { embedByModality } = await import('../multimodalEmbeddings.ts');
    await expect(embedByModality({ modality: 'audio' })).rejects.toThrow('not yet supported');
  });

  it('falls back to text for audio with text provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          embedding: { values: new Array(1536).fill(0.4) },
        }),
    });

    const { embedByModality } = await import('../multimodalEmbeddings.ts');
    const result = await embedByModality({ modality: 'audio', text: 'fallback text' });

    expect(result.modality).toBe('text');
  });
});
