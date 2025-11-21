import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (req.method === 'POST') {
      const body = await req.json();
      const { content, send_at, trip_id, user_id, priority } = body;
      if (!content || !send_at || !user_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase.from('scheduled_messages').insert({
        id: crypto.randomUUID(),
        content,
        send_at,
        trip_id,
        user_id,
        priority,
      });

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Poll for due messages
    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from('scheduled_messages')
      .select('*')
      .lte('send_at', now);

    if (error) throw error;

    for (const msg of due ?? []) {
      await supabase.from('messages').insert({
        content: msg.content,
        trip_id: msg.trip_id,
        user_id: msg.user_id,
        priority: msg.priority,
      });
      await supabase.from('scheduled_messages').delete().eq('id', msg.id);
    }

    return new Response(JSON.stringify({ processed: due?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
