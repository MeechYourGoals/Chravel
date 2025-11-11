import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  user_id: string;
  trip_id?: string;
  tour_id?: string;
}

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user } } = await supabase.auth.getUser(jwt);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      // Get existing daily digest
      const url = new URL(req.url);
      const userId = url.searchParams.get('user_id');
      const tripId = url.searchParams.get('trip_id');
      const tourId = url.searchParams.get('tour_id');
      const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing user_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let query = supabase
        .from('daily_digests')
        .select('*')
        .eq('user_id', userId)
        .eq('digest_date', date);

      if (tripId) query = query.eq('trip_id', tripId);
      if (tourId) query = query.eq('tour_id', tourId);

      const { data: digest, error } = await query.single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      if (!digest) {
        return new Response(JSON.stringify({ error: 'Digest not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ digest }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      // Generate new daily digest
      const { user_id, trip_id, tour_id }: RequestBody = await req.json();
      if (!user_id) {
        return new Response(JSON.stringify({ error: 'Missing user_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Check if digest already exists for today
      let existingQuery = supabase
        .from('daily_digests')
        .select('id')
        .eq('user_id', user_id)
        .eq('digest_date', today);

      if (trip_id) existingQuery = existingQuery.eq('trip_id', trip_id);
      if (tour_id) existingQuery = existingQuery.eq('tour_id', tour_id);

      const { data: existing } = await existingQuery.single();
      
      if (existing) {
        return new Response(JSON.stringify({ error: 'Digest already exists for today' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch recent messages (last 24 hours)
      let messagesQuery = supabase
        .from('messages')
        .select('content, priority, created_at')
        .eq('user_id', user_id)
        .gt('created_at', since)
        .order('created_at', { ascending: false });

      if (trip_id) messagesQuery = messagesQuery.eq('trip_id', trip_id);
      if (tour_id) messagesQuery = messagesQuery.eq('tour_id', tour_id);

      const { data: messages, error: messagesError } = await messagesQuery;

      if (messagesError) throw messagesError;

      if (!messages || messages.length === 0) {
        return new Response(JSON.stringify({ error: 'No messages found for digest' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Count messages by priority
      const urgentCount = messages.filter(m => m.priority === 'urgent').length;
      const reminderCount = messages.filter(m => m.priority === 'reminder').length;
      const totalCount = messages.length;

      // Generate AI summary
      const openaiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiKey) throw new Error('OPENAI_API_KEY not set');

      const messageTexts = messages.map(m => `[${m.priority?.toUpperCase() || 'FYI'}] ${m.content}`).join('\n');
      const summary = await generateSummary(messageTexts, openaiKey);

      // Store digest in database
      const { data: digest, error: insertError } = await supabase
        .from('daily_digests')
        .insert({
          user_id,
          trip_id,
          tour_id,
          digest_date: today,
          summary,
          message_count: totalCount,
          urgent_count: urgentCount,
          reminder_count: reminderCount,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(JSON.stringify({ digest }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Daily Digest Error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSummary(messageText: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { 
          role: 'system', 
          content: 'Create a concise daily digest summary of the following messages. Focus on key logistics, updates, and action items. Use bullet points. Prioritize urgent items at the top.' 
        },
        { role: 'user', content: messageText },
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI error: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || 'Unable to generate summary.';
}