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

    const url = new URL(req.url);
    const trip_id = url.pathname.split('/').pop();
    const tag = url.searchParams.get('tag');
    const sender_id = url.searchParams.get('sender_id');

    if (!trip_id) {
      throw new Error('Missing trip_id in URL path');
    }

    // Verify user is a member of the trip
    const { data: membership, error: membershipError } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', trip_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      throw new Error('User is not a member of this trip');
    }

    // Build query for broadcasts
    let query = supabase
      .from('broadcasts')
      .select(`
        *,
        reactions:broadcast_reactions(*)
      `)
      .eq('trip_id', trip_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (tag && ['chill', 'logistics', 'urgent'].includes(tag)) {
      query = query.eq('tag', tag);
    }

    if (sender_id) {
      query = query.eq('sender_id', sender_id);
    }

    const { data: broadcasts, error: broadcastsError } = await query;

    if (broadcastsError) {
      console.error('Error fetching broadcasts:', broadcastsError);
      throw new Error('Failed to fetch broadcasts');
    }

    // Process broadcasts to include reaction counts and user's reaction
    const processedBroadcasts = broadcasts?.map(broadcast => {
      const reactions = broadcast.reactions || [];
      
      const counts = {
        coming: reactions.filter((r: any) => r.reaction_type === 'coming').length,
        wait: reactions.filter((r: any) => r.reaction_type === 'wait').length,
        cant: reactions.filter((r: any) => r.reaction_type === 'cant').length,
      };

      const userReaction = reactions.find((r: any) => r.user_id === user.id);

      return {
        ...broadcast,
        reaction_counts: counts,
        user_reaction: userReaction?.reaction_type || null,
        reactions: undefined, // Remove raw reactions from response
      };
    });

    return new Response(
      JSON.stringify({ 
        broadcasts: processedBroadcasts || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in broadcasts-fetch function:', error);
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