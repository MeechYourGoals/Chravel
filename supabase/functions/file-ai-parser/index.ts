import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { fileId, fileUrl, extractionType } = await req.json();

    if (!fileId || !fileUrl || !extractionType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
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
        confidence_score: confidenceScore
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save extraction results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extraction: extractionRecord,
        extracted_data: extractedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in file-ai-parser function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractCalendarEvents(fileUrl: string) {
  const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
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
              }`
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  const result = await geminiResponse.json();
  return JSON.parse(result.choices[0].message.content);
}

async function extractText(fileUrl: string) {
  const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please extract all text content from this document and return it in a clean, structured format as JSON: {"text": "extracted text here"}'
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  const result = await geminiResponse.json();
  return JSON.parse(result.choices[0].message.content);
}

async function extractItinerary(fileUrl: string) {
  const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
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
              }`
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  const result = await geminiResponse.json();
  return JSON.parse(result.choices[0].message.content);
}

async function extractGeneral(fileUrl: string) {
  const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this document and extract key information including any dates, locations, prices, contact information, or important details that might be relevant for trip planning. Return as JSON: {"content": "extracted information"}'
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  const result = await geminiResponse.json();
  return JSON.parse(result.choices[0].message.content);
}