import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_LIVE_MODEL =
  Deno.env.get('GEMINI_LIVE_MODEL') || 'models/gemini-2.5-flash-native-audio-preview-12-2025';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ALLOWED_VOICES = new Set(['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede']);

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const requestedVoice = typeof body?.voice === 'string' ? body.voice : 'Puck';
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : 'Puck';
    const tripId = typeof body?.tripId === 'string' ? body.tripId : undefined;

    // Build trip context for the voice session system instruction
    let systemInstruction = `You are Chravel Concierge, a helpful AI travel assistant. You are speaking with a user via voice. Keep responses conversational, concise, and natural for spoken delivery. Current date: ${new Date().toISOString().split('T')[0]}.`;

    if (tripId) {
      try {
        // Fetch basic trip context for the voice session
        const { data: trip } = await supabase
          .from('trips')
          .select('name, destination, start_date, end_date')
          .eq('id', tripId)
          .single();

        if (trip) {
          systemInstruction += `\n\nThe user is on a trip called "${trip.name}" to ${trip.destination || 'an unspecified destination'}.`;
          if (trip.start_date && trip.end_date) {
            systemInstruction += ` Travel dates: ${trip.start_date} to ${trip.end_date}.`;
          }
        }

        // Fetch upcoming events
        const { data: events } = await supabase
          .from('trip_events')
          .select('title, start_time, location')
          .eq('trip_id', tripId)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5);

        if (events?.length) {
          systemInstruction += `\n\nUpcoming events:`;
          events.forEach((e: any) => {
            systemInstruction += `\n- ${e.title} at ${e.start_time}${e.location ? ` (${e.location})` : ''}`;
          });
        }
      } catch (contextError) {
        console.error('Failed to build voice context:', contextError);
        // Continue with basic system instruction
      }
    }

    systemInstruction += `\n\nVoice guidelines:
- Keep responses under 3 sentences unless the user asks for detail
- Use natural conversational language (no markdown, no links, no formatting)
- Be warm and helpful
- If you don't know something specific to the trip, say so and suggest checking the app`;

    // Return session config for client-side WebSocket connection
    return new Response(
      JSON.stringify({
        apiKey: GEMINI_API_KEY,
        model: GEMINI_LIVE_MODEL,
        systemInstruction,
        voice,
        websocketUrl: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('gemini-voice-session error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
