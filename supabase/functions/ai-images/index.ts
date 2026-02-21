/**
 * AI Images - Server-side image search for AI Concierge inline images
 *
 * Returns publicly accessible image URLs from Google Custom Search (Image Search).
 * Feature-flagged via AI_IMAGES_ENABLED. When disabled, returns empty array.
 *
 * NON-NEGOTIABLE: Does not affect the main concierge text flow.
 * Called optionally by the client AFTER text response is shown.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const GOOGLE_CUSTOM_SEARCH_API_KEY = Deno.env.get('GOOGLE_CUSTOM_SEARCH_API_KEY');
const GOOGLE_CUSTOM_SEARCH_ENGINE_ID = Deno.env.get('GOOGLE_CUSTOM_SEARCH_ENGINE_ID');
const AI_IMAGES_ENABLED = (Deno.env.get('AI_IMAGES_ENABLED') || 'false').toLowerCase() === 'true';

interface ImageSearchItem {
  thumbnailUrl: string;
  imageUrl: string;
  title: string;
  sourceUrl: string;
  sourceDomain: string;
}

interface AiImagesRequest {
  query: string;
  locale?: string;
  count?: number;
}

interface GoogleCustomSearchImageItem {
  link?: string;
  title?: string;
  displayLink?: string;
  image?: { thumbnailLink?: string; width?: number; height?: number };
}

const MIN_QUERY_LENGTH = 3;
const MAX_QUERY_LENGTH = 200;
const DEFAULT_COUNT = 6;
const MIN_IMAGE_DIMENSION = 80; // Filter out tiny/invalid thumbnails

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
}

function normalizeImageItem(item: GoogleCustomSearchImageItem): ImageSearchItem | null {
  const link = item.link;
  const thumbnailLink = item.image?.thumbnailLink;
  if (!link || !thumbnailLink) return null;

  const width = item.image?.width ?? 0;
  const height = item.image?.height ?? 0;
  if (width > 0 && height > 0 && (width < MIN_IMAGE_DIMENSION || height < MIN_IMAGE_DIMENSION)) {
    return null;
  }

  return {
    thumbnailUrl: thumbnailLink,
    imageUrl: link,
    title: item.title || 'Image',
    sourceUrl: link,
    sourceDomain: extractDomain(item.displayLink || link),
  };
}

serve(async req => {
  const { createOptionsResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const emptyResponse = () =>
    new Response(JSON.stringify({ images: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  if (!AI_IMAGES_ENABLED) {
    return emptyResponse();
  }

  if (!GOOGLE_CUSTOM_SEARCH_API_KEY || !GOOGLE_CUSTOM_SEARCH_ENGINE_ID) {
    console.warn(
      '[ai-images] Missing GOOGLE_CUSTOM_SEARCH_API_KEY or GOOGLE_CUSTOM_SEARCH_ENGINE_ID',
    );
    return emptyResponse();
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required', images: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication', images: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const body = (await req.json()) as AiImagesRequest;
    const query = (body.query || '').trim();
    const count = Math.min(Math.max(body.count ?? DEFAULT_COUNT, 1), 10);

    if (query.length < MIN_QUERY_LENGTH) {
      return emptyResponse();
    }
    if (query.length > MAX_QUERY_LENGTH) {
      return emptyResponse();
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_CUSTOM_SEARCH_API_KEY}&cx=${GOOGLE_CUSTOM_SEARCH_ENGINE_ID}&q=${encodedQuery}&searchType=image&safe=active&num=${count}`;

    const searchResponse = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!searchResponse.ok) {
      const errText = await searchResponse.text();
      console.error('[ai-images] Google Custom Search error:', searchResponse.status, errText);
      return emptyResponse();
    }

    const data = (await searchResponse.json()) as {
      items?: GoogleCustomSearchImageItem[];
      error?: { message?: string };
    };

    if (data.error) {
      console.error('[ai-images] API error:', data.error.message);
      return emptyResponse();
    }

    const items = data.items || [];
    const images: ImageSearchItem[] = items
      .map(normalizeImageItem)
      .filter((x): x is ImageSearchItem => x !== null);

    // Deduplicate by imageUrl
    const seen = new Set<string>();
    const deduped = images.filter(img => {
      if (seen.has(img.imageUrl)) return false;
      seen.add(img.imageUrl);
      return true;
    });

    const requestId = crypto.randomUUID?.() || `req-${Date.now()}`;
    console.log(
      `[ai-images] requestId=${requestId} query="${query.substring(0, 50)}" provider=google_cse count=${deduped.length}`,
    );

    return new Response(JSON.stringify({ images: deduped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('[ai-images] Unexpected error:', err);
    return emptyResponse();
  }
});
