import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find events starting in the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const { data: upcomingEvents, error } = await supabase
      .from('trip_events')
      .select(`
        id,
        trip_id,
        title,
        description,
        location,
        start_time,
        created_by,
        trips (
          name,
          trip_members (
            user_id
          )
        )
      `)
      .gte('start_time', now.toISOString())
      .lte('start_time', tomorrow.toISOString())
      .eq('include_in_itinerary', true);

    if (error) throw error;

    console.log(`Found ${upcomingEvents?.length || 0} upcoming events`);

    const notifications = [];
    for (const event of upcomingEvents || []) {
      // Type assertion for nested join result
      const trips = event.trips as any;
      const tripMembers = trips?.trip_members || [];
      
      for (const member of tripMembers) {
        // In production, this would send push notifications
        // For now, we just log the notification
        console.log(`Reminder: Event "${event.title}" for user ${member.user_id} at ${event.start_time}`);
        
        notifications.push({
          user_id: member.user_id,
          event_id: event.id,
          event_title: event.title,
          start_time: event.start_time
        });
      }
    }

    console.log(`Queued ${notifications.length} event reminders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_queued: notifications.length,
        notifications 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending event reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
