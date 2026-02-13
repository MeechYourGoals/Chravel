import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';
import { validateExternalHttpsUrl } from '../_shared/validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function parseJsonSafely(raw: string): any {
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
): Promise<any> {
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

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { fileId, fileUrl, extractionType } = await req.json();

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

    let extractedData;
    let confidenceScore = 0.8;

    switch (extractionType) {
      case 'calendar':
        extractedData = await extractCalendarEvents(fileUrl);
        break;
      case 'text':
        extractedData = await extractText(fileUrl);
        break;
      case 'itinerary':
        extractedData = await extractItinerary(fileUrl);
        break;
      default:
        extractedData = await extractGeneral(fileUrl);
    }

    // Save extraction results to database
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
      console.error('Database error:', dbError);
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
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in file-ai-parser function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function extractCalendarEvents(fileUrl: string) {
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

async function extractText(fileUrl: string) {
  return runParserModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Please extract all text content from this document and return it in a clean, structured format as JSON: {"text": "extracted text here"}',
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

async function extractItinerary(fileUrl: string) {
  return runParserModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this itinerary document and extract structured travel information in JSON format:
              {
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

async function extractGeneral(fileUrl: string) {
  return runParserModel(
    [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this document and extract key information including any dates, locations, prices, contact information, or important details that might be relevant for trip planning. Return as JSON: {"content": "extracted information"}',
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
