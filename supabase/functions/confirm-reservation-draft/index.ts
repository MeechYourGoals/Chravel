import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { validateInput, verifyTripMembership } from '../_shared/validation.ts';
import { logError, sanitizeErrorForClient } from '../_shared/errorHandling.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const ReservationDraftSchema = z.object({
  draft: z.object({
    id: z.string().min(1),
    tripId: z.string().min(1),
    placeId: z.string().nullable().optional(),
    placeName: z.string().min(1),
    address: z.string().optional().default(''),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    phone: z.string().nullable().optional(),
    websiteUrl: z.string().nullable().optional(),
    bookingUrl: z.string().nullable().optional(),
    startTimeISO: z.string().nullable().optional(),
    partySize: z.number().min(1).max(100).optional().default(2),
    reservationName: z.string().optional().default(''),
    notes: z.string().optional().default(''),
  }),
});

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate input
    const body = await req.json();
    const validation = validateInput(ReservationDraftSchema, body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { draft } = validation.data;

    // Verify trip membership
    const membership = await verifyTripMembership(supabase, user.id, draft.tripId);
    if (!membership.isMember) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - you must be a member of this trip' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Build booking details string for the task description
    const detailLines: string[] = [];
    if (draft.startTimeISO) {
      const dt = new Date(draft.startTimeISO);
      detailLines.push(
        `Date/Time: ${dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at ${dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
      );
    }
    if (draft.partySize) detailLines.push(`Party size: ${draft.partySize}`);
    if (draft.reservationName) detailLines.push(`Name: ${draft.reservationName}`);
    if (draft.address) detailLines.push(`Address: ${draft.address}`);
    if (draft.phone) detailLines.push(`Phone: ${draft.phone}`);
    if (draft.bookingUrl || draft.websiteUrl) {
      detailLines.push(`Booking: ${draft.bookingUrl || draft.websiteUrl}`);
    }
    if (draft.notes) detailLines.push(`Notes: ${draft.notes}`);

    const taskDescription = detailLines.join('\n');

    // Create calendar event + task in parallel
    const calendarStartTime = draft.startTimeISO
      ? new Date(draft.startTimeISO).toISOString()
      : new Date().toISOString();
    const calendarEndTime = draft.startTimeISO
      ? new Date(new Date(draft.startTimeISO).getTime() + 2 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const [calendarResult, taskResult] = await Promise.all([
      // Calendar event
      supabase
        .from('trip_events')
        .insert({
          trip_id: draft.tripId,
          title: `Reservation: ${draft.placeName}`,
          start_time: calendarStartTime,
          end_time: calendarEndTime,
          location: draft.address || draft.placeName,
          description: taskDescription,
          created_by: user.id,
        })
        .select()
        .single(),

      // Task: "Book reservation: <placeName>"
      supabase
        .from('trip_tasks')
        .insert({
          trip_id: draft.tripId,
          title: `Book reservation: ${draft.placeName}`,
          description: taskDescription,
          creator_id: user.id,
        })
        .select()
        .single(),
    ]);

    if (calendarResult.error) {
      console.error('[confirm-reservation-draft] Calendar insert failed:', calendarResult.error);
    }
    if (taskResult.error) {
      console.error('[confirm-reservation-draft] Task insert failed:', taskResult.error);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        calendarEventId: calendarResult.data?.id || null,
        taskId: taskResult.data?.id || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    logError('CONFIRM_RESERVATION_DRAFT', error);
    return new Response(JSON.stringify({ error: sanitizeErrorForClient(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
