import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error('Lovable API key not configured');
    }

    const { placeName, placeAddress, basecampLat, basecampLng } = await req.json();

    if (!placeName) {
      return new Response(JSON.stringify({ error: 'Place name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build location context
    const locationContext = placeAddress ? ` at ${placeAddress}` : '';
    const prompt = `Provide current information about this place: ${placeName}${locationContext}. Include hours, phone number, website, rating, price level, and any special notes.`;

    // Call Lovable AI with Maps grounding
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        tools: [{ googleMaps: { enableWidget: true } }],
        ...(basecampLat && basecampLng
          ? {
              toolConfig: {
                retrievalConfig: {
                  latLng: {
                    latitude: basecampLat,
                    longitude: basecampLng,
                  },
                },
              },
            }
          : {}),
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Grounding API error: ${response.status} - ${errorData.error?.message || 'Unknown'}`,
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';
    const groundingMetadata = data.choices[0]?.groundingMetadata || {};
    const groundingChunks = groundingMetadata.groundingChunks || [];

    // Extract structured place data from grounding chunks
    const placeData = {
      name: placeName,
      address: placeAddress,
      enrichedInfo: aiResponse,
      googleMapsUrl: groundingChunks[0]?.web?.uri || null,
      verification: groundingChunks.length > 0 ? 'verified_by_google' : 'unverified',
      lastUpdated: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        success: true,
        placeData,
        groundingSources: groundingChunks.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Place grounding error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
