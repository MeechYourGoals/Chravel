import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[JOIN-TRIP] ${step}${detailsStr}`);
};

/**
 * Error codes for join-trip failures.
 * These map to the InviteErrorCode type in the frontend for targeted CTAs.
 */
type JoinTripErrorCode =
  | 'AUTH_REQUIRED'
  | 'AUTH_EXPIRED'
  | 'INVALID_LINK'
  | 'INVITE_NOT_FOUND'
  | 'INVITE_EXPIRED'
  | 'INVITE_INACTIVE'
  | 'INVITE_MAX_USES'
  | 'TRIP_NOT_FOUND'
  | 'TRIP_ARCHIVED'
  | 'TRIP_FULL'
  | 'APPROVAL_PENDING'
  | 'ALREADY_MEMBER'
  | 'UNKNOWN_ERROR';

function createJsonResponse(data: unknown, status: number, corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  message: string,
  status: number,
  corsHeaders: HeadersInit,
  errorCode?: JoinTripErrorCode,
): Response {
  return createJsonResponse(
    { success: false, message, error_code: errorCode },
    status,
    corsHeaders,
  );
}

function successResponse(data: Record<string, unknown>, corsHeaders: HeadersInit): Response {
  return createJsonResponse({ success: true, ...data }, 200, corsHeaders);
}

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
      return errorResponse(
        'You need to sign in to join this trip.',
        401,
        corsHeaders,
        'AUTH_REQUIRED',
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      logStep('ERROR: User authentication failed', { error: userError?.message });
      return errorResponse(
        'Your session has expired. Please sign in again.',
        401,
        corsHeaders,
        'AUTH_EXPIRED',
      );
    }

    const user = userData.user;
    logStep('User authenticated', { userId: user.id, email: user.email });

    // Get invite code from request
    const { inviteCode } = await req.json();
    if (!inviteCode) {
      logStep('ERROR: No invite code provided');
      return errorResponse(
        'This invite link appears to be malformed.',
        400,
        corsHeaders,
        'INVALID_LINK',
      );
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
      return errorResponse(
        'This invite link is invalid or has been deleted. Ask the host for a new link.',
        404,
        corsHeaders,
        'INVITE_NOT_FOUND',
      );
    }

    logStep('Invite found', { tripId: invite.trip_id, isActive: invite.is_active });

    // Validate invite is active
    if (!invite.is_active) {
      logStep('ERROR: Invite is not active');
      return errorResponse(
        'The host has turned off this invite link. Contact them for a new one.',
        403,
        corsHeaders,
        'INVITE_INACTIVE',
      );
    }

    // Validate invite hasn't expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      logStep('ERROR: Invite has expired', { expiresAt: invite.expires_at });
      return errorResponse(
        'This invite link has expired. Ask the host for a fresh link.',
        403,
        corsHeaders,
        'INVITE_EXPIRED',
      );
    }

    // Validate max uses hasn't been reached
    if (invite.max_uses && invite.current_uses >= invite.max_uses) {
      logStep('ERROR: Max uses reached', {
        currentUses: invite.current_uses,
        maxUses: invite.max_uses,
      });
      return errorResponse(
        'This invite link has been used the maximum number of times. Ask the host for a new link.',
        403,
        corsHeaders,
        'INVITE_MAX_USES',
      );
    }

    // Check if user is already an active member (exclude status=left for re-join)
    const { data: existingMember } = await supabaseClient
      .from('trip_members')
      .select('id')
      .eq('trip_id', invite.trip_id)
      .eq('user_id', user.id)
      .or('status.is.null,status.eq.active')
      .maybeSingle();

    if (existingMember) {
      logStep('User already a member', { tripId: invite.trip_id });

      // Get trip details for redirect
      const { data: trip } = await supabaseClient
        .from('trips')
        .select('name, trip_type')
        .eq('id', invite.trip_id)
        .single();

      return successResponse(
        {
          already_member: true,
          trip_id: invite.trip_id,
          trip_name: trip?.name || 'Trip',
          trip_type: trip?.trip_type || 'consumer',
          message: "You're already a member of this trip!",
        },
        corsHeaders,
      );
    }

    // Get trip details including archive status
    const { data: trip, error: tripError } = await supabaseClient
      .from('trips')
      .select('name, trip_type, created_by, is_archived')
      .eq('id', invite.trip_id)
      .single();

    if (tripError || !trip) {
      logStep('ERROR: Trip not found', { error: tripError?.message });
      return errorResponse(
        'This trip no longer exists. It may have been deleted by the organizer.',
        404,
        corsHeaders,
        'TRIP_NOT_FOUND',
      );
    }

    // Check if trip is archived
    if (trip.is_archived) {
      logStep('ERROR: Trip is archived', { tripId: invite.trip_id });
      return errorResponse(
        'This trip has been archived and is no longer accepting new members.',
        403,
        corsHeaders,
        'TRIP_ARCHIVED',
      );
    }

    logStep('Trip found', { tripName: trip.name, tripType: trip.trip_type });

    // Check if invite requires approval
    // CRITICAL: Pro/Event trips ALWAYS require approval regardless of invite setting
    // This ensures trip admins can vet all join requests for professional/event trips
    const requiresApproval =
      invite.require_approval || trip.trip_type === 'pro' || trip.trip_type === 'event';

    logStep('Approval requirement check', {
      inviteRequiresApproval: invite.require_approval,
      tripType: trip.trip_type,
      finalRequiresApproval: requiresApproval,
    });

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

      // Check if user has an existing request for this trip
      const { data: existingRequest } = await supabaseClient
        .from('trip_join_requests')
        .select('id, status')
        .eq('trip_id', invite.trip_id)
        .eq('user_id', user.id)
        .single();

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          // Request already pending - just return success message
          logStep('Join request already pending', { requestId: existingRequest.id });
          return successResponse(
            {
              requires_approval: true,
              trip_id: invite.trip_id,
              trip_name: trip.name,
              trip_type: trip.trip_type,
              message: 'Your join request is pending approval from the trip organizer.',
            },
            corsHeaders,
          );
        } else if (existingRequest.status === 'rejected') {
          // Previously rejected - allow re-request by updating status back to pending
          logStep('Updating rejected request to pending', { requestId: existingRequest.id });
          const { error: updateError } = await supabaseClient
            .from('trip_join_requests')
            .update({
              status: 'pending',
              requested_at: new Date().toISOString(),
              resolved_at: null,
              resolved_by: null,
              invite_code: inviteCode,
              requester_name: requesterName,
              requester_email: requesterEmail,
            })
            .eq('id', existingRequest.id);

          if (updateError) {
            logStep('ERROR: Failed to update rejected request', { error: updateError.message });
            return errorResponse(
              'Failed to resubmit join request. Please try again.',
              500,
              corsHeaders,
            );
          }

          // Send notifications to trip members/admins
          // (notification logic will be handled below)
          logStep('Rejected request updated to pending', { requestId: existingRequest.id });
        }
        // If status is 'approved', user should already be a member (handled earlier)
      }

      // Create join request with requester info stored directly (only if no existing request)
      let joinRequestId = existingRequest?.id;

      if (!existingRequest) {
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
          // Check if request already exists (race condition)
          if (requestError.code === '23505') {
            logStep('Join request already exists (race condition)');
            return successResponse(
              {
                requires_approval: true,
                trip_id: invite.trip_id,
                trip_name: trip.name,
                trip_type: trip.trip_type,
                message: 'Your join request is pending approval from the trip organizer.',
              },
              corsHeaders,
            );
          }

          logStep('ERROR: Failed to create join request', { error: requestError.message });
          return errorResponse(
            'Failed to submit join request. Please try again.',
            500,
            corsHeaders,
          );
        }

        joinRequestId = joinRequest?.id;
        logStep('Join request created successfully', { requestId: joinRequestId });
      }

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
            request_id: joinRequestId,
          },
        }),
      );

      const notificationResults = await Promise.allSettled(notificationPromises);
      const successCount = notificationResults.filter(r => r.status === 'fulfilled').length;
      logStep('Notifications created', { total: recipientIds.length, success: successCount });

      return successResponse(
        {
          requires_approval: true,
          trip_id: invite.trip_id,
          trip_name: trip.name,
          trip_type: trip.trip_type,
          message: 'Join request submitted! The trip organizer will review your request.',
        },
        corsHeaders,
      );
    }

    // No approval required - upsert to support re-join (user may have status=left)
    const { error: memberError } = await supabaseClient.from('trip_members').upsert(
      {
        trip_id: invite.trip_id,
        user_id: user.id,
        role: 'member',
        status: 'active',
        left_at: null,
      },
      { onConflict: 'trip_id,user_id' },
    );

    if (memberError) {
      logStep('ERROR: Failed to add member', { error: memberError.message });
      return errorResponse('Failed to join trip. Please try again.', 500, corsHeaders);
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

    return successResponse(
      {
        trip_id: invite.trip_id,
        trip_name: trip.name,
        trip_type: trip.trip_type,
        message: `Successfully joined ${trip.name}!`,
      },
      corsHeaders,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in join-trip', { message: errorMessage });
    return errorResponse(
      'An unexpected error occurred. Please try again.',
      500,
      corsHeaders,
      'UNKNOWN_ERROR',
    );
  }
});
