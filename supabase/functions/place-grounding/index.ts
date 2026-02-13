import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { invokeChatModel, extractTextFromChatResponse } from '../_shared/gemini.ts';

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Call Gemini directly with Lovable fallback enabled in shared client.
    const aiResult = await invokeChatModel({
      model: 'gemini-3-flash-preview',
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
      maxTokens: 1000,
      timeoutMs: 30000,
    });

    const data = aiResult.raw;
    const aiResponse = extractTextFromChatResponse(data, aiResult.provider);
    const groundingMetadata =
      aiResult.provider === 'gemini'
        ? data?.candidates?.[0]?.groundingMetadata || {}
        : data?.choices?.[0]?.groundingMetadata || {};
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
