import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { getCorsHeaders } from '../_shared/cors.ts';

// Security model:
// 1. requireAuth validates the caller's JWT — no unauthenticated access
// 2. userId is derived from auth.user.id, NEVER from the request body
//    (accepting userId from the body with service_role would allow any
//    authenticated caller to create/modify events attributed to any user)
// 3. Trip membership is verified before every mutating action
// 4. service_role is only used after auth + membership checks pass

serve(async req => {
  const { createOptionsResponse } = await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  const headers = getCorsHeaders(req);

  try {
    // Auth gate: derive userId from the verified JWT, not from the request body
    const { requireAuth } = await import('../_shared/requireAuth.ts');
    const auth = await requireAuth(req, headers);
    if (auth.response) return auth.response;
    const { user } = auth;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    const { action, tripId, eventData } = body as {
      action?: string;
      tripId?: string;
      eventData?: Record<string, unknown>;
    };

    if (!action || !tripId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // Trip membership check — required for all actions (read and write)
    const { data: membership } = await supabase
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      console.warn('[calendar-sync] Access denied: user', user.id, 'not member of trip', tripId);
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'create_event':
        return await createEvent(supabase, tripId, user.id, eventData, headers);
      case 'get_events':
        return await getEvents(supabase, tripId, headers);
      case 'update_event':
        return await updateEvent(supabase, eventData, tripId, user.id, headers);
      case 'delete_event':
        return await deleteEvent(
          supabase,
          (eventData as { eventId: string })?.eventId,
          tripId,
          headers,
        );
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('[calendar-sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

async function createEvent(
  supabase: any, // intentional: bypass deep SupabaseClient generic inference (TS2345)
  tripId: string,
  userId: string,
  eventData: Record<string, unknown> | undefined,
  headers: Record<string, string>,
) {
  if (!eventData) {
    return new Response(JSON.stringify({ error: 'Missing eventData' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const { data: eventRecord, error } = await supabase
    .from('trip_events')
    .insert({
      trip_id: tripId,
      title: eventData.title,
      description: eventData.description || null,
      start_time: eventData.start_time,
      end_time: eventData.end_time || null,
      location: eventData.location || null,
      created_by: userId, // always from verified JWT, never from request body
      metadata: eventData.metadata || {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }

  return new Response(JSON.stringify({ success: true, event: eventRecord }), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function getEvents(
  supabase: ReturnType<typeof createClient>,
  tripId: string,
  headers: Record<string, string>,
) {
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
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function updateEvent(
  supabase: ReturnType<typeof createClient>,
  eventData: Record<string, unknown> | undefined,
  tripId: string,
  userId: string,
  headers: Record<string, string>,
) {
  if (!eventData?.id) {
    return new Response(JSON.stringify({ error: 'Missing eventData.id' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  // Verify the event belongs to the trip the caller is a member of
  const { data: existingEvent } = await supabase
    .from('trip_events')
    .select('id, trip_id')
    .eq('id', eventData.id)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!existingEvent) {
    console.warn(
      '[calendar-sync] updateEvent: event not found in trip',
      eventData.id,
      tripId,
      'user',
      userId,
    );
    return new Response(JSON.stringify({ error: 'Event not found in this trip' }), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

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
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function deleteEvent(
  supabase: ReturnType<typeof createClient>,
  eventId: string | undefined,
  tripId: string,
  headers: Record<string, string>,
) {
  if (!eventId) {
    return new Response(JSON.stringify({ error: 'Missing eventId' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  // Verify the event belongs to the trip the caller is a member of
  const { data: existingEvent } = await supabase
    .from('trip_events')
    .select('id')
    .eq('id', eventId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!existingEvent) {
    return new Response(JSON.stringify({ error: 'Event not found in this trip' }), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  const { error } = await supabase.from('trip_events').delete().eq('id', eventId);

  if (error) {
    throw new Error(`Failed to delete event: ${error.message}`);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
