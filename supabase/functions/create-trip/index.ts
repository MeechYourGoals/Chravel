import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { CreateTripSchema, validateInput } from '../_shared/validation.ts';
import { sanitizeErrorForClient, logError } from '../_shared/errorHandling.ts';

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

    const requestBody = await req.json();
    const validation = validateInput(CreateTripSchema, requestBody);

    if (!validation.success) {
      logError('CREATE_TRIP_VALIDATION', validation.error, { userId: user.id });
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      name,
      description,
      destination,
      start_date,
      end_date,
      trip_type,
      cover_image_url,
      enabled_features,
      card_color,
      organizer_display_name,
    } = validation.data;

    // Get user's subscription tier, taste test usage, and email
    const { data: profile } = await supabase
      .from('profiles')
      .select(
        'subscription_status, subscription_product_id, free_pro_trips_used, free_events_used, free_pro_trip_limit, free_event_limit',
      )
      .eq('user_id', user.id)
      .single();

    // Super admin bypass - ccamechi@gmail.com has unlimited access
    const SUPER_ADMIN_EMAILS = ['ccamechi@gmail.com'];
    const authEmail = user.email?.toLowerCase();
    const isSuperAdmin = authEmail ? SUPER_ADMIN_EMAILS.includes(authEmail) : false;

    if (isSuperAdmin) {
      console.log(`[create-trip] Super admin bypass for: ${authEmail}`);
    } else {
      const subscriptionStatus = profile?.subscription_status;
      const productId = profile?.subscription_product_id;
      const freeProTripsUsed = profile?.free_pro_trips_used || 0;
      const freeEventsUsed = profile?.free_events_used || 0;
      const freeProTripLimit = profile?.free_pro_trip_limit || 1;
      const freeEventLimit = profile?.free_event_limit || 1;

      const isFreeTier = !subscriptionStatus || subscriptionStatus !== 'active' || !productId;

      // Taste test validation for free users creating Pro trips
      if (trip_type === 'pro' && isFreeTier && freeProTripsUsed >= freeProTripLimit) {
        return new Response(
          JSON.stringify({
            error: 'UPGRADE_REQUIRED_PRO_TRIP',
            message: 'Upgrade to create more Pro trips!',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      // Taste test validation for free users creating Events
      if (trip_type === 'event' && isFreeTier && freeEventsUsed >= freeEventLimit) {
        return new Response(
          JSON.stringify({
            error: 'UPGRADE_REQUIRED_EVENT',
            message: 'Upgrade to create unlimited Events!',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
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
        card_color, // Persist selected card color for Pro/Event trips
        organizer_display_name, // Organizer name for Events (e.g., "Los Angeles Rams")
        created_by: user.id,
        enabled_features: enabled_features || [
          'chat',
          'calendar',
          'concierge',
          'media',
          'payments',
          'places',
          'polls',
          'tasks',
        ],
      })
      .select()
      .single();

    if (tripError) throw tripError;

    // Note: Trip creator is automatically added as admin member by the
    // ensure_creator_is_member database trigger - no manual insert needed

    // Increment taste test usage for free users (skip for super admins)
    if (!isSuperAdmin) {
      const subscriptionStatus = profile?.subscription_status;
      const productId = profile?.subscription_product_id;
      const freeProTripsUsed = profile?.free_pro_trips_used || 0;
      const freeEventsUsed = profile?.free_events_used || 0;
      const isFreeTier = !subscriptionStatus || subscriptionStatus !== 'active' || !productId;

      if (isFreeTier && trip_type === 'pro') {
        await supabase
          .from('profiles')
          .update({ free_pro_trips_used: freeProTripsUsed + 1 })
          .eq('user_id', user.id);
      } else if (isFreeTier && trip_type === 'event') {
        await supabase
          .from('profiles')
          .update({ free_events_used: freeEventsUsed + 1 })
          .eq('user_id', user.id);
      }
    }

    console.log(`Trip created: ${trip.id} by user ${user.id}, type: ${trip_type || 'consumer'}`);

    return new Response(JSON.stringify({ success: true, trip }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logError('CREATE_TRIP', error);
    return new Response(JSON.stringify({ error: sanitizeErrorForClient(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
