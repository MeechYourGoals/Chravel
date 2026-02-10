import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { action, tripId, userId, eventData } = await req.json();

    if (!action || !tripId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'create_event':
        return await createEvent(supabase, tripId, userId, eventData);
      case 'get_events':
        return await getEvents(supabase, tripId);
      case 'update_event':
        return await updateEvent(supabase, eventData);
      case 'delete_event':
        return await deleteEvent(supabase, eventData.eventId);
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error in calendar-sync function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createEvent(supabase: any, tripId: string, userId: string, eventData: any) {
  const { data: eventRecord, error } = await supabase
    .from('trip_events')
    .insert({
      trip_id: tripId,
      title: eventData.title,
      description: eventData.description || null,
      start_time: eventData.start_time,
      end_time: eventData.end_time || null,
      location: eventData.location || null,
      created_by: userId,
      metadata: eventData.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }

  return new Response(JSON.stringify({ success: true, event: eventRecord }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getEvents(supabase: any, tripId: string) {
  const { data: events, error } = await supabase
    .from('trip_events')
    .select(
      `
      *,
      event_attendees(
        user_id,
        attendance_status,
        rsvp_time
      )
    `,
    )
    .eq('trip_id', tripId)
    .order('start_time', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch events: ${error.message}`);
  }

  return new Response(JSON.stringify({ success: true, events }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function updateEvent(supabase: any, eventData: any) {
  const { data: eventRecord, error } = await supabase
    .from('trip_events')
    .update({
      title: eventData.title,
      description: eventData.description,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      location: eventData.location,
      metadata: eventData.metadata,
    })
    .eq('id', eventData.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }

  return new Response(JSON.stringify({ success: true, event: eventRecord }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function deleteEvent(supabase: any, eventId: string) {
  const { error } = await supabase.from('trip_events').delete().eq('id', eventId);

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
