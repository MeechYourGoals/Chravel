import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  checkRateLimit,
  getClientIp,
  readJsonBody,
  redactSensitiveToken,
} from '../_shared/security.ts';
import { applyRateLimit } from '../_shared/rateLimitGuard.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[JOIN-TRIP] ${step}${detailsStr}`);
};

const JOIN_TRIP_RATE_LIMIT_MAX_REQUESTS = 20;
const JOIN_TRIP_RATE_LIMIT_WINDOW_SECONDS = 60;
const MAX_INVITE_CODE_LENGTH = 128;
const MAX_REQUEST_CONTENT_LENGTH_BYTES = 4 * 1024;

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

    if (!authHeader.startsWith('Bearer ')) {
      return errorResponse('Authorization header is malformed.', 401, corsHeaders, 'AUTH_EXPIRED');
    }

    const token = authHeader.slice(7);
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

    // Rate limit: max 10 join attempts per user per minute (prevents invite brute-forcing)
    const rl = await applyRateLimit({
      identifier: `join-trip:${user.id}`,
      maxRequests: 10,
      windowSeconds: 60,
      corsHeaders,
      supabaseClient: supabaseClient,
    });
    if (!rl.allowed) {
      logStep('Rate limit exceeded', { userId: user.id });
      return rl.response!;
    }

    // Get invite code from request
    const requestBody = await readJsonBody<{ inviteCode?: string }>(
      req,
      MAX_REQUEST_CONTENT_LENGTH_BYTES,
    );

    if (requestBody.error) {
      return errorResponse(requestBody.error, 400, corsHeaders, 'INVALID_LINK');
    }

    const normalizedInviteCode =
      typeof requestBody.data?.inviteCode === 'string' ? requestBody.data.inviteCode.trim() : '';
    if (!normalizedInviteCode || normalizedInviteCode.length > MAX_INVITE_CODE_LENGTH) {
      logStep('ERROR: No invite code provided');
      return errorResponse(
        'This invite link appears to be malformed.',
        400,
        corsHeaders,
        'INVALID_LINK',
      );
    }

    logStep('Processing invite code', { inviteCode: redactSensitiveToken(normalizedInviteCode) });

    // Fetch invite data from database
    const { data: invite, error: inviteError } = await supabaseClient
      .from('trip_invites')
      .select('*')
      .eq('code', normalizedInviteCode)
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

    // SECURITY: All trip types require approval for join requests.
    // Consumer trips: any existing member can approve (trust-based group approval)
    // Pro/Event trips: only creator or admins can approve (gated access)
    // Direct join via invite link is never permitted — leaked/forwarded links only create requests.
    const requiresApproval = true;

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
        .select('id, status, rejection_cooldown_until')
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
          // Previously rejected - check 24-hour cooldown before allowing re-request
          const cooldownUntil = existingRequest.rejection_cooldown_until
            ? new Date(existingRequest.rejection_cooldown_until)
            : null;
          if (cooldownUntil && cooldownUntil > new Date()) {
            const minutesLeft = Math.ceil((cooldownUntil.getTime() - Date.now()) / 60000);
            return errorResponse(
              `Your join request was recently denied. Please wait ${minutesLeft > 60 ? Math.ceil(minutesLeft / 60) + ' hour(s)' : minutesLeft + ' minute(s)'} before requesting again.`,
              429,
              corsHeaders,
            );
          }
          logStep('Updating rejected request to pending', { requestId: existingRequest.id });
          const { error: updateError } = await supabaseClient
            .from('trip_join_requests')
            .update({
              status: 'pending',
              requested_at: new Date().toISOString(),
              resolved_at: null,
              resolved_by: null,
              invite_code: normalizedInviteCode,
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
        // If status is 'approved' but user is no longer an active member (e.g. they left),
        // reset the request to pending so approvers can see it again.
        if (existingRequest.status === 'approved') {
          logStep('Resetting approved request to pending (user likely left and is rejoining)', {
            requestId: existingRequest.id,
          });
          const { error: updateError } = await supabaseClient
            .from('trip_join_requests')
            .update({
              status: 'pending',
              requested_at: new Date().toISOString(),
              resolved_at: null,
              resolved_by: null,
              invite_code: normalizedInviteCode,
              requester_name: requesterName,
              requester_email: requesterEmail,
            })
            .eq('id', existingRequest.id);

          if (updateError) {
            logStep('ERROR: Failed to reset approved request', { error: updateError.message });
            return errorResponse(
              'Failed to resubmit join request. Please try again.',
              500,
              corsHeaders,
            );
          }

          logStep('Approved request reset to pending', { requestId: existingRequest.id });
        }
      }

      // Create join request with requester info stored directly (only if no existing request)
      let joinRequestId = existingRequest?.id;

      if (!existingRequest) {
        const { data: joinRequest, error: requestError } = await supabaseClient
          .from('trip_join_requests')
          .insert({
            trip_id: invite.trip_id,
            user_id: user.id,
            invite_code: normalizedInviteCode,
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

        // Increment current_uses on the invite with optimistic concurrency
        const currentUses = invite.current_uses ?? 0;
        const { error: incrementError } = await supabaseClient
          .from('trip_invites')
          .update({ current_uses: currentUses + 1 })
          .eq('code', normalizedInviteCode)
          .eq('current_uses', currentUses); // optimistic lock

        if (incrementError) {
          // Non-fatal: log but don't fail the join request
          logStep('WARNING: Failed to increment current_uses', { error: incrementError.message });
        } else {
          logStep('Incremented current_uses', { from: currentUses, to: currentUses + 1 });
        }
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

    // NOTE: Direct join path removed — all joins go through the approval flow above.
    // This unreachable branch is kept as a safety net that returns an error.
    logStep('ERROR: Unexpected code path reached (requiresApproval should always be true)');
    return errorResponse(
      'An unexpected error occurred. Please try again.',
      500,
      corsHeaders,
      'UNKNOWN_ERROR',
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
