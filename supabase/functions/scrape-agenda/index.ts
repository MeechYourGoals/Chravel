/**
 * Scrape Agenda Edge Function
 *
 * Fetches webpage HTML from a URL, sends raw HTML to Gemini for extraction,
 * and returns structured agenda sessions for event organizers.
 *
 * Key differences from scrape-schedule:
 * - Returns agenda-specific fields: title, description, date, start_time, end_time, location, track, speakers
 * - Gemini prompt fills ONLY fields clearly present in the source (no guessing)
 * - Does NOT filter by future dates (conferences may list undated sessions)
 * - Sends raw HTML to Gemini (up to 1M chars) — no cleaning/stripping
 * - 45s AI timeout, 15s fetch timeout
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateExternalHttpsUrl } from '../_shared/validation.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface AgendaSession {
  title: string;
  description?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  track?: string;
  speakers?: string[];
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
    if (url.startsWith('http://')) url = url.replace('http://', 'https://');
    if (!url.startsWith('https://')) url = 'https://' + url;

    if (!validateExternalHttpsUrl(url)) {
      return new Response(
        JSON.stringify({ error: 'URL must be HTTPS and external (no internal/private networks)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[scrape-agenda] Fetching URL: ${url}`);

    // ── Fetch the webpage (15s timeout) ──
    let html: string;
    try {
      const pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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
        console.error(`[scrape-agenda] HTTP ${pageResponse.status} from ${url}`);
        return new Response(
          JSON.stringify({ error: `Could not access this website (HTTP ${pageResponse.status}). Try uploading a screenshot or PDF instead.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      html = await pageResponse.text();
    } catch (fetchErr) {
      console.error(`[scrape-agenda] Fetch error:`, fetchErr);
      return new Response(
        JSON.stringify({ error: 'Could not access this website. The site may block automated requests. Try uploading a screenshot or PDF instead.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[scrape-agenda] Raw HTML: ${html.length} characters`);

    // ── Cap raw HTML at 1M characters (no cleaning) ──
    let finalHtml = html;
    if (finalHtml.length > MAX_HTML_LENGTH) {
      console.log(`[scrape-agenda] Truncating raw HTML from ${finalHtml.length} to ${MAX_HTML_LENGTH} chars`);
      finalHtml = finalHtml.substring(0, MAX_HTML_LENGTH);
    }

    console.log(`[scrape-agenda] Sending ${finalHtml.length} chars to Gemini`);

    // ── Send to Gemini for extraction (45s timeout) ──
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an expert at extracting event agenda sessions, show dates, tour dates, and scheduled performances from websites.

Extract ALL sessions, talks, panels, workshops, performances, shows, tour dates, and scheduled items from this webpage.

For each session, extract ONLY the fields that are CLEARLY PRESENT in the source. Do NOT guess, fabricate, or infer missing data.

Available fields:
- title (REQUIRED): The session/talk/show/performance name exactly as shown
- description: Session description IF explicitly present. OMIT if not shown.
- session_date: YYYY-MM-DD format IF a specific date is shown. OMIT if not shown.
- start_time: HH:MM in 24-hour format IF clearly listed. OMIT if not shown.
- end_time: HH:MM in 24-hour format IF clearly listed. OMIT if not shown.
- location: Room name, stage name, venue, or city IF shown. OMIT if not shown.
- track: Category/track name IF shown (e.g., "Interactive", "Music", "Workshop", "Main Stage"). OMIT if not shown.
- speakers: Array of speaker/presenter/performer names IF listed. OMIT if not shown.

CRITICAL RULES:
1. Only include fields that are EXPLICITLY present in the source material.
2. Do NOT fabricate descriptions, categories, or speaker names.
3. Do NOT guess times or dates that aren't clearly shown.
4. If a field is not present in the source, OMIT it entirely from the object (do not include it as null or empty string).
5. Return ONLY a valid JSON array of objects. No markdown, no explanation, just the JSON array.
6. If no sessions are found, return an empty array: []
7. Extract ALL sessions, not just a sample. Include every session you can find.
8. Look through ALL the HTML content including embedded scripts, JSON data, __NEXT_DATA__, application/ld+json, and structured data to find events.
9. For tour/show websites, each show date at a different venue counts as a separate session.

Example output (showing different levels of available data):
[
  {"title": "The Future of AI in Music", "session_date": "2026-03-14", "start_time": "14:00", "end_time": "15:00", "location": "Room 4AB", "track": "Interactive", "speakers": ["Jane Doe", "John Smith"], "description": "A panel discussion exploring how AI is transforming music creation."},
  {"title": "Nurse John Live", "session_date": "2026-05-10", "start_time": "20:00", "location": "The Improv, Hollywood CA"},
  {"title": "Opening Ceremony", "start_time": "09:00", "location": "Main Stage"},
  {"title": "Networking Lunch"}
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
          { role: 'user', content: `Extract ALL agenda sessions, show dates, and scheduled events from this webpage HTML:\n\n${finalHtml}` },
        ],
        temperature: 0.1,
        max_tokens: 32000,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      console.error(`[scrape-agenda] AI gateway error: ${status}`);

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

    console.log(`[scrape-agenda] AI response length: ${rawContent.length}`);

    // ── Parse AI response ──
    let sessions: AgendaSession[] = [];
    try {
      let jsonStr = rawContent.trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
      else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
      if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
      jsonStr = jsonStr.trim();

      sessions = JSON.parse(jsonStr);

      if (!Array.isArray(sessions)) {
        console.error('[scrape-agenda] AI did not return an array');
        sessions = [];
      }

      // Filter out entries without a title
      sessions = sessions.filter(s => s.title && typeof s.title === 'string' && s.title.trim().length > 0);

      // Clean up each session — remove empty/null fields
      sessions = sessions.map(s => {
        const clean: AgendaSession = { title: s.title.trim() };
        if (s.description && s.description.trim()) clean.description = s.description.trim();
        if (s.session_date && s.session_date.trim()) clean.session_date = s.session_date.trim();
        if (s.start_time && s.start_time.trim()) clean.start_time = s.start_time.trim();
        if (s.end_time && s.end_time.trim()) clean.end_time = s.end_time.trim();
        if (s.location && s.location.trim()) clean.location = s.location.trim();
        if (s.track && s.track.trim()) clean.track = s.track.trim();
        if (s.speakers && Array.isArray(s.speakers) && s.speakers.length > 0) {
          clean.speakers = s.speakers.filter(sp => sp && typeof sp === 'string' && sp.trim()).map(sp => sp.trim());
          if (clean.speakers.length === 0) delete clean.speakers;
        }
        return clean;
      });
    } catch (parseErr) {
      console.error('[scrape-agenda] Failed to parse AI JSON:', parseErr, 'Raw:', rawContent.substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Could not extract agenda data from this page. Try uploading a screenshot or PDF instead.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[scrape-agenda] Found ${sessions.length} sessions`);

    if (sessions.length === 0) {
      // Check if site is JS-rendered (common SPA patterns)
      const isJsRendered =
        (html.includes('__NEXT_DATA__') && !html.includes('"props":{"pageProps":{')) ||
        (html.includes('<div id="root"></div>') || html.includes('<div id="app"></div>')) ||
        (html.includes('<noscript>') && html.includes('JavaScript')) ||
        (html.includes('window.__INITIAL_STATE__') && html.length < 100000) ||
        (html.includes('react-root') && !html.includes('<article'));

      const errorMessage = isJsRendered
        ? 'This website loads its content dynamically with JavaScript and can\'t be read by our scanner. Try one of these alternatives:\n\n1. Copy the agenda text from the page and paste it\n2. Take a screenshot of the agenda and upload it using "Upload Image"'
        : 'No agenda sessions found on this page. Make sure the URL points to an agenda or schedule page.';

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          sessions: [],
          source_url: url,
          is_js_rendered: isJsRendered,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessions,
        sessions_found: sessions.length,
        source_url: url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      console.error('[scrape-agenda] AI request timed out after 45s');
      return new Response(
        JSON.stringify({ error: 'The AI took too long to process this page. Try a simpler URL or upload a screenshot/PDF instead.' }),
        { status: 408, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
      );
    }

    console.error('[scrape-agenda] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
