import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[JOIN-TRIP] ${step}${detailsStr}`);
};

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

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

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep('ERROR: No authorization header');
      return new Response(JSON.stringify({ success: false, message: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      logStep('ERROR: User authentication failed', { error: userError?.message });
      return new Response(JSON.stringify({ success: false, message: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = userData.user;
    logStep('User authenticated', { userId: user.id, email: user.email });

    // Get invite code from request
    const { inviteCode } = await req.json();
    if (!inviteCode) {
      logStep('ERROR: No invite code provided');
      return new Response(JSON.stringify({ success: false, message: 'Invite code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Processing invite code', { inviteCode });

    // Fetch invite data from database
    const { data: invite, error: inviteError } = await supabaseClient
      .from('trip_invites')
      .select('*')
      .eq('code', inviteCode)
      .single();

    if (inviteError || !invite) {
      logStep('ERROR: Invite not found', { error: inviteError?.message });
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Invalid invite link. This invite may have been deleted or never existed.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    logStep('Invite found', { tripId: invite.trip_id, isActive: invite.is_active });

    // Validate invite is active
    if (!invite.is_active) {
      logStep('ERROR: Invite is not active');
      return new Response(
        JSON.stringify({
          success: false,
          message: 'This invite link has been deactivated by the trip organizer.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate invite hasn't expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      logStep('ERROR: Invite has expired', { expiresAt: invite.expires_at });
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'This invite link has expired. Please request a new one from the trip organizer.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate max uses hasn't been reached
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      logStep('ERROR: Max uses reached', {
        currentUses: invite.current_uses,
        maxUses: invite.max_uses,
      });
      return new Response(
        JSON.stringify({
          success: false,
          message:
            'This invite link has reached its maximum number of uses. Please request a new one.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseClient
      .from('trip_members')
      .select('id')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', user.id)
      .single();

    if (existingMember) {
      logStep('User already a member', { tripId: invite.trip_id });

      // Get trip details for redirect
      const { data: trip } = await supabaseClient
        .from('trips')
        .select('name, trip_type')
        .eq('id', invite.trip_id)
        .single();

      return new Response(
        JSON.stringify({
          success: true,
          already_member: true,
          trip_id: invite.trip_id,
          trip_name: trip?.name || 'Trip',
          trip_type: trip?.trip_type || 'consumer',
          message: "You're already a member of this trip!",
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get trip details
    const { data: trip, error: tripError } = await supabaseClient
      .from('trips')
      .select('name, trip_type, created_by')
      .eq('id', invite.trip_id)
      .single();

    if (tripError || !trip) {
      logStep('ERROR: Trip not found', { error: tripError?.message });
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Trip not found. It may have been deleted.',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    logStep('Trip found', { tripName: trip.name, tripType: trip.trip_type });

    // Check if invite requires approval
    const requiresApproval = invite.require_approval || false;

    if (requiresApproval) {
      // Get requester profile FIRST to capture name at request time
      // This is critical for displaying the correct name in the Requests tab
      // Note: email column was moved to private_profiles table, use auth user email instead
      const { data: requesterProfile } = await supabaseClient
        .from('profiles')
        .select('display_name, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      // Build requester name with multiple fallbacks
      let requesterName = requesterProfile?.display_name;
      if (!requesterName && requesterProfile) {
        if (requesterProfile.first_name && requesterProfile.last_name) {
          requesterName = `${requesterProfile.first_name} ${requesterProfile.last_name}`;
        } else if (requesterProfile.first_name) {
          requesterName = requesterProfile.first_name;
        } else if (requesterProfile.last_name) {
          requesterName = requesterProfile.last_name;
        }
      }
      // Email is always from auth user (profiles table no longer has email column)
      requesterName = requesterName || user.email || 'Someone';
      const requesterEmail = user.email;

      logStep('Requester profile captured', { requesterName, requesterEmail });

      // Create join request with requester info stored directly
      const { data: joinRequest, error: requestError } = await supabaseClient
        .from('trip_join_requests')
        .insert({
          trip_id: invite.trip_id,
          user_id: user.id,
          invite_code: inviteCode,
          status: 'pending',
          requester_name: requesterName,
          requester_email: requesterEmail,
        })
        .select('id')
        .single();

      if (requestError) {
        // Check if request already exists
        if (requestError.code === '23505') {
          logStep('Join request already exists');
          return new Response(
            JSON.stringify({
              success: true,
              requires_approval: true,
              trip_id: invite.trip_id,
              trip_name: trip.name,
              trip_type: trip.trip_type,
              message: 'Your join request is pending approval from the trip organizer.',
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }

        logStep('ERROR: Failed to create join request', { error: requestError.message });
        return new Response(
          JSON.stringify({
            success: false,
            message: 'Failed to submit join request. Please try again.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      logStep('Join request created successfully', { requestId: joinRequest?.id });

      // Note: requesterName and requesterEmail were already captured above
      // when we created the join request - no need to fetch profile again

      // Determine notification recipients based on trip type
      let recipientIds: string[] = [];

      if (trip.trip_type === 'pro' || trip.trip_type === 'event') {
        // Pro/Event trips: Notify trip creator + all admins
        recipientIds = [trip.created_by];

        const { data: admins } = await supabaseClient
          .from('trip_admins')
          .select('user_id')
          .eq('trip_id', invite.trip_id);

        if (admins && admins.length > 0) {
          const adminUserIds = admins.map(a => a.user_id);
          recipientIds = [...new Set([...recipientIds, ...adminUserIds])];
        }
        logStep('Pro/Event trip: Notifying creator + admins', { count: recipientIds.length });
      } else {
        // Consumer trips (My Trips): Notify ALL current trip members
        const { data: members } = await supabaseClient
          .from('trip_members')
          .select('user_id')
          .eq('trip_id', invite.trip_id);

        if (members && members.length > 0) {
          recipientIds = members.map(m => m.user_id);
        } else {
          // Fallback to just creator if no members found
          recipientIds = [trip.created_by];
        }
        logStep('Consumer trip: Notifying all members', { count: recipientIds.length });
      }

      // Create notifications for all recipients
      const notificationPromises = recipientIds.map(recipientId =>
        supabaseClient.from('notifications').insert({
          user_id: recipientId,
          title: `${requesterName} wants to join ${trip.name}`,
          message: 'Tap to approve or reject their request',
          type: 'join_request',
          trip_id: invite.trip_id,
          metadata: {
            trip_id: invite.trip_id,
            trip_name: trip.name,
            requester_id: user.id,
            requester_name: requesterName,
            request_id: joinRequest?.id,
          },
        }),
      );

      const notificationResults = await Promise.allSettled(notificationPromises);
      const successCount = notificationResults.filter(r => r.status === 'fulfilled').length;
      logStep('Notifications created', { total: recipientIds.length, success: successCount });

      return new Response(
        JSON.stringify({
          success: true,
          requires_approval: true,
          trip_id: invite.trip_id,
          trip_name: trip.name,
          trip_type: trip.trip_type,
          message: 'Join request submitted! The trip organizer will review your request.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // No approval required - add user directly to trip_members
    const { error: memberError } = await supabaseClient.from('trip_members').insert({
      trip_id: invite.trip_id,
      user_id: user.id,
      role: 'member',
    });

    if (memberError) {
      logStep('ERROR: Failed to add member', { error: memberError.message });
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Failed to join trip. Please try again.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    logStep('Member added successfully');

    // Increment invite usage counter
    const { error: updateError } = await supabaseClient
      .from('trip_invites')
      .update({
        current_uses: invite.current_uses + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateError) {
      logStep('WARNING: Failed to update invite usage counter', { error: updateError.message });
      // Non-critical error, don't fail the request
    }

    logStep('Join successful', {
      tripId: invite.trip_id,
      userId: user.id,
      newUsageCount: invite.current_uses + 1,
    });

    return new Response(
      JSON.stringify({
        success: true,
        trip_id: invite.trip_id,
        trip_name: trip.name,
        trip_type: trip.trip_type,
        message: `Successfully joined ${trip.name}!`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in join-trip', { message: errorMessage });
    return new Response(
      JSON.stringify({
        success: false,
        message: 'An unexpected error occurred. Please try again.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
