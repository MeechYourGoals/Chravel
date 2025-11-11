import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This function should only be called by cron/scheduled tasks
    // In production, you might want to add authentication for this endpoint
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete locations older than 48 hours
    const { data, error } = await supabase
      .from('realtime_locations')
      .delete()
      .lt('updated_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .select();

    if (error) {
      console.error('Error deleting stale locations:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to delete stale locations' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deletedCount = Array.isArray(data) ? data.length : 0;
    console.log(`Deleted ${deletedCount} stale location records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedCount,
        message: 'Stale locations cleaned up successfully' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-stale-locations function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});