import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, tripId, limit = 16 } = await req.json();

    if (!query || !tripId) {
      return new Response(JSON.stringify({ error: 'Query and tripId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is member of trip
    const { data: membership } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Not a member of this trip' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all trip data for semantic search
    const { data: tripData } = await supabase.rpc('get_trip_search_data', {
      p_trip_id: tripId,
    });

    if (!tripData) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Gemini to perform intelligent search across trip data
    const searchPrompt = `Given this search query: "${query}"

Trip data:
${JSON.stringify(tripData, null, 2)}

Find and rank the most relevant items from the trip data. Return results as JSON array:
{
  "results": [
    {
      "id": "item_id",
      "objectType": "message|calendar_event|file|place|receipt",
      "content": "relevant content",
      "snippet": "brief excerpt",
      "score": 0.95,
      "matchReason": "why this matches"
    }
  ]
}

Return up to ${limit} results, ranked by relevance.`;

    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              'You are a search assistant. Analyze trip data and return the most relevant results for user queries. Always return valid JSON.',
          },
          {
            role: 'user',
            content: searchPrompt,
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error('Search failed');
    }

    const geminiData = await geminiResponse.json();
    const searchResults = JSON.parse(geminiData.choices[0].message.content);

    // Format search results
    const results = (searchResults.results || []).map((result: any) => ({
      id: result.id || crypto.randomUUID(),
      objectType: result.objectType || 'message',
      objectId: result.id || '',
      tripId: tripId,
      tripName: 'Current Trip',
      content: result.content || '',
      snippet: result.snippet || result.content?.slice(0, 200) || '',
      score: result.score || 0.7,
      deepLink: `#${result.objectType}`,
      matchReason: result.matchReason || 'Content match',
      metadata: result.metadata || {},
    }));

    // Log the query for analytics
    await supabase.from('ai_queries').insert({
      trip_id: tripId,
      user_id: user.id,
      query_text: query,
      source_count: results.length,
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-search function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', results: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
