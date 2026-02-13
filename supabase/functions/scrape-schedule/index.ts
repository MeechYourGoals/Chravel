/**
 * Scrape Schedule Edge Function
 *
 * Uses Firecrawl (headless browser) as primary scraper for full JS rendering,
 * falls back to raw fetch() for sites that don't need JS.
 * Sends content to Gemini for structured event extraction.
 *
 * Flow: URL → Firecrawl (renders JS, returns markdown) → Gemini → structured events
 * Fallback: URL → raw fetch() → Gemini → structured events
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateExternalHttpsUrl } from '../_shared/validation.ts';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface ScheduleEvent {
  title: string;
  date: string; // YYYY-MM-DD
  start_time?: string; // HH:MM
  location?: string;
}

/** Max characters of raw HTML to send to Gemini (1M token model) */
const MAX_CONTENT_LENGTH = 1_000_000;

/**
 * Attempt to scrape a URL using Firecrawl's headless browser.
 * Returns rendered markdown content, or null if Firecrawl is not configured or fails.
 */
async function scrapeWithFirecrawl(
  url: string,
): Promise<{ markdown: string; method: 'firecrawl' } | null> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) {
    console.log('[scrape-schedule] FIRECRAWL_API_KEY not set, skipping Firecrawl');
    return null;
  }

  try {
    console.log('[scrape-schedule] Attempting Firecrawl scrape...');
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
        waitFor: 3000, // Wait 3s for JS to render
      }),
      signal: AbortSignal.timeout(20000), // 20s timeout for Firecrawl
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`[scrape-schedule] Firecrawl error ${response.status}:`, errorData);
      return null;
    }

    const data = await response.json();
    // Firecrawl v1 nests content inside data.data
    const markdown = data?.data?.markdown || data?.markdown || '';

    if (!markdown || markdown.trim().length < 50) {
      console.log('[scrape-schedule] Firecrawl returned empty/minimal content, falling back');
      return null;
    }

    console.log(`[scrape-schedule] Firecrawl success: ${markdown.length} chars of markdown`);
    return { markdown, method: 'firecrawl' };
  } catch (err) {
    console.error('[scrape-schedule] Firecrawl failed:', err);
    return null;
  }
}

/**
 * Fallback: fetch raw HTML with browser-like headers.
 */
async function scrapeWithFetch(url: string): Promise<{ html: string; method: 'fetch' } | null> {
  try {
    console.log('[scrape-schedule] Falling back to raw fetch...');
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!pageResponse.ok) {
      console.error(`[scrape-schedule] HTTP ${pageResponse.status} from ${url}`);
      return null;
    }

    const html = await pageResponse.text();
    console.log(`[scrape-schedule] Raw fetch: ${html.length} chars`);
    return { html, method: 'fetch' };
  } catch (err) {
    console.error('[scrape-schedule] Fetch error:', err);
    return null;
  }
}

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth ──
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

    // ── Parse input ──
    const body = await req.json();
    let { url } = body;

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    url = url.trim();
    if (url.startsWith('http://')) url = url.replace('http://', 'https://');
    if (!url.startsWith('https://')) url = 'https://' + url;

    // SSRF protection
    if (!validateExternalHttpsUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'URL must be HTTPS and external (no internal/private networks)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[scrape-schedule] Processing URL: ${url}`);

    // ── Scrape: Firecrawl first, then raw fetch fallback ──
    let contentForAI = '';
    let scrapeMethod = 'unknown';

    // Try Firecrawl first (headless browser with JS rendering)
    const firecrawlResult = await scrapeWithFirecrawl(url);
    if (firecrawlResult) {
      contentForAI = firecrawlResult.markdown;
      scrapeMethod = 'firecrawl';
    } else {
      // Fallback to raw fetch
      const fetchResult = await scrapeWithFetch(url);
      if (!fetchResult) {
        return new Response(
          JSON.stringify({
            error:
              'Could not access this website. The site may block automated requests. Try copying the schedule text and pasting it instead.',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      contentForAI = fetchResult.html;
      scrapeMethod = 'fetch';
    }

    // ── Cap content ──
    if (contentForAI.length > MAX_CONTENT_LENGTH) {
      console.log(
        `[scrape-schedule] Truncating from ${contentForAI.length} to ${MAX_CONTENT_LENGTH} chars`,
      );
      contentForAI = contentForAI.substring(0, MAX_CONTENT_LENGTH);
    }

    console.log(
      `[scrape-schedule] Sending ${contentForAI.length} chars to Gemini (via ${scrapeMethod})`,
    );

    // ── Send to Gemini for extraction (45s timeout) ──
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const contentType =
      scrapeMethod === 'firecrawl' ? 'rendered webpage content (markdown)' : 'webpage HTML';

    const systemPrompt = `You are a schedule extraction expert. Extract ONLY games, events, shows, matches, or performances from this ${contentType}.

For each event extract:
- title: The matchup or event name exactly as shown (e.g., "Lakers at Memphis Grizzlies", "Concert at Madison Square Garden")
- date: YYYY-MM-DD format
- start_time: HH:MM in 24-hour format IF clearly listed on the page. Otherwise OMIT this field entirely.
- location: For sports - if it's a home game, use the home team name. If it's an away game, use the opponent/away team name. For concerts/shows, use the venue name and city if shown. Do NOT guess addresses or make up locations.

CRITICAL RULES:
1. Today's date is ${todayStr}. Only include events dated ${todayStr} or later. Do NOT include ANY past events.
2. Do NOT fill in end_time - omit it completely.
3. Do NOT fill in description - omit it completely.
4. If no start time is clearly listed on the page, OMIT start_time entirely. Do NOT guess times.
5. Return ONLY a valid JSON array of objects. No markdown, no explanation, just the JSON array.
6. If no schedule/events are found, return an empty array: []
7. Look through ALL the content to find events — check every section, table, list, and data block.
8. For tour/comedy/concert sites, each show date counts as a separate event.

Example output:
[
  {"title": "Pacers vs Celtics", "date": "2026-02-10", "start_time": "19:00", "location": "Pacers"},
  {"title": "Trevor Noah Live", "date": "2026-02-15", "location": "Ryman Auditorium, Nashville TN"}
]`;

    let rawContent = '';
    try {
      const aiResult = await invokeChatModel({
        model: 'gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract the schedule/events from this ${contentType}. Remember: only events from ${todayStr} onward.\n\n${contentForAI}`,
          },
        ],
        temperature: 0.1,
        maxTokens: 16000,
        responseFormat: { type: 'json_object' },
        timeoutMs: 45_000,
      });
      rawContent = extractTextFromChatResponse(aiResult.raw, aiResult.provider);
      console.log(`[scrape-schedule] AI provider=${aiResult.provider} model=${aiResult.model}`);
    } catch (aiError) {
      const message = aiError instanceof Error ? aiError.message : String(aiError);
      console.error(`[scrape-schedule] AI extraction error: ${message}`);

      if (message.includes('429')) {
        return new Response(
          JSON.stringify({ error: 'AI service is busy. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (message.includes('402')) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(JSON.stringify({ error: 'AI service error. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[scrape-schedule] AI response length: ${rawContent.length}`);

    // ── Parse AI response ──
    let allEvents: ScheduleEvent[] = [];
    try {
      let jsonStr = rawContent.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();

      allEvents = JSON.parse(jsonStr);

      if (!Array.isArray(allEvents)) {
        console.error('[scrape-schedule] AI did not return an array');
        allEvents = [];
      }
    } catch (parseErr) {
      console.error(
        '[scrape-schedule] Failed to parse AI JSON:',
        parseErr,
        'Raw:',
        rawContent.substring(0, 500),
      );
      return new Response(
        JSON.stringify({
          error:
            'Could not extract schedule data from this page. Try copying the schedule text and pasting it instead.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Filter to future events ──
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const futureEvents = allEvents.filter(e => {
      if (!e.date || !e.title) return false;
      try {
        const eventDate = new Date(e.date + 'T00:00:00');
        return eventDate >= todayDate;
      } catch {
        return false;
      }
    });

    const eventsFiltered = allEvents.length - futureEvents.length;

    console.log(
      `[scrape-schedule] Found ${allEvents.length} total events, ${futureEvents.length} future, ${eventsFiltered} filtered out (via ${scrapeMethod})`,
    );

    if (futureEvents.length === 0 && allEvents.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Found ${allEvents.length} event${allEvents.length !== 1 ? 's' : ''} but all are in the past. Only future events are imported.`,
          events: [],
          events_found: allEvents.length,
          events_filtered: eventsFiltered,
          source_url: url,
          scrape_method: scrapeMethod,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (futureEvents.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'No schedule or events found on this page. Make sure the URL points to a schedule page with visible dates.',
          events: [],
          events_found: 0,
          events_filtered: 0,
          source_url: url,
          scrape_method: scrapeMethod,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        events: futureEvents,
        events_found: allEvents.length,
        events_filtered: eventsFiltered,
        source_url: url,
        scrape_method: scrapeMethod,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      console.error('[scrape-schedule] Request timed out');
      return new Response(
        JSON.stringify({
          error:
            'The request took too long to process. Try a simpler URL or paste the schedule text instead.',
        }),
        { status: 408, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    console.error('[scrape-schedule] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
