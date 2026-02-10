import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { validateInput, LinkTripToOrgSchema } from '../_shared/validation.ts';
import {
  createSecureResponse,
  createErrorResponse,
  createOptionsResponse,
} from '../_shared/securityHeaders.ts';

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return createErrorResponse('No authorization header', 401);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = validateInput(LinkTripToOrgSchema, body);

    if (!validation.success) {
      return createErrorResponse(`Validation error: ${validation.error}`, 400);
    }

    const { tripId, organizationId } = validation.data;

    console.log('Linking trip to organization:', { tripId, organizationId, userId: user.id });

    // Verify user is member of the organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership) {
      throw new Error('You must be a member of this organization');
    }

    // Verify trip exists and user is trip creator
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('created_by, trip_type')
      .eq('id', tripId)
      .single();

    if (tripError || !trip) {
      throw new Error('Trip not found');
    }

    if (trip.created_by !== user.id) {
      throw new Error('Only the trip creator can link it to an organization');
    }

    if (trip.trip_type !== 'pro' && trip.trip_type !== 'event') {
      throw new Error('Only Pro and Event trips can be linked to organizations');
    }

    // Check if already linked
    const { data: existingLink } = await supabase
      .from('pro_trip_organizations')
      .select('id')
      .eq('trip_id', tripId)
      .eq('organization_id', organizationId)
      .single();

    if (existingLink) {
      throw new Error('Trip is already linked to this organization');
    }

    // Create the link
    const { data: link, error: linkError } = await supabase
      .from('pro_trip_organizations')
      .insert({
        trip_id: tripId,
        organization_id: organizationId,
        created_by: user.id,
      })
      .select()
      .single();

    if (linkError) {
      console.error('Error linking trip:', linkError);
      throw new Error('Failed to link trip to organization');
    }

    console.log('Trip linked successfully:', link.id);

    return createSecureResponse({
      success: true,
      linkId: link.id,
    });
  } catch (error) {
    console.error('Error in link-trip-to-organization:', error);
    return createErrorResponse(error instanceof Error ? error : new Error('Unknown error'));
  }
});
