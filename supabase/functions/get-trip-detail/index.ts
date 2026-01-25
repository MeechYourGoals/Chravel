import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { logError } from '../_shared/errorHandling.ts';

type TripDetailErrorCode = 'AUTH_REQUIRED' | 'TRIP_NOT_FOUND' | 'ACCESS_DENIED' | 'BAD_REQUEST';

type TripRow = {
  id: string;
  created_by: string;
  [key: string]: unknown;
};

type TripDetailResponse =
  | {
      success: true;
      trip: TripRow;
    }
  | {
      success: false;
      error: string;
      error_code: TripDetailErrorCode;
    };

const SUPER_ADMIN_EMAILS = ['ccamechi@gmail.com'];

const buildResponse = (
  payload: TripDetailResponse,
  status: number,
  corsHeaders: Record<string, string>,
) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return buildResponse(
        { success: false, error: 'Authentication required', error_code: 'AUTH_REQUIRED' },
        401,
        corsHeaders,
      );
    }

    const body = req.method === 'POST' ? await req.json() : {};
    const tripId = body.tripId ?? new URL(req.url).searchParams.get('tripId');

    if (!tripId || typeof tripId !== 'string') {
      return buildResponse(
        { success: false, error: 'tripId is required', error_code: 'BAD_REQUEST' },
        400,
        corsHeaders,
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );

    if (authError || !authData?.user) {
      return buildResponse(
        { success: false, error: 'Authentication required', error_code: 'AUTH_REQUIRED' },
        401,
        corsHeaders,
      );
    }

    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !trip) {
      return buildResponse(
        { success: false, error: 'Trip not found', error_code: 'TRIP_NOT_FOUND' },
        404,
        corsHeaders,
      );
    }

    const userEmail = authData.user.email?.toLowerCase().trim() ?? '';
    const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(userEmail);
    const tripRow = trip as TripRow;
    const isCreator = tripRow.created_by === authData.user.id;

    const { data: membership } = await supabaseAdmin
      .from('trip_members')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if ((isSuperAdmin || isCreator) && !membership) {
      const { error: upsertError } = await supabaseAdmin.from('trip_members').upsert(
        {
          trip_id: tripId,
          user_id: authData.user.id,
          role: 'admin',
          status: 'active',
        },
        { onConflict: 'trip_id,user_id' },
      );

      if (upsertError) {
        logError('GET_TRIP_DETAIL_MEMBERSHIP_UPSERT', upsertError, {
          tripId,
          userId: authData.user.id,
        });
      }
    }

    if (isSuperAdmin || isCreator || membership) {
      return buildResponse({ success: true, trip: tripRow }, 200, corsHeaders);
    }

    return buildResponse(
      { success: false, error: 'Access denied', error_code: 'ACCESS_DENIED' },
      403,
      corsHeaders,
    );
  } catch (error) {
    logError('GET_TRIP_DETAIL', error);
    return buildResponse(
      { success: false, error: 'Unexpected error', error_code: 'BAD_REQUEST' },
      500,
      corsHeaders,
    );
  }
});
