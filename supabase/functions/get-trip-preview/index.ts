import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { DEMO_TRIPS, getDemoTripType } from '../_shared/ogUtils.ts';

type TripPreview = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  trip_type: string | null;
  member_count: number;
  description?: string | null;
};

serve(async (req): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === 'POST' ? await req.json() : {};
    const tripId = body.tripId ?? new URL(req.url).searchParams.get('tripId');

    if (!tripId || typeof tripId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'tripId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Demo trips
    const demo = DEMO_TRIPS[tripId];
    if (demo) {
      const trip: TripPreview = {
        id: tripId,
        name: demo.title,
        destination: demo.location,
        start_date: null,
        end_date: null,
        cover_image_url: demo.coverPhoto,
        trip_type: getDemoTripType(tripId),
        member_count: demo.participantCount,
        description: demo.description,
      };

      return new Response(JSON.stringify({ success: true, trip }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: tripRow, error: tripError } = await supabaseClient
      .from('trips')
      .select(
        'id, name, destination, start_date, end_date, cover_image_url, trip_type, description',
      )
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !tripRow) {
      return new Response(JSON.stringify({ success: false, error: 'Trip not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { count: memberCount } = await supabaseClient
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    const trip: TripPreview = {
      id: tripRow.id,
      name: tripRow.name,
      destination: tripRow.destination,
      start_date: tripRow.start_date,
      end_date: tripRow.end_date,
      cover_image_url: tripRow.cover_image_url,
      trip_type: tripRow.trip_type,
      member_count: memberCount ?? 0,
      description: tripRow.description,
    };

    return new Response(JSON.stringify({ success: true, trip }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
