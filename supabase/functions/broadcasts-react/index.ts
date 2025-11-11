import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    const { broadcast_id, reaction_type } = await req.json();

    if (!broadcast_id || !reaction_type) {
      throw new Error('Missing required fields: broadcast_id, reaction_type');
    }

    if (!['coming', 'wait', 'cant'].includes(reaction_type)) {
      throw new Error('Invalid reaction_type. Must be: coming, wait, or cant');
    }

    // Get user profile for reaction info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', user.id)
      .single();

    const userName = profile?.display_name || user.email?.split('@')[0] || 'Unknown User';

    // Upsert reaction (update if exists, insert if not)
    const { data: reaction, error: reactionError } = await supabase
      .from('broadcast_reactions')
      .upsert({
        broadcast_id,
        user_id: user.id,
        user_name: userName,
        reaction_type,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'broadcast_id,user_id'
      })
      .select()
      .single();

    if (reactionError) {
      console.error('Error creating/updating reaction:', reactionError);
      throw new Error('Failed to save reaction');
    }

    // Get updated reaction counts
    const { data: reactionCounts, error: countsError } = await supabase
      .from('broadcast_reactions')
      .select('reaction_type')
      .eq('broadcast_id', broadcast_id);

    if (countsError) {
      console.error('Error fetching reaction counts:', countsError);
    }

    // Calculate counts
    const counts = {
      coming: reactionCounts?.filter(r => r.reaction_type === 'coming').length || 0,
      wait: reactionCounts?.filter(r => r.reaction_type === 'wait').length || 0,
      cant: reactionCounts?.filter(r => r.reaction_type === 'cant').length || 0,
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        reaction,
        counts
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in broadcasts-react function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});