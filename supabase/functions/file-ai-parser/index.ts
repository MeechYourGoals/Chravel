import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';
import { validateExternalHttpsUrl } from '../_shared/validation.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/requireAuth.ts';

// Security model:
// 1. requireAuth validates the caller's JWT — no unauthenticated access
// 2. Trip membership check mirrors trip_files RLS (status = 'active')
//    so service_role is only used after the caller is confirmed as an active trip member
// 3. Service role is used for file_ai_extractions insert since that table has
//    RLS enabled with no user-scoped policies (edge function only)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function parseJsonSafely(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (_error) {
    const block = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (block) {
      return JSON.parse(block[1]);
    }
    throw new Error('Failed to parse AI JSON response');
  }
}

async function runParserModel(
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content:
      | string
      | Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string } }>;
  }>,
  options?: { maxTokens?: number; temperature?: number; timeoutMs?: number },
): Promise<unknown> {
  const aiResult = await invokeChatModel({
    model: 'gemini-3-flash-preview',
    messages,
    maxTokens: options?.maxTokens ?? 2000,
    temperature: options?.temperature ?? 0.1,
    timeoutMs: options?.timeoutMs ?? 45000,
    responseFormat: { type: 'json_object' },
  });
  const payload = extractTextFromChatResponse(aiResult.raw, aiResult.provider);
  console.log(`[file-ai-parser] AI provider=${aiResult.provider} model=${aiResult.model}`);
  return parseJsonSafely(payload);
}

// ── Confidence helpers ────────────────────────────────────────────────────────

function clampConfidence(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

/**
 * Compute a real confidence score from AI extraction output.
 * - calendar: average per-event confidence returned by AI
 * - other: top-level confidence field, or inferred from content presence
 */
function computeConfidence(extractedData: unknown, extractionType: string): number {
  if (!extractedData || typeof extractedData !== 'object') return 0;
  const data = extractedData as Record<string, unknown>;

  if (extractionType === 'calendar' && Array.isArray(data.events) && data.events.length > 0) {
    const scores = data.events
      .map((e: unknown) => {
        if (!e || typeof e !== 'object') return null;
        const ev = e as Record<string, unknown>;
        return typeof ev.confidence === 'number' ? ev.confidence : null;
      })
      .filter((v): v is number => v !== null);
    if (scores.length > 0) {
      return clampConfidence(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
    return 0.65; // Events found but no per-event confidence
  }

  if (typeof data.confidence === 'number') {
    return clampConfidence(data.confidence);
  }

  // Infer from content presence
  const hasContent =
    (typeof data.text === 'string' && data.text.length > 20) ||
    (typeof data.content === 'string' && data.content.length > 20) ||
    data.title !== undefined ||
    (Array.isArray(data.flights) && data.flights.length > 0) ||
    (Array.isArray(data.hotels) && data.hotels.length > 0) ||
    (Array.isArray(data.activities) && data.activities.length > 0);
  return hasContent ? 0.65 : 0.3;
}

// ── Output schema normalizers ─────────────────────────────────────────────────

function normalizeCalendarOutput(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return { events: [] };
  const data = raw as Record<string, unknown>;
  const events = Array.isArray(data.events)
    ? data.events
        .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
        .map(e => ({
          title: typeof e.title === 'string' ? e.title : '',
          date: typeof e.date === 'string' ? e.date : null,
          start_time: typeof e.start_time === 'string' ? e.start_time : null,
          end_time: typeof e.end_time === 'string' ? e.end_time : null,
          location: typeof e.location === 'string' ? e.location : null,
          description: typeof e.description === 'string' ? e.description : null,
          category: typeof e.category === 'string' ? e.category : 'other',
          confirmation_number:
            typeof e.confirmation_number === 'string' ? e.confirmation_number : null,
          confidence: clampConfidence(e.confidence),
        }))
    : [];
  return {
    events,
    dates_mentioned: Array.isArray(data.dates_mentioned)
      ? data.dates_mentioned.filter((d): d is string => typeof d === 'string')
      : [],
    locations_mentioned: Array.isArray(data.locations_mentioned)
      ? data.locations_mentioned.filter((l): l is string => typeof l === 'string')
      : [],
  };
}

function normalizeTextOutput(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return { text: '' };
  const data = raw as Record<string, unknown>;
  return { text: typeof data.text === 'string' ? data.text : '' };
}

function normalizeItineraryOutput(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return { title: '', destination: null, dates: {}, flights: [], hotels: [], activities: [] };
  }
  const data = raw as Record<string, unknown>;
  const dates =
    data.dates && typeof data.dates === 'object' ? (data.dates as Record<string, unknown>) : {};
  return {
    title: typeof data.title === 'string' ? data.title : '',
    destination: typeof data.destination === 'string' ? data.destination : null,
    dates: {
      start: typeof dates.start === 'string' ? dates.start : null,
      end: typeof dates.end === 'string' ? dates.end : null,
    },
    flights: Array.isArray(data.flights) ? data.flights : [],
    hotels: Array.isArray(data.hotels) ? data.hotels : [],
    activities: Array.isArray(data.activities) ? data.activities : [],
  };
}

function normalizeGeneralOutput(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return { content: '' };
  const data = raw as Record<string, unknown>;
  return {
    content: typeof data.content === 'string' ? data.content : JSON.stringify(data),
  };
}

function normalizeOutput(raw: unknown, extractionType: string): Record<string, unknown> {
  switch (extractionType) {
    case 'calendar':
      return normalizeCalendarOutput(raw);
    case 'text':
      return normalizeTextOutput(raw);
    case 'itinerary':
      return normalizeItineraryOutput(raw);
    default:
      return normalizeGeneralOutput(raw);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async req => {
  const corsHeaders = getCorsHeaders(req);
  const { createOptionsResponse } = await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    // ── Step 1: Auth gate ────────────────────────────────────────────────────
    const auth = await requireAuth(req, corsHeaders);
    if (auth.response) return auth.response;
    const { user } = auth;

    const body = await req.json();
    const { fileId, fileUrl, extractionType } = body as {
      fileId?: string;
      fileUrl?: string;
      extractionType?: string;
    };

    if (!fileId || !fileUrl || !extractionType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validateExternalHttpsUrl(fileUrl)) {
      return new Response(JSON.stringify({ error: 'fileUrl must be HTTPS and external' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client — only used after auth + membership verified below
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Step 2: Verify file ownership / trip membership ──────────────────────
    // Mirrors trip_files RLS: status = 'active' active trip member required.
    // Resolves: fileId → trip_id → trip membership for the authenticated user.
    const { data: fileRow, error: fileError } = await supabase
      .from('trip_files')
      .select('trip_id')
      .eq('id', fileId)
      .maybeSingle();

    if (fileError || !fileRow) {
      console.warn('[file-ai-parser] File not found:', fileId);
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: membership } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', fileRow.trip_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!membership) {
      console.warn(
        '[file-ai-parser] Access denied: user',
        user.id,
        'not member of trip for file',
        fileId,
      );
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Step 3: AI extraction ────────────────────────────────────────────────
    let rawExtraction: unknown;

    switch (extractionType) {
      case 'calendar':
        rawExtraction = await extractCalendarEvents(fileUrl);
        break;
      case 'text':
        rawExtraction = await extractText(fileUrl);
        break;
      case 'itinerary':
        rawExtraction = await extractItinerary(fileUrl);
        break;
      default:
        rawExtraction = await extractGeneral(fileUrl);
    }

    // Normalize to validated schema before persisting
    const extractedData = normalizeOutput(rawExtraction, extractionType);
    // Compute real confidence from AI output (not hardcoded)
    const confidenceScore = computeConfidence(rawExtraction, extractionType);

    // ── Step 4: Persist to DB ────────────────────────────────────────────────
    const { data: extractionRecord, error: dbError } = await supabase
      .from('file_ai_extractions')
      .insert({
        file_id: fileId,
        extracted_data: extractedData,
        extraction_type: extractionType,
        confidence_score: confidenceScore,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[file-ai-parser] Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save extraction results' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        extraction: extractionRecord,
        extracted_data: extractedData,
        confidence_score: confidenceScore,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[file-ai-parser] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Extraction prompts ────────────────────────────────────────────────────────

async function extractCalendarEvents(fileUrl: string): Promise<unknown> {
  return runParserModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Please analyze this document and extract any calendar events, reservations, bookings, or schedule information. Look for:
              - Restaurant reservations (OpenTable, Resy, etc.)
              - Flight bookings (airlines, confirmation codes)
              - Hotel check-ins/check-outs
              - Event tickets (concerts, shows, activities)
              - Transportation bookings

              Return the data in JSON format:
              {
                "events": [
                  {
                    "title": "string",
                    "date": "YYYY-MM-DD",
                    "start_time": "HH:MM",
                    "end_time": "HH:MM",
                    "location": "string",
                    "description": "string",
                    "category": "dining|lodging|activity|transportation|entertainment|other",
                    "confirmation_number": "string",
                    "confidence": 0.95
                  }
                ],
                "dates_mentioned": ["YYYY-MM-DD"],
                "locations_mentioned": ["string"],
                "reservation_details": {
                  "platform": "string",
                  "contact_info": "string"
                }
              }`,
          },
          {
            type: 'image_url',
            image_url: { url: fileUrl },
          },
        ],
      },
    ],
    { maxTokens: 2000, temperature: 0.1, timeoutMs: 45000 },
  );
}

async function extractText(fileUrl: string): Promise<unknown> {
  return runParserModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please extract all text content from this document and return it in a clean, structured format as JSON: {"text": "extracted text here", "confidence": 0.95}',
          },
          {
            type: 'image_url',
            image_url: { url: fileUrl },
          },
        ],
      },
    ],
    { maxTokens: 2000, temperature: 0.1, timeoutMs: 45000 },
  );
}

async function extractItinerary(fileUrl: string): Promise<unknown> {
  return runParserModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this itinerary document and extract structured travel information in JSON format:
              {
                "confidence": 0.95,
                "title": "string",
                "destination": "string",
                "dates": {
                  "start": "YYYY-MM-DD",
                  "end": "YYYY-MM-DD"
                },
                "flights": [
                  {
                    "date": "YYYY-MM-DD",
                    "time": "HH:MM",
                    "from": "string",
                    "to": "string",
                    "flight_number": "string"
                  }
                ],
                "hotels": [
                  {
                    "name": "string",
                    "address": "string",
                    "check_in": "YYYY-MM-DD",
                    "check_out": "YYYY-MM-DD"
                  }
                ],
                "activities": [
                  {
                    "date": "YYYY-MM-DD",
                    "time": "HH:MM",
                    "title": "string",
                    "location": "string",
                    "description": "string"
                  }
                ]
              }`,
          },
          {
            type: 'image_url',
            image_url: { url: fileUrl },
          },
        ],
      },
    ],
    { maxTokens: 2000, temperature: 0.1, timeoutMs: 45000 },
  );
}

async function extractGeneral(fileUrl: string): Promise<unknown> {
  return runParserModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this document and extract key information including any dates, locations, prices, contact information, or important details that might be relevant for trip planning. Return as JSON: {"content": "extracted information", "confidence": 0.95}',
          },
          {
            type: 'image_url',
            image_url: { url: fileUrl },
          },
        ],
      },
    ],
    { maxTokens: 1500, temperature: 0.1, timeoutMs: 45000 },
  );
}
