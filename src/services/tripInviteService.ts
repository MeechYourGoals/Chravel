/**
 * Trip Invite Service
 *
 * Centralized service for all trip invite operations including:
 * - Accepting invites (both direct join and approval-required)
 * - Getting invite previews
 * - Managing invite links
 *
 * This service provides type-safe access to Supabase edge functions
 * and database operations for the invite flow.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// Types
// ============================================

export interface InvitePreview {
  success: boolean;
  error_code?: 'INVALID' | 'EXPIRED' | 'INACTIVE' | 'MAX_USES' | 'NOT_FOUND';
  message?: string;
  invite?: {
    code: string;
    require_approval: boolean;
    expires_at: string | null;
    current_uses: number;
    max_uses: number | null;
  };
  trip?: {
    id: string;
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    cover_image_url: string | null;
    trip_type: 'consumer' | 'pro' | 'event';
    creator_name: string;
  };
}

export interface JoinTripResult {
  success: boolean;
  trip_id?: string;
  trip_name?: string;
  trip_type?: 'consumer' | 'pro' | 'event';
  already_member?: boolean;
  requires_approval?: boolean;
  message?: string;
  error?: string;
}

export interface CreateInviteOptions {
  tripId: string;
  requireApproval?: boolean;
  expiresInDays?: number;
  maxUses?: number | null;
}

export interface CreateInviteResult {
  success: boolean;
  code?: string;
  inviteLink?: string;
  error?: string;
}

// ============================================
// Service Functions
// ============================================

/**
 * Get preview information for an invite code
 * Works without authentication for social sharing previews
 */
export async function getInvitePreview(code: string): Promise<InvitePreview> {
  try {
    const { data, error } = await supabase.functions.invoke('get-invite-preview', {
      body: { code }
    });

    if (error) {
      console.error('Error fetching invite preview:', error);
      return {
        success: false,
        error_code: 'INVALID',
        message: error.message || 'Failed to fetch invite preview'
      };
    }

    return data as InvitePreview;
  } catch (error) {
    console.error('Exception in getInvitePreview:', error);
    return {
      success: false,
      error_code: 'INVALID',
      message: 'An unexpected error occurred'
    };
  }
}

/**
 * Accept an invite and join a trip
 * Requires authentication - handles both direct join and approval workflow
 */
export async function acceptInvite(code: string): Promise<JoinTripResult> {
  try {
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: 'Please sign in to join this trip'
      };
    }

    const { data, error } = await supabase.functions.invoke('join-trip', {
      body: { inviteCode: code }
    });

    if (error) {
      console.error('Error joining trip:', error);
      return {
        success: false,
        error: error.message || 'Failed to join trip'
      };
    }

    return data as JoinTripResult;
  } catch (error) {
    console.error('Exception in acceptInvite:', error);
    return {
      success: false,
      error: 'An unexpected error occurred while joining the trip'
    };
  }
}

/**
 * Store invite code for post-login pickup
 * Used when user needs to authenticate before joining
 */
export function storeInviteCodeForLogin(code: string): void {
  sessionStorage.setItem('chravel_pending_invite_code', code);
}

/**
 * Retrieve and clear stored invite code after login
 */
export function getStoredInviteCode(): string | null {
  const code = sessionStorage.getItem('chravel_pending_invite_code');
  if (code) {
    sessionStorage.removeItem('chravel_pending_invite_code');
  }
  return code;
}

/**
 * Check if there's a pending invite code
 */
export function hasPendingInviteCode(): boolean {
  return sessionStorage.getItem('chravel_pending_invite_code') !== null;
}

/**
 * Generate a branded invite code
 * Returns a unique code with the "chravel" prefix
 */
function generateInviteCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `chravel${code}`;
}

/**
 * Create a new invite link for a trip
 */
export async function createInviteLink(options: CreateInviteOptions): Promise<CreateInviteResult> {
  const { tripId, requireApproval = false, expiresInDays, maxUses = null } = options;

  try {
    // Generate a unique code
    const code = generateInviteCode();

    // Calculate expiration date if specified
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        error: 'Please sign in to create invite links'
      };
    }

    // Insert the invite
    const { data, error } = await supabase
      .from('trip_invites')
      .insert({
        trip_id: tripId,
        code,
        created_by: user.id,
        require_approval: requireApproval,
        expires_at: expiresAt,
        max_uses: maxUses,
        is_active: true,
        current_uses: 0
      })
      .select('code')
      .single();

    if (error) {
      // Handle unique constraint violation (code collision)
      if (error.code === '23505') {
        // Retry with a new code (recursive call with limit)
        return createInviteLink(options);
      }

      console.error('Error creating invite link:', error);
      return {
        success: false,
        error: error.message || 'Failed to create invite link'
      };
    }

    const inviteLink = `${window.location.origin}/join/${data.code}`;

    return {
      success: true,
      code: data.code,
      inviteLink
    };
  } catch (error) {
    console.error('Exception in createInviteLink:', error);
    return {
      success: false,
      error: 'An unexpected error occurred'
    };
  }
}

/**
 * Deactivate an existing invite link
 */
export async function deactivateInviteLink(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('trip_invites')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('code', code);

    if (error) {
      console.error('Error deactivating invite:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception in deactivateInviteLink:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get the current active invite link for a trip
 * Returns null if no active invite exists
 */
export async function getActiveInviteForTrip(tripId: string): Promise<{
  code: string;
  inviteLink: string;
  requireApproval: boolean;
  expiresAt: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('trip_invites')
      .select('code, require_approval, expires_at')
      .eq('trip_id', tripId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      code: data.code,
      inviteLink: `${window.location.origin}/join/${data.code}`,
      requireApproval: data.require_approval,
      expiresAt: data.expires_at
    };
  } catch (error) {
    console.error('Exception in getActiveInviteForTrip:', error);
    return null;
  }
}

/**
 * Get the route to redirect to based on trip type
 */
export function getTripDetailRoute(tripId: string, tripType: 'consumer' | 'pro' | 'event'): string {
  switch (tripType) {
    case 'pro':
      return `/trip/pro/${tripId}`;
    case 'event':
      return `/trip/event/${tripId}`;
    case 'consumer':
    default:
      return `/trip/${tripId}`;
  }
}

/**
 * Get human-readable error message for invite error codes
 */
export function getInviteErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'INVALID':
      return 'This invite link is invalid or has been removed.';
    case 'EXPIRED':
      return 'This invite link has expired. Please request a new one from the host.';
    case 'INACTIVE':
      return 'This invite link is no longer active.';
    case 'MAX_USES':
      return 'This invite link has reached its maximum number of uses. Please request a new one from the host.';
    case 'NOT_FOUND':
      return 'This invite link could not be found.';
    default:
      return 'An error occurred with this invite link.';
  }
}
