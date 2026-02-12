import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSecureResponse, createErrorResponse, createOptionsResponse } from "../_shared/securityHeaders.ts";
import { AIAnswerSchema, validateInput } from "../_shared/validation.ts";
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!LOVABLE_API_KEY) {
      return createErrorResponse('Service configuration error', 500);
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authentication required', 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Validate and sanitize input
    const requestBody = await req.json();
    const validation = validateInput(AIAnswerSchema, requestBody);
    
    if (!validation.success) {
      logError('AI_ANSWER_VALIDATION', validation.error, { userId: user.id });
      return createErrorResponse(validation.error, 400);
    }

    const { query, tripId, chatHistory = [] } = validation.data;

    // Check if user is member of trip
    const { data: membership } = await supabase
      .from('trip_members')
      .select('*')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this trip' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch trip context directly from database for better results
    const { data: tripContext } = await supabase.rpc('get_trip_context', {
      p_trip_id: tripId
    });

    // Build context string from trip data
    const contextString = buildContextString(tripContext);

    // Prepare system prompt with trip context
    const systemPrompt = `You are Chravel's AI Concierge — a world-class travel expert with access to this trip's data AND broad travel knowledge.

Context from this trip:
${contextString}

Instructions:
- For questions about THIS trip, answer using the provided context and cite sources (MESSAGE, POLL, BROADCAST, etc.)
- For any other questions, answer freely and helpfully using your knowledge. You are a versatile assistant — answer all topics.
- Be helpful, concise, and actionable
- Suggest practical next steps when appropriate
- Use a friendly, travel-focused tone`;

    // Prepare messages for Gemini
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-6), // Include last 6 messages for context
      { role: 'user', content: query }
    ];

    // Get response from Google Gemini through Lovable Gateway
    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error('Failed to get response from Gemini');
    }

    const geminiData = await geminiResponse.json();
    const answer = geminiData.choices[0].message.content;

    // Log the query
    await supabase.from('ai_queries').insert({
      trip_id: tripId,
      user_id: user.id,
      query_text: query,
      response_text: answer,
      source_count: 0 // No embeddings-based search anymore
    });

    // Generate simple citations from context
    const citations = generateCitations(tripContext);

    return new Response(
      JSON.stringify({ 
        answer,
        citations,
        contextUsed: citations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logError('AI_ANSWER', error);
    return new Response(
      JSON.stringify({ error: sanitizeErrorForClient(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildContextString(tripContext: any): string {
  if (!tripContext) return 'No context available';
  
  let context = '';
  
  // Add messages
  if (tripContext.messages?.length) {
    context += '\n\nRECENT MESSAGES:\n';
    tripContext.messages.slice(-10).forEach((msg: any) => {
      context += `- ${msg.author}: ${msg.content}\n`;
    });
  }
  
  // Add calendar events
  if (tripContext.calendar?.length) {
    context += '\n\nUPCOMING EVENTS:\n';
    tripContext.calendar.slice(0, 5).forEach((event: any) => {
      context += `- ${event.title} on ${event.date}\n`;
    });
  }
  
  // Add places
  if (tripContext.places?.length) {
    context += '\n\nSAVED PLACES:\n';
    tripContext.places.slice(0, 5).forEach((place: any) => {
      context += `- ${place.name} at ${place.address}\n`;
    });
  }
  
  return context || 'No specific context available';
}

function generateCitations(tripContext: any): any[] {
  const citations = [];
  
  if (tripContext?.messages?.length) {
    citations.push({
      doc_id: 'messages',
      source: 'MESSAGE',
      source_id: 'recent_messages',
      snippet: `${tripContext.messages.length} recent messages`
    });
  }
  
  if (tripContext?.calendar?.length) {
    citations.push({
      doc_id: 'calendar',
      source: 'CALENDAR',
      source_id: 'events',
      snippet: `${tripContext.calendar.length} calendar events`
    });
  }
  
  return citations.slice(0, 5);
}