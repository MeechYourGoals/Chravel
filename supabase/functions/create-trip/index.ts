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

    const { name, description, destination, start_date, end_date, trip_type, cover_image_url, enabled_features } = validation.data;

    // TEST ACCOUNT BYPASS: Grant full access for development testing
    const TEST_ACCOUNTS = ['ccamechi@gmail.com'];
    const isTestAccount = user.email && TEST_ACCOUNTS.includes(user.email.toLowerCase());
    
    // Track whether user is using free trial (for incrementing counter after creation)
    let isUsingFreeTrial = false;
    let profileData: { free_pro_trips_used?: number; free_pro_trip_limit?: number } | null = null;

    // FREE PRO TRIP TRIAL: Allow one free Pro trip per user
    if ((trip_type === 'pro' || trip_type === 'event') && !isTestAccount) {
      // Check if user has an active Pro subscription
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'pro')
        .single();

      // If no Pro subscription, check free trial quota
      if (!roleData) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('free_pro_trips_used, free_pro_trip_limit')
          .eq('user_id', user.id)
          .single();

        profileData = profile;
        const used = profile?.free_pro_trips_used || 0;
        const limit = profile?.free_pro_trip_limit || 1;

        if (used >= limit) {
          console.log(`Free Pro trip trial exhausted for user ${user.id}: ${used}/${limit}`);
          return new Response(
            JSON.stringify({ 
              error: 'You have used your free Pro trip. Subscribe to Pro to create more professional trips.',
              free_trial_exhausted: true
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mark that we're using the free trial
        isUsingFreeTrial = true;
        console.log(`User ${user.id} creating Pro trip using free trial (${used + 1}/${limit})`);
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
        created_by: user.id,
        // ✅ Phase 2: Store enabled features for Pro/Event trips
        // Consumer trips ignore this column and always have all features
        enabled_features: enabled_features || ['chat', 'calendar', 'concierge', 'media', 'payments', 'places', 'polls', 'tasks']
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

    // Increment free trial usage counter if using free trial
    if (isUsingFreeTrial) {
      const currentUsed = profileData?.free_pro_trips_used || 0;
      await supabase
        .from('profiles')
        .update({ free_pro_trips_used: currentUsed + 1 })
        .eq('user_id', user.id);
      console.log(`Free Pro trip trial counter incremented for user ${user.id}: ${currentUsed + 1}`);
    }

    console.log(`Trip created: ${trip.id} by user ${user.id}`);

    return new Response(
      JSON.stringify({ success: true, trip, used_free_trial: isUsingFreeTrial }),
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
