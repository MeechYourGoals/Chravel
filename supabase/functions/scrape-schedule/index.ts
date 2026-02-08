/**
 * Scrape Schedule Edge Function
 *
 * Fetches webpage HTML from a URL, sends raw HTML to Gemini for extraction,
 * and returns structured schedule events (future-only).
 *
 * Sends raw HTML to Gemini (up to 1M chars) — no cleaning/stripping.
 * Includes 45s AI timeout and 15s fetch timeout for reliability.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateExternalHttpsUrl } from '../_shared/validation.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface ScheduleEvent {
  title: string;
  date: string; // YYYY-MM-DD
  start_time?: string; // HH:MM
  location?: string;
}

/** Max characters of raw HTML to send to Gemini (1M token model) */
const MAX_HTML_LENGTH = 1_000_000;

serve(async (req) => {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
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

    // Auto-upgrade HTTP to HTTPS
    if (url.startsWith('http://')) {
      url = url.replace('http://', 'https://');
    }

    // Add protocol if missing
    if (!url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // SSRF protection
    if (!validateExternalHttpsUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'URL must be HTTPS and external (no internal/private networks)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[scrape-schedule] Fetching URL: ${url}`);

    // ── Fetch the webpage (15s timeout) ──
    let html: string;
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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
        return new Response(
          JSON.stringify({
            error: `Could not access this website (HTTP ${pageResponse.status}). Try copying the schedule text and pasting it instead.`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      html = await pageResponse.text();
    } catch (fetchErr) {
      console.error(`[scrape-schedule] Fetch error:`, fetchErr);
      return new Response(
        JSON.stringify({
          error:
            'Could not access this website. The site may block automated requests. Try copying the schedule text and pasting it instead.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[scrape-schedule] Raw HTML: ${html.length} characters`);

    // ── Cap raw HTML at 1M characters (no cleaning) ──
    let finalHtml = html;
    if (finalHtml.length > MAX_HTML_LENGTH) {
      console.log(`[scrape-schedule] Truncating raw HTML from ${finalHtml.length} to ${MAX_HTML_LENGTH} chars`);
      finalHtml = finalHtml.substring(0, MAX_HTML_LENGTH);
    }

    console.log(`[scrape-schedule] Sending ${finalHtml.length} chars to Gemini`);

    // ── Send to Gemini for extraction (45s timeout) ──
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    const systemPrompt = `You are a schedule extraction expert. Extract ONLY games, events, shows, matches, or performances from this webpage HTML.

For each event extract:
- title: The matchup or event name exactly as shown (e.g., "Lakers at Memphis Grizzlies", "Concert at Madison Square Garden")
- date: YYYY-MM-DD format
- start_time: HH:MM in 24-hour format IF clearly listed on the page. Otherwise OMIT this field entirely.
- location: For sports - if it's a home game, use the home team name. If it's an away game, use the opponent/away team name. For concerts/shows, use the venue name if shown. Do NOT guess addresses or make up locations.

CRITICAL RULES:
1. Today's date is ${todayStr}. Only include events dated ${todayStr} or later. Do NOT include ANY past events.
2. Do NOT fill in end_time - omit it completely.
3. Do NOT fill in description - omit it completely.
4. If no start time is clearly listed on the page, OMIT start_time entirely. Do NOT guess times.
5. Return ONLY a valid JSON array of objects. No markdown, no explanation, just the JSON array.
6. If no schedule/events are found, return an empty array: []
7. Look through ALL the HTML content including embedded scripts, JSON data, and structured data to find events.

Example output:
[
  {"title": "Pacers vs Celtics", "date": "2026-02-10", "start_time": "19:00", "location": "Pacers"},
  {"title": "Pacers at Lakers", "date": "2026-02-15", "location": "Lakers"}
]`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Extract the schedule/events from this webpage. Remember: only events from ${todayStr} onward.\n\n${finalHtml}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error(`[scrape-schedule] AI gateway error: ${status}`);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI service is busy. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service error. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content ?? '';

    console.log(`[scrape-schedule] AI response length: ${rawContent.length}`);

    // ── Parse AI response ──
    let allEvents: ScheduleEvent[] = [];
    try {
      // Strip markdown code fences if present
      let jsonStr = rawContent.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      allEvents = JSON.parse(jsonStr);

      if (!Array.isArray(allEvents)) {
        console.error('[scrape-schedule] AI did not return an array');
        allEvents = [];
      }
    } catch (parseErr) {
      console.error('[scrape-schedule] Failed to parse AI JSON:', parseErr, 'Raw:', rawContent.substring(0, 500));
      return new Response(
        JSON.stringify({
          error:
            'Could not extract schedule data from this page. Try copying the schedule text and pasting it instead.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Filter to future events (defense-in-depth — AI should already filter) ──
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const futureEvents = allEvents.filter((e) => {
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
      `[scrape-schedule] Found ${allEvents.length} total events, ${futureEvents.length} future, ${eventsFiltered} filtered out`,
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
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (futureEvents.length === 0) {
      // Check if site is JS-rendered (common SPA patterns)
      const isJsRendered =
        (html.includes('__NEXT_DATA__') && !html.includes('"props":{"pageProps":{')) ||
        (html.includes('<div id="root"></div>') || html.includes('<div id="app"></div>')) ||
        (html.includes('<noscript>') && html.includes('JavaScript')) ||
        (html.includes('window.__INITIAL_STATE__') && html.length < 100000) ||
        (html.includes('react-root') && !html.includes('<article'));

      const errorMessage = isJsRendered
        ? 'This website loads its content dynamically with JavaScript and can\'t be read by our scanner. Try one of these alternatives:\n\n1. Copy the schedule text from the page and paste it using "Paste Text"\n2. Take a screenshot of the schedule and upload it using "Upload Image"'
        : 'No schedule or events found on this page. Make sure the URL points to a schedule page with visible dates.';

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          events: [],
          events_found: 0,
          events_filtered: 0,
          source_url: url,
          is_js_rendered: isJsRendered,
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
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    // Distinguish timeout errors for better user messaging
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      console.error('[scrape-schedule] AI request timed out after 45s');
      return new Response(
        JSON.stringify({
          error: 'The AI took too long to process this page. Try a simpler URL or paste the schedule text instead.',
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
