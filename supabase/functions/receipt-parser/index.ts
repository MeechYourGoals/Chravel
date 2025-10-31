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

    const { receiptImageUrl, tripId, userId } = await req.json();

    if (!receiptImageUrl || !tripId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
    }

    // Use Google Gemini Vision API through Lovable Gateway to parse receipt
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
                text: `Please analyze this receipt image and extract the following information in JSON format:
                {
                  "total_amount": number,
                  "currency": "USD",
                  "date": "YYYY-MM-DD",
                  "merchant_name": "string",
                  "items": [{"name": "string", "price": number, "quantity": number}],
                  "tax": number,
                  "tip": number
                }
                
                If any field is not clearly visible, use null for that field.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: receiptImageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${await geminiResponse.text()}`);
    }

    const geminiResult = await geminiResponse.json();
    const parsedContent = geminiResult.choices[0].message.content;
    
    let parsedData;
    try {
      parsedData = JSON.parse(parsedContent);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parsedContent);
      parsedData = { error: 'Failed to parse receipt', raw_response: parsedContent };
    }

    // Save receipt to database
    const { data: receiptRecord, error: dbError } = await supabase
      .from('trip_receipts')
      .insert({
        trip_id: tripId,
        receipt_url: receiptImageUrl,
        amount: parsedData.total_amount || null,
        user_id: userId,
        description: parsedData.merchant_name || null
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to save receipt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        receipt: receiptRecord,
        parsed_data: parsedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in receipt-parser function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});