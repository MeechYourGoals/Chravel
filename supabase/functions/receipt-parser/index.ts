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

    const { receiptImageUrl, receiptPath, tripId, userId } = await req.json();

    if (!receiptImageUrl || !tripId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!validateExternalHttpsUrl(receiptImageUrl)) {
      return new Response(JSON.stringify({ error: 'receiptImageUrl must be HTTPS and external' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use direct Gemini with rollback-aware Lovable fallback.
    const aiResult = await invokeChatModel({
      model: 'gemini-3-flash-preview',
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
                
                If any field is not clearly visible, use null for that field.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: receiptImageUrl,
              },
            },
          ],
        },
      ],
      maxTokens: 1000,
      temperature: 0.1,
      responseFormat: { type: 'json_object' },
      timeoutMs: 45_000,
    });

    const parsedContent = extractTextFromChatResponse(aiResult.raw, aiResult.provider);
    console.log(`[receipt-parser] AI provider=${aiResult.provider} model=${aiResult.model}`);

    let parsedData;
    try {
      parsedData = parseJsonSafely(parsedContent);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parsedContent);
      parsedData = { error: 'Failed to parse receipt', raw_response: parsedContent };
    }

    // Save receipt to database
    const { data: receiptRecord, error: dbError } = await supabase
      .from('trip_receipts')
      .insert({
        trip_id: tripId,
        receipt_url: receiptPath || receiptImageUrl,
        amount: parsedData.total_amount || null,
        user_id: userId,
        description: parsedData.merchant_name || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to save receipt' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        receipt: receiptRecord,
        parsed_data: parsedData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in receipt-parser function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
