import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';

const logStep = (step: string, details?: unknown, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${level}] [GENERATE-INVITE] ${timestamp} - ${step}${detailsStr}`);
};

function createJsonResponse(data: unknown, status: number, corsHeaders: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(
  message: string,
  code: string,
  status: number,
  corsHeaders: HeadersInit
): Response {
  return createJsonResponse({ success: false, error: message, code }, status, corsHeaders);
}

function successResponse(data: Record<string, unknown>, corsHeaders: HeadersInit): Response {
  return createJsonResponse({ success: true, ...data }, 200, corsHeaders);
}

// Generate a short branded invite code (e.g., "chravel7x9k2m")
function generateBrandedCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `chravel${randomPart}`;
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
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logStep('ERROR: No authorization header', {}, 'ERROR');
      return errorResponse('Authentication required', 'AUTH_REQUIRED', 401, corsHeaders);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      logStep('ERROR: User authentication failed', { error: userError?.message }, 'ERROR');
      return errorResponse('Invalid authentication', 'INVALID_AUTH', 401, corsHeaders);
    }

    const user = userData.user;
    logStep('User authenticated', { userId: user.id, email: user.email });

    // Get request body
    const { tripId, requireApproval, expiresIn7Days } = await req.json();

    if (!tripId) {
      logStep('ERROR: No trip ID provided', {}, 'ERROR');
      return errorResponse('Trip ID is required', 'TRIP_ID_REQUIRED', 400, corsHeaders);
    }

    logStep('Request params', { tripId, requireApproval, expiresIn7Days });

    // Validate trip exists and user has permission
    const { data: trip, error: tripError } = await supabaseClient
      .from('trips')
      .select('id, name, created_by, trip_type')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      logStep('ERROR: Trip not found', { tripId, error: tripError?.message }, 'ERROR');
      return errorResponse(
        'Trip not found. It may have been deleted or you do not have permission.',
        'TRIP_NOT_FOUND',
        404,
        corsHeaders
      );
    }

    logStep('Trip found', { tripName: trip.name, tripType: trip.trip_type });

    // Check if user is creator or admin
    if (trip.created_by !== user.id) {
      const { data: admin } = await supabaseClient
        .from('trip_admins')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();

      if (!admin) {
        logStep(
          'ERROR: User not authorized',
          { userId: user.id, tripCreator: trip.created_by },
          'ERROR'
        );
        return errorResponse(
          'Only trip creators and admins can create invite links',
          'PERMISSION_DENIED',
          403,
          corsHeaders
        );
      }
    }

    // Generate unique invite code with retry logic (handles race conditions)
    let code: string | null = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (!code && attempts < maxAttempts) {
      attempts++;
      const candidateCode = generateBrandedCode();

      logStep('Attempting to insert invite', { attempt: attempts, code: candidateCode });

      // Calculate expiration date if needed
      const expiresAt = expiresIn7Days
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Try to insert - let database handle uniqueness via constraint
      const { data, error } = await supabaseClient
        .from('trip_invites')
        .insert({
          trip_id: tripId,
          code: candidateCode,
          created_by: user.id,
          is_active: true,
          current_uses: 0,
          require_approval: requireApproval || false,
          expires_at: expiresAt,
        })
        .select('code, id')
        .single();

      if (!error) {
        code = data.code;
        logStep('Invite created successfully', {
          inviteId: data.id,
          code: code.substring(0, 12) + '...',
          attempt: attempts,
        });
      } else if (error.code === '23505') {
        // Duplicate key error - try again with new code
        logStep('Code collision detected, retrying', { attempt: attempts, error: error.message }, 'WARN');
      } else if (error.code === '23503') {
        // Foreign key violation - trip doesn't exist (race condition?)
        logStep('ERROR: Trip no longer exists', { tripId, error: error.message }, 'ERROR');
        return errorResponse(
          'Trip no longer exists. It may have been deleted.',
          'TRIP_DELETED',
          404,
          corsHeaders
        );
      } else {
        // Other database error
        logStep('ERROR: Database error creating invite', { error: error.message }, 'ERROR');
        return errorResponse(
          'Failed to create invite link. Please try again.',
          'DB_ERROR',
          500,
          corsHeaders
        );
      }
    }

    if (!code) {
      logStep('ERROR: Could not generate unique code', { attempts: maxAttempts }, 'ERROR');
      return errorResponse(
        `Could not generate unique invite code after ${maxAttempts} attempts. Please try again.`,
        'CODE_GENERATION_FAILED',
        500,
        corsHeaders
      );
    }

    // Return success with invite URL
    const inviteUrl = `https://p.chravel.app/j/${code}`;

    logStep('Success', {
      code: code.substring(0, 12) + '...',
      tripId,
      tripName: trip.name,
      attempts,
    });

    return successResponse(
      {
        code,
        inviteUrl,
        tripName: trip.name,
        tripType: trip.trip_type,
        requireApproval: requireApproval || false,
        expiresAt: expiresIn7Days ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
      },
      corsHeaders
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR: Unexpected error', { message: errorMessage }, 'ERROR');
    return errorResponse(
      'An unexpected error occurred. Please try again.',
      'UNEXPECTED_ERROR',
      500,
      corsHeaders
    );
  }
});
