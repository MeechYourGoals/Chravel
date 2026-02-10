import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import {
  createSecureResponse,
  createErrorResponse,
  createOptionsResponse,
} from '../_shared/securityHeaders.ts';
import { BroadcastCreateSchema, validateInput } from '../_shared/validation.ts';
import { sanitizeErrorForClient, logError } from '../_shared/errorHandling.ts';

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('Authentication required', 401);
    }

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Validate and sanitize input
    const requestBody = await req.json();
    const validation = validateInput(BroadcastCreateSchema, requestBody);

    if (!validation.success) {
      logError('BROADCAST_CREATE_VALIDATION', validation.error, { userId: user.id });
      return createErrorResponse(validation.error, 400);
    }

    const { trip_id, content, location, tag, scheduled_time } = validation.data;

    // Verify user is a member of the trip
    const { data: membership, error: membershipError } = await supabase
      .from('trip_members')
      .select('role')
      .eq('trip_id', trip_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      throw new Error('User is not a member of this trip');
    }

    // Get user profile for sender info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single();

    const senderName = profile?.display_name || user.email?.split('@')[0] || 'Unknown User';
    const senderAvatar = profile?.avatar_url || '';

    // Create broadcast in database
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert({
        trip_id,
        sender_id: user.id,
        sender_name: senderName,
        sender_avatar: senderAvatar,
        content,
        location: location || null,
        tag: tag || 'chill',
        scheduled_time: scheduled_time ? new Date(scheduled_time).toISOString() : null,
      })
      .select()
      .single();

    if (broadcastError) {
      console.error('Error creating broadcast:', broadcastError);
      throw new Error('Failed to create broadcast');
    }

    return createSecureResponse({
      success: true,
      broadcast,
    });
  } catch (error) {
    logError('BROADCAST_CREATE', error);
    return createErrorResponse(sanitizeErrorForClient(error), 500);
  }
});
