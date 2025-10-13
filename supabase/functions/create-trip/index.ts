import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";
import { CreateTripSchema, validateInput } from "../_shared/validation.ts";
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize input
    const requestBody = await req.json();
    const validation = validateInput(CreateTripSchema, requestBody);
    
    if (!validation.success) {
      logError('CREATE_TRIP_VALIDATION', validation.error, { userId: user.id });
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, description, destination, start_date, end_date, trip_type, cover_image_url } = validation.data;

    // Check Pro tier access for pro/event trips
    if (trip_type === 'pro' || trip_type === 'event') {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'pro')
        .single();

      if (!roleData) {
        throw new Error('Pro subscription required to create professional trips');
      }
    }

    // Create trip
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        name,
        description,
        destination,
        start_date,
        end_date,
        trip_type: trip_type || 'consumer',
        cover_image_url,
        created_by: user.id
      })
      .select()
      .single();

    if (tripError) throw tripError;

    // Add creator as admin member
    const { error: memberError } = await supabase
      .from('trip_members')
      .insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'admin'
      });

    if (memberError) throw memberError;

    console.log(`Trip created: ${trip.id} by user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, trip }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logError('CREATE_TRIP', error);
    return new Response(
      JSON.stringify({ error: sanitizeErrorForClient(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
