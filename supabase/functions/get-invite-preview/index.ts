import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { checkRateLimit } from '../_shared/security.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-INVITE-PREVIEW] ${step}${detailsStr}`);
};

interface InvitePreviewResponse {
  success: boolean;
  invite?: {
    trip_id: string;
    is_active: boolean;
    expires_at: string | null;
    max_uses: number | null;
    current_uses: number;
    require_approval: boolean;
  };
  trip?: {
    name: string;
    destination: string | null;
    start_date: string | null;
    end_date: string | null;
    cover_image_url: string | null;
    trip_type: string | null;
    member_count: number;
  };
  error?: string;
  error_code?: 'INVALID' | 'EXPIRED' | 'INACTIVE' | 'MAX_USES' | 'NOT_FOUND';
}

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    // Create Supabase client with service role for elevated permissions
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Rate limit unauthenticated preview lookups (defense-in-depth against brute force).
    // Note: We intentionally do NOT expose `trip_invites` via public SELECT RLS policies.
    const forwardedFor = req.headers.get('x-forwarded-for');
    const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown';
    const rateLimit = await checkRateLimit(supabaseClient, `invite_preview:${clientIp}`, 120, 60);

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded', error_code: 'INVALID' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get invite code from request body or query params
    let inviteCode: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json();
      inviteCode = body.code;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      inviteCode = url.searchParams.get('code');
    }

    if (!inviteCode) {
      logStep('ERROR: No invite code provided');
      const response: InvitePreviewResponse = {
        success: false,
        error: 'Invite code is required',
        error_code: 'INVALID',
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Looking up invite', { code: inviteCode.substring(0, 8) + '...' });

    // Fetch invite data
    const { data: invite, error: inviteError } = await supabaseClient
      .from('trip_invites')
      .select('*')
      .eq('code', inviteCode)
      .single();

    if (inviteError || !invite) {
      logStep('Invite not found', { error: inviteError?.message });
      const response: InvitePreviewResponse = {
        success: false,
        error: 'This invite link is invalid or has been deleted.',
        error_code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Invite found', { tripId: invite.trip_id, isActive: invite.is_active });

    // Validate invite status
    if (!invite.is_active) {
      logStep('Invite is inactive');
      const response: InvitePreviewResponse = {
        success: false,
        error: 'This invite link has been deactivated.',
        error_code: 'INACTIVE',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      logStep('Invite has expired', { expiresAt: invite.expires_at });
      const response: InvitePreviewResponse = {
        success: false,
        error: 'This invite link has expired. Please ask the organizer for a new link.',
        error_code: 'EXPIRED',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      logStep('Max uses reached', { currentUses: invite.current_uses, maxUses: invite.max_uses });
      const response: InvitePreviewResponse = {
        success: false,
        error: 'This invite link has reached its maximum number of uses.',
        error_code: 'MAX_USES',
      };
      return new Response(JSON.stringify(response), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch trip details
    const { data: trip, error: tripError } = await supabaseClient
      .from('trips')
      .select('id, name, destination, start_date, end_date, cover_image_url, trip_type')
      .eq('id', invite.trip_id)
      .single();

    if (tripError || !trip) {
      logStep('Trip not found', { error: tripError?.message });
      const response: InvitePreviewResponse = {
        success: false,
        error: 'The trip associated with this invite no longer exists.',
        error_code: 'NOT_FOUND',
      };
      return new Response(JSON.stringify(response), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get member count
    const { count: memberCount } = await supabaseClient
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', invite.trip_id);

    logStep('Success', { tripName: trip.name, memberCount });

    const response: InvitePreviewResponse = {
      success: true,
      invite: {
        trip_id: invite.trip_id,
        is_active: invite.is_active,
        expires_at: invite.expires_at,
        max_uses: invite.max_uses,
        current_uses: invite.current_uses,
        require_approval: invite.require_approval || false,
      },
      trip: {
        name: trip.name,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        cover_image_url: trip.cover_image_url,
        trip_type: trip.trip_type,
        member_count: memberCount || 0,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in get-invite-preview', { message: errorMessage });
    const response: InvitePreviewResponse = {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      error_code: 'INVALID',
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
