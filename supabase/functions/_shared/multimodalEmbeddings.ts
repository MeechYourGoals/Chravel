/**
 * Multimodal Embedding Provider — Gemini Embedding 2
 *
 * Supports text, image, and PDF inputs in a single 1536-dim embedding space.
 * Falls back to text-only embedding for unsupported modalities.
 *
 * Limits (Gemini Embedding 2 Preview):
 *   text: up to 8,192 tokens
 *   image: up to 6 images/request
 *   audio: up to 80 seconds (not yet enabled)
 *   video: up to 128 seconds (not yet enabled)
 *   PDF: up to 6 pages/request
 */

import { validateExternalHttpsUrl } from './validation.ts';

// ── Types ────────────────────────────────────────────────────────────────────

export type EmbeddingModality = 'text' | 'image' | 'pdf' | 'audio' | 'video';

export interface MultimodalEmbeddingRequest {
  /** The modality of the input content */
  modality: EmbeddingModality;
  /** For text modality: the raw text to embed */
  text?: string;
  /** For image/pdf modality: base64-encoded data */
  base64Data?: string;
  /** For image/pdf modality: the MIME type */
  mimeType?: string;
  /** For image/pdf modality: a URL to fetch content from */
  url?: string;
}

export interface MultimodalEmbeddingResponse {
  provider: string;
  model: string;
  embedding: number[];
  dimensions: number;
  modality: EmbeddingModality;
  inputTokens?: number;
}

export interface MultimodalEmbeddingBatchResponse {
  provider: string;
  model: string;
  embeddings: number[][];
  dimensions: number;
}

// ── Config ───────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = () => Deno.env.get('GEMINI_API_KEY') || '';
const DEFAULT_MODEL = () => Deno.env.get('EMBEDDING_MODEL') || 'gemini-embedding-exp-03-07';
const DEFAULT_DIMENSIONS = () => parseInt(Deno.env.get('EMBEDDING_DIMENSIONS') || '1536', 10);
const DEFAULT_TIMEOUT_MS = 45_000;

const MAX_TEXT_LENGTH = 30_000; // ~8k tokens conservative estimate
const MAX_IMAGE_BYTES = 6_000_000; // 6MB
const MAX_PDF_PAGES = 6;

// ── Helpers ──────────────────────────────────────────────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function fetchAsBase64(
  url: string,
  timeoutMs: number,
): Promise<{ base64: string; mimeType: string } | null> {
  if (!validateExternalHttpsUrl(url)) {
    console.warn('[multimodal-embed] Blocked non-external URL:', url);
    return null;
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': 'Chravel-Embeddings/1.0' },
  });

  if (!response.ok) {
    console.warn(`[multimodal-embed] Fetch failed: ${response.status}`);
    return null;
  }

  const contentType = (response.headers.get('content-type') || 'application/octet-stream')
    .split(';')[0]
    .trim();
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    console.warn(`[multimodal-embed] Content too large: ${bytes.byteLength} bytes`);
    return null;
  }

  return { base64: bytesToBase64(bytes), mimeType: contentType };
}

// ── Core Embedding Functions ─────────────────────────────────────────────────

/**
 * Embed a single text input using Gemini Embedding 2.
 */
export async function embedText(
  text: string,
  options?: { model?: string; dimensions?: number; timeoutMs?: number },
): Promise<MultimodalEmbeddingResponse> {
  const apiKey = GEMINI_API_KEY();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = options?.model || DEFAULT_MODEL();
  const dimensions = options?.dimensions || DEFAULT_DIMENSIONS();
  const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;

  if (text.length > MAX_TEXT_LENGTH) {
    console.warn(`[multimodal-embed] Text truncated from ${text.length} to ${MAX_TEXT_LENGTH}`);
    text = text.substring(0, MAX_TEXT_LENGTH);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const payload: Record<string, unknown> = {
    content: {
      parts: [{ text }],
    },
    outputDimensionality: dimensions,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Embedding 2 error ${response.status}: ${errorText.substring(0, 500)}`);
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error('Gemini Embedding 2 response missing embedding values');
  }

  return {
    provider: 'gemini',
    model,
    embedding: values,
    dimensions: values.length,
    modality: 'text',
  };
}

/**
 * Embed an image using Gemini Embedding 2 multimodal.
 */
export async function embedImage(
  input: { base64Data?: string; mimeType?: string; url?: string },
  options?: { model?: string; dimensions?: number; timeoutMs?: number },
): Promise<MultimodalEmbeddingResponse> {
  const apiKey = GEMINI_API_KEY();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = options?.model || DEFAULT_MODEL();
  const dimensions = options?.dimensions || DEFAULT_DIMENSIONS();
  const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;

  let base64Data = input.base64Data;
  let mimeType = input.mimeType || 'image/jpeg';

  // Fetch from URL if no base64 provided
  if (!base64Data && input.url) {
    const fetched = await fetchAsBase64(input.url, timeoutMs);
    if (!fetched) {
      throw new Error('Failed to fetch image for embedding');
    }
    base64Data = fetched.base64;
    mimeType = fetched.mimeType;
  }

  if (!base64Data) {
    throw new Error('No image data provided for embedding');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const payload: Record<string, unknown> = {
    content: {
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
      ],
    },
    outputDimensionality: dimensions,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini Embedding 2 image error ${response.status}: ${errorText.substring(0, 500)}`,
    );
  }

  const data = await response.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) {
    throw new Error('Gemini Embedding 2 image response missing embedding values');
  }

  return {
    provider: 'gemini',
    model,
    embedding: values,
    dimensions: values.length,
    modality: 'image',
  };
}

/**
 * Embed a PDF document using Gemini Embedding 2 multimodal.
 * If PDF exceeds page limit, falls back to text extraction + text embedding.
 */
export async function embedPdf(
  input: { base64Data?: string; url?: string; extractedText?: string },
  options?: { model?: string; dimensions?: number; timeoutMs?: number },
): Promise<MultimodalEmbeddingResponse> {
  const apiKey = GEMINI_API_KEY();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = options?.model || DEFAULT_MODEL();
  const dimensions = options?.dimensions || DEFAULT_DIMENSIONS();
  const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;

  let base64Data = input.base64Data;

  if (!base64Data && input.url) {
    const fetched = await fetchAsBase64(input.url, timeoutMs);
    if (!fetched) {
      // Fall back to text embedding if PDF fetch fails
      if (input.extractedText) {
        console.warn('[multimodal-embed] PDF fetch failed, falling back to text embedding');
        return embedText(input.extractedText, options);
      }
      throw new Error('Failed to fetch PDF for embedding and no extracted text available');
    }
    base64Data = fetched.base64;
  }

  if (!base64Data) {
    if (input.extractedText) {
      return embedText(input.extractedText, options);
    }
    throw new Error('No PDF data or text provided for embedding');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

  const payload: Record<string, unknown> = {
    content: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        },
      ],
    },
    outputDimensionality: dimensions,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // If PDF too large, fall back to text embedding
      if (response.status === 400 && input.extractedText) {
        console.warn('[multimodal-embed] PDF embedding rejected, falling back to text');
        return embedText(input.extractedText, options);
      }
      throw new Error(
        `Gemini Embedding 2 PDF error ${response.status}: ${errorText.substring(0, 500)}`,
      );
    }

    const data = await response.json();
    const values = data?.embedding?.values;
    if (!Array.isArray(values)) {
      throw new Error('Gemini Embedding 2 PDF response missing embedding values');
    }

    return {
      provider: 'gemini',
      model,
      embedding: values,
      dimensions: values.length,
      modality: 'pdf',
    };
  } catch (error) {
    // Final fallback: use extracted text if available
    if (input.extractedText) {
      console.warn('[multimodal-embed] PDF embedding failed, text fallback:', error);
      return embedText(input.extractedText, options);
    }
    throw error;
  }
}

/**
 * Batch embed multiple text inputs.
 * Uses concurrent requests (up to 8 at a time) for throughput.
 */
export async function batchEmbedText(
  texts: string[],
  options?: { model?: string; dimensions?: number; timeoutMs?: number },
): Promise<MultimodalEmbeddingBatchResponse> {
  const model = options?.model || DEFAULT_MODEL();
  const dimensions = options?.dimensions || DEFAULT_DIMENSIONS();
  const concurrency = 8;
  const embeddings: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += concurrency) {
    const batch = texts.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map(text => embedText(text, { model, dimensions, timeoutMs: options?.timeoutMs })),
    );
    results.forEach((result, idx) => {
      embeddings[i + idx] = result.embedding;
    });
  }

  return {
    provider: 'gemini',
    model,
    embeddings,
    dimensions,
  };
}

/**
 * Embed content based on detected modality. Auto-selects the right method.
 */
export async function embedByModality(
  request: MultimodalEmbeddingRequest,
  options?: { model?: string; dimensions?: number; timeoutMs?: number },
): Promise<MultimodalEmbeddingResponse> {
  switch (request.modality) {
    case 'text':
      if (!request.text) throw new Error('Text content required for text modality');
      return embedText(request.text, options);

    case 'image':
      return embedImage(
        {
          base64Data: request.base64Data,
          mimeType: request.mimeType,
          url: request.url,
        },
        options,
      );

    case 'pdf':
      return embedPdf(
        {
          base64Data: request.base64Data,
          url: request.url,
          extractedText: request.text,
        },
        options,
      );

    case 'audio':
    case 'video':
      // Scaffold: not yet enabled in production
      if (request.text) {
        console.warn(
          `[multimodal-embed] ${request.modality} not yet supported, using text fallback`,
        );
        return embedText(request.text, options);
      }
      throw new Error(`${request.modality} embedding not yet supported`);

    default:
      throw new Error(`Unknown modality: ${request.modality}`);
  }
}

// ── Utility ──────────────────────────────────────────────────────────────────

export function detectModality(mimeType: string | null | undefined): EmbeddingModality {
  if (!mimeType) return 'text';
  const lower = mimeType.toLowerCase();
  if (lower.startsWith('image/')) return 'image';
  if (lower === 'application/pdf') return 'pdf';
  if (lower.startsWith('audio/')) return 'audio';
  if (lower.startsWith('video/')) return 'video';
  return 'text';
}

export { MAX_TEXT_LENGTH, MAX_IMAGE_BYTES, MAX_PDF_PAGES };
