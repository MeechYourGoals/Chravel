import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import {
  validateInput,
  InviteOrganizationMemberSchema,
  sanitizeEmail,
} from '../_shared/validation.ts';
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
    const validation = validateInput(InviteOrganizationMemberSchema, body);

    if (!validation.success) {
      return createErrorResponse(`Validation error: ${validation.error}`, 400);
    }

    const { organizationId, email, role } = validation.data;
    const sanitizedEmail = sanitizeEmail(email);

    console.log('Inviting member:', {
      organizationId,
      email: sanitizedEmail,
      role,
      invitedBy: user.id,
    });

    // Verify user is admin of the organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (
      membershipError ||
      !membership ||
      (membership.role !== 'admin' && membership.role !== 'owner')
    ) {
      throw new Error('Only organization admins can invite members');
    }

    // Generate unique invite token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: organizationId,
        email: sanitizedEmail,
        role,
        invited_by: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      throw new Error('Failed to create invitation');
    }

    // Get organization details for email
    const { data: org } = await supabase
      .from('organizations')
      .select('display_name')
      .eq('id', organizationId)
      .single();

    const inviteLink = `https://20feaa04-0946-4c68-a68d-0eb88cc1b9c4.lovableproject.com/accept-invite/${token}`;

    console.log('Invite created successfully:', {
      inviteId: invite.id,
      email: sanitizedEmail,
      organizationName: org?.display_name,
      inviteLink,
    });

    return createSecureResponse({
      success: true,
      invite: {
        id: invite.id,
        token,
        expiresAt: expiresAt.toISOString(),
        inviteLink,
      },
    });
  } catch (error) {
    console.error('Error in invite-organization-member:', error);
    return createErrorResponse(error instanceof Error ? error : new Error('Unknown error'));
  }
});
