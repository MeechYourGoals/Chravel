/**
 * Scrape Line-up Edge Function
 *
 * Reuses the same URL extraction pipeline as schedule/agenda smart import:
 * URL -> Firecrawl (JS-rendered markdown) fallback fetch() -> Gemini -> strict JSON names array.
 * Also supports plain text extraction for "Paste text instead" fallback.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateExternalHttpsUrl } from '../_shared/validation.ts';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const MAX_CONTENT_LENGTH = 1_000_000;

interface LineupExtractionResponse {
  names: string[];
}

async function scrapeWithFirecrawl(
  url: string,
): Promise<{ content: string; method: 'firecrawl' } | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const markdown = data?.data?.markdown || data?.markdown || '';
    if (!markdown || markdown.trim().length < 50) return null;

    return { content: markdown, method: 'firecrawl' };
  } catch {
    return null;
  }
}

async function scrapeWithFetch(url: string): Promise<{ content: string; method: 'fetch' } | null> {
  try {
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!pageResponse.ok) return null;

    const html = await pageResponse.text();
    return { content: html, method: 'fetch' };
  } catch {
    return null;
  }
}

function normalizeNames(names: string[]): string[] {
  const deduped = new Map<string, string>();

  for (const value of names) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;

    const key = trimmed.toLocaleLowerCase();
    if (!deduped.has(key)) deduped.set(key, trimmed);
  }

  return Array.from(deduped.values()).sort((a, b) => a.localeCompare(b));
}

function parseStrictNamesPayload(rawContent: string): string[] | null {
  let jsonStr = rawContent.trim();
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
  jsonStr = jsonStr.trim();

  const parsed = JSON.parse(jsonStr) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const payload = parsed as Partial<LineupExtractionResponse>;
  if (!Array.isArray(payload.names)) return null;

  return normalizeNames(payload.names);
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    let url = typeof body?.url === 'string' ? body.url.trim() : '';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!url && !text) {
      return new Response(JSON.stringify({ error: 'URL or text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let contentForAI = '';
    let contentType = 'pasted text';
    let scrapeMethod: 'firecrawl' | 'fetch' | 'text' = 'text';

    if (url) {
      if (url.startsWith('http://')) url = url.replace('http://', 'https://');
      if (!url.startsWith('https://')) url = `https://${url}`;

      if (!validateExternalHttpsUrl(url)) {
        return new Response(
          JSON.stringify({
            error: 'URL must be HTTPS and external (no internal/private networks)',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const firecrawlResult = await scrapeWithFirecrawl(url);
      if (firecrawlResult) {
        contentForAI = firecrawlResult.content;
        scrapeMethod = 'firecrawl';
        contentType = 'rendered webpage content (markdown)';
      } else {
        const fetchResult = await scrapeWithFetch(url);
        if (!fetchResult) {
          return new Response(
            JSON.stringify({
              error:
                'Could not access this website. Try another URL or paste text from the lineup page.',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        contentForAI = fetchResult.content;
        scrapeMethod = 'fetch';
        contentType = 'webpage HTML';
      }
    } else {
      contentForAI = text;
    }

    if (contentForAI.length > MAX_CONTENT_LENGTH) {
      contentForAI = contentForAI.substring(0, MAX_CONTENT_LENGTH);
    }

    const systemPrompt = `You extract event lineup names only.

Return STRICT JSON with exactly this shape:
{"names": ["Name 1", "Name 2"]}

Rules:
1) Output must be a single JSON object with only one key: names.
2) names must be an array of strings.
3) Include only lineup entities (artists, comedians, speakers, performers, groups).
4) Exclude dates, times, locations, roles, bios, headings, labels, and non-person/non-group text.
5) Do not include duplicates.
6) If no names are found, return: {"names": []}`;

    const aiResult = await invokeChatModel({
      model: 'gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Extract lineup names from this ${contentType}:\n\n${contentForAI}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 16000,
      timeoutMs: 45_000,
    });

    const rawContent = extractTextFromChatResponse(aiResult.raw, aiResult.provider);

    let names: string[] | null = null;
    try {
      names = parseStrictNamesPayload(rawContent);
    } catch {
      names = null;
    }

    if (!names) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Couldn't extract names from that link—try another URL or paste text",
          names: [],
          source_url: url || null,
          scrape_method: scrapeMethod,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (names.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Couldn't extract names from that link—try another URL or paste text",
          names: [],
          source_url: url || null,
          scrape_method: scrapeMethod,
          names_found: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        names,
        names_found: names.length,
        source_url: url || null,
        scrape_method: scrapeMethod,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
    const message = isTimeout
      ? 'The request took too long to process. Try another URL or paste text instead.'
      : error instanceof Error
        ? error.message
        : 'Unknown error occurred';

    return new Response(JSON.stringify({ error: message }), {
      status: isTimeout ? 408 : 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
