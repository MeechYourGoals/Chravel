import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { corsHeaders } from '../_shared/cors.ts';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

// ─── Safe JSON Parser ────────────────────────────────────────────────────────

function safeParseJSON(raw: string): any {
  // 1. Strip markdown code fences
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
  cleaned = cleaned.trim();

  // 2. Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // continue to fallback
  }

  // 3. Remove trailing commas before } or ]
  const noTrailing = cleaned.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(noTrailing);
  } catch (_) {
    // continue to regex fallback
  }

  // 4. Regex fallback: extract first JSON object/array
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (_) {
      // try trailing comma fix on extracted block
      try {
        return JSON.parse(jsonMatch[1].replace(/,\s*([}\]])/g, '$1'));
      } catch (_) {
        // give up
      }
    }
  }

  throw new Error(
    `Failed to parse AI response as JSON. Raw content starts with: ${raw.substring(0, 100)}`,
  );
}

async function runParserModel(
  messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>,
  options?: { maxTokens?: number; temperature?: number; timeoutMs?: number },
): Promise<string> {
  const result = await invokeChatModel({
    model: 'gemini-3-flash-preview',
    messages,
    maxTokens: options?.maxTokens ?? 4000,
    temperature: options?.temperature ?? 0.1,
    timeoutMs: options?.timeoutMs ?? 45000,
    responseFormat: { type: 'json_object' },
  });

  const text = extractTextFromChatResponse(result.raw, result.provider);
  if (!text.trim()) {
    throw new Error('AI parser returned empty response');
  }

  console.log(`[enhanced-ai-parser] AI provider=${result.provider} model=${result.model}`);
  return text;
}

// ─── URL Validation (SSRF Prevention) ────────────────────────────────────────

function validateImageUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL format' };
  }

  try {
    const urlObj = new URL(url);

    if (urlObj.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }

    const supabaseUrlObj = new URL(SUPABASE_URL);
    const projectId = supabaseUrlObj.hostname.split('.')[0];

    const storagePattern = new RegExp(`^https://${projectId}\\.supabase\\.co/storage/`);
    if (storagePattern.test(url)) return { valid: true };

    const hostname = urlObj.hostname.toLowerCase();
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
      '169.254.169.254',
      'metadata.google.internal',
    ];
    if (blockedHosts.includes(hostname)) {
      return { valid: false, error: 'Localhost and internal IPs are not allowed' };
    }

    const privateIpPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^fc00:/,
      /^fe80:/,
    ];
    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Private IP ranges are not allowed' };
      }
    }

    return { valid: true };
  } catch (_error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

// ─── PDF Content Fetcher ─────────────────────────────────────────────────────

async function fetchFileAsBase64(
  fileUrl: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);

    return { base64, mimeType: contentType.split(';')[0].trim() };
  } catch (error) {
    console.error('Failed to fetch file for base64 encoding:', error);
    return null;
  }
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Unauthorized - authentication required', 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createErrorResponse('Unauthorized - invalid or expired token', 401);
    }

    const { messageText, fileUrl, fileType, extractionType, tripId } = await req.json();

    if (fileUrl) {
      const urlValidation = validateImageUrl(fileUrl);
      if (!urlValidation.valid) {
        return createErrorResponse(`Invalid file URL: ${urlValidation.error}`, 400);
      }
    }

    if (tripId) {
      const { data: membershipCheck, error: membershipError } = await supabase
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError || !membershipCheck) {
        return createErrorResponse('Forbidden - you must be a member of this trip', 403);
      }
    }

    switch (extractionType) {
      case 'calendar':
        return await extractCalendarEvents(messageText, fileUrl, fileType);
      case 'agenda':
        return await extractAgendaSessions(messageText, fileUrl, fileType);
      case 'todo':
        return await extractTodoItems(messageText, tripId);
      case 'photo_analysis':
        return await analyzePhoto(fileUrl);
      case 'document_parse':
        return await parseDocument(fileUrl, fileType);
      default:
        throw new Error('Invalid extraction type');
    }
  } catch (error) {
    console.error('AI Parser error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});

// ─── Calendar Event Extraction ───────────────────────────────────────────────

async function extractCalendarEvents(messageText: string, fileUrl?: string, fileType?: string) {
  const userContent = await buildUserMessage(messageText, fileUrl, fileType);

  const messages = [
    {
      role: 'system',
      content: `You are an expert at extracting scheduled events from any source — travel documents, show schedules, festival lineups, conference agendas, sports calendars, concert listings, spreadsheet screenshots, and general event lists.
      
      Extract ALL scheduled events you can find. This includes but is not limited to:
      - Concerts, shows, performances, comedy acts, DJ sets
      - Conferences, talks, panels, workshops, seminars
      - Sports games, matches, tournaments
      - Festival events, parades, exhibitions
      - Flight bookings, hotel reservations, restaurant reservations
      - Activity bookings, tour schedules, transportation
      - Meetings, appointments, deadlines
      - Any other time-bound scheduled event
      
      Return JSON format:
      {
        "events": [
          {
            "title": "string",
            "date": "YYYY-MM-DD",
            "start_time": "HH:MM",
            "end_time": "HH:MM",
            "location": "string",
            "category": "dining|lodging|activity|transportation|entertainment|other",
            "confirmation_number": "string",
            "confidence": 0.95,
            "source_text": "original text that led to this extraction",
            "all_day": false
          }
        ],
        "confidence_overall": 0.9
      }
      
      CRITICAL RULES:
      1. Extract ALL events, not just a sample. If there are 50 events, return all 50.
      2. Only include fields that are EXPLICITLY present in the source material.
      3. Do NOT fabricate or hallucinate events. Only extract what is clearly shown.
      4. Use "entertainment" for shows, concerts, comedy, performances, festivals.
      5. Use "other" when an event doesn't fit the standard categories.
      6. If no events are found, return {"events": [], "confidence_overall": 0}`,
    },
    {
      role: 'user',
      content: userContent,
    },
  ];

  const rawText = await runParserModel(messages, {
    maxTokens: 16000,
    temperature: 0.1,
    timeoutMs: 45000,
  });
  const extractedData = safeParseJSON(rawText);

  return new Response(
    JSON.stringify({
      success: true,
      extracted_data: extractedData,
      confidence: extractedData.confidence_overall || 0.8,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ─── Agenda Session Extraction ───────────────────────────────────────────────

async function extractAgendaSessions(messageText: string, fileUrl?: string, fileType?: string) {
  const systemPrompt = `You are an expert at extracting event agenda sessions from conference schedules, event programs, and agenda documents.

Extract ALL sessions, talks, panels, workshops, performances, and scheduled items.

For each session, extract ONLY the fields that are CLEARLY PRESENT in the source. Do NOT guess, fabricate, or infer missing data.

Return JSON format:
{
  "sessions": [
    {
      "title": "string (REQUIRED)",
      "description": "string (only if present)",
      "session_date": "YYYY-MM-DD (only if present)",
      "start_time": "HH:MM 24-hour (only if present)",
      "end_time": "HH:MM 24-hour (only if present)",
      "location": "string (only if present)",
      "track": "string category/track (only if present)",
      "speakers": ["array of names (only if present)"]
    }
  ]
}

CRITICAL RULES:
1. Only include fields EXPLICITLY present in the source material.
2. Do NOT fabricate descriptions, categories, or speaker names.
3. Do NOT guess times or dates not clearly shown.
4. If a field is not present, OMIT it entirely from the object.
5. Extract ALL sessions, not just a sample.
6. The "title" field is always required.`;

  const userContent = await buildUserMessage(
    messageText || 'Extract all agenda sessions from this document.',
    fileUrl,
    fileType,
  );

  const rawText = await runParserModel(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    {
      maxTokens: 16000,
      temperature: 0.1,
      timeoutMs: 45000,
    },
  );
  const extractedData = safeParseJSON(rawText);

  return new Response(
    JSON.stringify({
      success: true,
      sessions: extractedData.sessions || [],
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ─── Todo Extraction ─────────────────────────────────────────────────────────

async function extractTodoItems(messageText: string, tripId: string) {
  const rawText = await runParserModel(
    [
      {
        role: 'system',
        content: `Extract actionable todo items from travel-related messages. 
          Focus on tasks that need to be completed before or during the trip.
          
          Return JSON format:
          {
            "todos": [
              {
                "title": "string",
                "description": "string",
                "category": "booking|packing|documentation|preparation|logistics",
                "priority": "high|medium|low",
                "due_date": "YYYY-MM-DD or null",
                "estimated_duration": "number in minutes",
                "confidence": 0.95
              }
            ]
          }`,
      },
      {
        role: 'user',
        content: `Extract todo items from this message: ${messageText}`,
      },
    ],
    {
      maxTokens: 1000,
      temperature: 0.1,
      timeoutMs: 30000,
    },
  );

  const extractedData = safeParseJSON(rawText);

  return new Response(
    JSON.stringify({
      success: true,
      todos: extractedData.todos || [],
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ─── Photo Analysis ──────────────────────────────────────────────────────────

async function analyzePhoto(fileUrl: string) {
  const urlValidation = validateImageUrl(fileUrl);
  if (!urlValidation.valid) {
    throw new Error(`Invalid image URL: ${urlValidation.error}`);
  }

  const rawText = await runParserModel(
    [
      {
        role: 'system',
        content: `Analyze travel photos and extract useful information.
          
          Return JSON format:
          {
            "analysis": {
              "location": "detected location or null",
              "activity": "what's happening in the photo",
              "people_count": "number of people visible",
              "objects": ["list of notable objects"],
              "mood": "happy|excited|relaxed|adventurous|etc",
              "tags": ["relevant tags for categorization"],
              "suggested_caption": "auto-generated caption",
              "confidence": 0.95
            }
          }`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this travel photo and extract relevant information:',
          },
          {
            type: 'image_url',
            image_url: { url: fileUrl },
          },
        ],
      },
    ],
    {
      maxTokens: 1000,
      temperature: 0.3,
      timeoutMs: 45000,
    },
  );
  const analysis = safeParseJSON(rawText);

  return new Response(
    JSON.stringify({
      success: true,
      analysis: analysis.analysis,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ─── Document Parsing ────────────────────────────────────────────────────────

async function parseDocument(fileUrl: string, fileType: string) {
  const urlValidation = validateImageUrl(fileUrl);
  if (!urlValidation.valid) {
    throw new Error(`Invalid document URL: ${urlValidation.error}`);
  }

  // For PDFs, fetch and send as inline data so Gemini can actually read the content
  const userContent = await buildDocumentMessage(fileUrl, fileType);

  const rawText = await runParserModel(
    [
      {
        role: 'system',
        content: `You are an expert OCR and document parser for travel documents. Extract ALL text with high accuracy and structure the information.
          
          Return comprehensive JSON format:
          {
            "document_type": "booking|itinerary|ticket|receipt|invoice|contract|other",
            "extracted_text": "complete readable text with proper line breaks",
            "structured_data": {
              "dates": ["YYYY-MM-DD"],
              "times": ["HH:MM"],
              "locations": ["city, venue, or address"],
              "amounts": [{"value": number, "currency": "USD", "description": "what for"}],
              "confirmation_codes": ["booking/confirmation numbers"],
              "contact_info": {
                "emails": ["email addresses"],
                "phones": ["phone numbers"],
                "websites": ["URLs"]
              },
              "parties": {
                "travelers": ["passenger/guest names"],
                "vendors": ["hotel/airline/vendor names"]
              },
              "key_details": {
                "check_in": "YYYY-MM-DD HH:MM",
                "check_out": "YYYY-MM-DD HH:MM",
                "flight_number": "AA123",
                "seat": "12A",
                "room_number": "305",
                "total_cost": 250.00,
                "payment_method": "Visa ****1234"
              }
            },
            "tables": [
              {
                "headers": ["column names"],
                "rows": [["cell values"]]
              }
            ],
            "sections": [
              {
                "heading": "section title",
                "content": "section text"
              }
            ],
            "ocr_confidence": 0.95,
            "language": "en",
            "page_count": 1
          }`,
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    {
      maxTokens: 4000,
      temperature: 0.05,
      timeoutMs: 45000,
    },
  );

  const parsedData = safeParseJSON(rawText);

  return new Response(
    JSON.stringify({
      success: true,
      parsed_data: parsedData,
      ocr_quality:
        parsedData.ocr_confidence >= 0.9
          ? 'excellent'
          : parsedData.ocr_confidence >= 0.75
            ? 'good'
            : 'fair',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

// ─── Message Builders ────────────────────────────────────────────────────────

async function buildUserMessage(
  messageText: string,
  fileUrl?: string,
  fileType?: string,
): Promise<any> {
  const content: any[] = [
    {
      type: 'text',
      text: `Analyze this content and extract all scheduled events: ${messageText || 'See attached content'}`,
    },
  ];

  if (fileUrl) {
    if (fileType?.startsWith('image/')) {
      // Images: send as image_url directly
      content.push({
        type: 'image_url',
        image_url: { url: fileUrl },
      });
    } else if (fileType === 'application/pdf') {
      // PDFs: fetch content and send as inline_data so Gemini can read it
      console.log('[AI Parser] Fetching PDF for inline encoding...');
      const fileData = await fetchFileAsBase64(fileUrl);
      if (fileData) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${fileData.mimeType};base64,${fileData.base64}`,
          },
        });
        console.log('[AI Parser] PDF sent as inline base64 data');
      } else {
        // Fallback: tell AI we couldn't read it
        content[0].text += `\n\n[Note: A PDF file was provided but could not be read. The URL was: ${fileUrl}]`;
        console.warn('[AI Parser] Failed to fetch PDF, falling back to URL reference');
      }
    } else {
      // Other file types: append URL as text context
      content[0].text += `\nFile URL: ${fileUrl} (Type: ${fileType})`;
    }
  }

  return content;
}

async function buildDocumentMessage(fileUrl: string, fileType: string): Promise<any> {
  // For PDFs and images, try to send as inline data
  if (fileType === 'application/pdf' || fileType?.startsWith('image/')) {
    const fileData = await fetchFileAsBase64(fileUrl);
    if (fileData) {
      return [
        {
          type: 'text',
          text: `Perform high-accuracy OCR and parsing on this ${fileType} document. Extract ALL visible text, structure data, detect tables, and identify key travel information:`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${fileData.mimeType};base64,${fileData.base64}`,
          },
        },
      ];
    }
  }

  // Fallback: send as image_url (works for images, won't work great for PDFs)
  return [
    {
      type: 'text',
      text: `Perform high-accuracy OCR and parsing on this ${fileType} document. Extract ALL visible text, structure data, detect tables, and identify key travel information:`,
    },
    {
      type: 'image_url',
      image_url: { url: fileUrl },
    },
  ];
}
