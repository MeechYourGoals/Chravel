import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messageText, fileUrl, fileType, extractionType, tripId } = await req.json();
    
    switch (extractionType) {
      case 'calendar':
        return await extractCalendarEvents(messageText, fileUrl, fileType);
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
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function extractCalendarEvents(messageText: string, fileUrl?: string, fileType?: string) {
  if (!LOVABLE_API_KEY) {
    throw new Error('Lovable API key not configured');
  }

  const messages = [
    {
      role: 'system',
      content: `You are an expert at extracting calendar events from travel documents, emails, and messages. 
      Extract events with high confidence scores and return structured JSON data.
      
      Focus on:
      - Flight bookings with confirmation codes
      - Hotel reservations with check-in/out dates
      - Restaurant reservations with times
      - Activity bookings with dates/times
      - Transportation bookings
      - Tour schedules
      - Meeting times
      
      Return JSON format:
      {
        "events": [
          {
            "title": "string",
            "date": "YYYY-MM-DD",
            "start_time": "HH:MM",
            "end_time": "HH:MM",
            "location": "string",
            "category": "dining|lodging|activity|transportation|entertainment|business",
            "confirmation_number": "string",
            "confidence": 0.95,
            "source_text": "original text that led to this extraction",
            "all_day": false
          }
        ],
        "confidence_overall": 0.9
      }`
    },
    {
      role: 'user',
      content: buildUserMessage(messageText, fileUrl, fileType)
    }
  ];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages,
      max_tokens: 2000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const result = await response.json();
  const extractedData = JSON.parse(result.choices[0].message.content);
  
  return new Response(
    JSON.stringify({
      success: true,
      extracted_data: extractedData,
      confidence: extractedData.confidence_overall || 0.8
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function extractTodoItems(messageText: string, tripId: string) {
  if (!LOVABLE_API_KEY) {
    throw new Error('Lovable API key not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
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
          }`
        },
        {
          role: 'user',
          content: `Extract todo items from this message: ${messageText}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to extract todo items');
  }

  const result = await response.json();
  const extractedData = JSON.parse(result.choices[0].message.content);
  
  return new Response(
    JSON.stringify({
      success: true,
      todos: extractedData.todos || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function analyzePhoto(fileUrl: string) {
  if (!LOVABLE_API_KEY) {
    throw new Error('Lovable API key not configured');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
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
          }`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this travel photo and extract relevant information:'
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error('Failed to analyze photo');
  }

  const result = await response.json();
  const analysis = JSON.parse(result.choices[0].message.content);
  
  return new Response(
    JSON.stringify({
      success: true,
      analysis: analysis.analysis
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function parseDocument(fileUrl: string, fileType: string) {
  if (!LOVABLE_API_KEY) {
    throw new Error('Lovable API key not configured');
  }

  // 🆕 Enhanced document parsing with better OCR and structure extraction
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
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
          }`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Perform high-accuracy OCR and parsing on this ${fileType} document. Extract ALL visible text, structure data, detect tables, and identify key travel information:`
            },
            {
              type: 'image_url',
              image_url: { url: fileUrl }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.05,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Document parsing failed: ${errorText}`);
  }

  const result = await response.json();
  const parsedData = JSON.parse(result.choices[0].message.content);
  
  return new Response(
    JSON.stringify({
      success: true,
      parsed_data: parsedData,
      ocr_quality: parsedData.ocr_confidence >= 0.9 ? 'excellent' : parsedData.ocr_confidence >= 0.75 ? 'good' : 'fair'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function buildUserMessage(messageText: string, fileUrl?: string, fileType?: string): any {
  const content = [
    {
      type: 'text',
      text: `Analyze this content and extract calendar events: ${messageText || 'See attached content'}`
    }
  ];

  if (fileUrl) {
    if (fileType?.startsWith('image/')) {
      content.push({
        type: 'image_url',
        image_url: { url: fileUrl }
      });
    } else {
      content[0].text += `\nFile URL: ${fileUrl} (Type: ${fileType})`;
    }
  }

  return content;
}