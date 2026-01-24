/**
 * Invite Error Taxonomy
 *
 * This file defines the comprehensive error types for the Trip Invite system.
 * Each error code maps to a specific failure mode with targeted messaging and CTAs.
 *
 * Design Principle: "No Dead Ends"
 * - Every error state must have a primary recovery action
 * - Users should never see a generic "Trip not found" without guidance
 * - Error messages should be specific, actionable, and empathetic
 */

/**
 * Error codes for invite-related failures.
 * These are returned by both get-invite-preview and join-trip edge functions.
 */
export type InviteErrorCode =
  // Auth-related errors
  | 'AUTH_REQUIRED' // User must log in to join
  | 'AUTH_EXPIRED' // Session expired, needs re-authentication
  | 'ACCOUNT_MISMATCH' // Invite sent to different email than logged in user

  // Invite state errors
  | 'INVITE_NOT_FOUND' // Invite code doesn't exist
  | 'INVITE_EXPIRED' // Invite past expiration date
  | 'INVITE_INACTIVE' // Invite deactivated by organizer
  | 'INVITE_MAX_USES' // Invite reached usage limit

  // Trip state errors
  | 'TRIP_NOT_FOUND' // Trip was deleted
  | 'TRIP_ARCHIVED' // Trip was archived
  | 'TRIP_FULL' // Pro/Event seat limit reached

  // Access errors
  | 'ACCESS_DENIED' // User doesn't have permission
  | 'APPROVAL_PENDING' // Join request awaiting approval
  | 'APPROVAL_REJECTED' // Join request was rejected
  | 'ALREADY_MEMBER' // User is already in the trip

  // Technical errors
  | 'NETWORK_ERROR' // Connection/fetch failure
  | 'INVALID_LINK' // Malformed invite URL
  | 'UNKNOWN_ERROR'; // Fallback for unexpected issues

/**
 * CTA (Call-to-Action) types for error recovery.
 * Each error should map to one or more of these actions.
 */
export type InviteErrorCTA =
  | 'login' // Redirect to login page
  | 'signup' // Redirect to signup page
  | 'switch_account' // Prompt to switch accounts
  | 'request_new_invite' // Ask host for fresh invite
  | 'contact_host' // Contact trip organizer
  | 'go_to_dashboard' // Return to home/dashboard
  | 'retry' // Retry the failed operation
  | 'view_request_status' // Check pending approval
  | 'open_trip'; // Go to the trip (for already member)

/**
 * Structured error object for invite failures
 */
export interface InviteError {
  code: InviteErrorCode;
  title: string;
  message: string;
  primaryCTA: InviteErrorCTA;
  secondaryCTA?: InviteErrorCTA;
  metadata?: {
    tripId?: string;
    tripName?: string;
    tripType?: 'consumer' | 'pro' | 'event';
    hostEmail?: string;
    invitedEmail?: string;
    currentEmail?: string;
    requestId?: string;
  };
}

/**
 * Error specifications mapping each error code to its display properties.
 * This ensures consistent messaging across the entire invite flow.
 */
export const INVITE_ERROR_SPECS: Record<
  InviteErrorCode,
  {
    title: string;
    message: string;
    primaryCTA: InviteErrorCTA;
    secondaryCTA?: InviteErrorCTA;
    icon: 'auth' | 'clock' | 'alert' | 'lock' | 'users' | 'network' | 'check';
    severity: 'info' | 'warning' | 'error';
  }
> = {
  // Auth-related errors
  AUTH_REQUIRED: {
    title: 'Sign in to join',
    message: 'You need to sign in or create an account to join this trip.',
    primaryCTA: 'login',
    secondaryCTA: 'signup',
    icon: 'auth',
    severity: 'info',
  },
  AUTH_EXPIRED: {
    title: 'Session expired',
    message: 'Your session has expired. Please sign in again to continue.',
    primaryCTA: 'login',
    icon: 'auth',
    severity: 'warning',
  },
  ACCOUNT_MISMATCH: {
    title: 'Wrong account',
    message:
      'This invite was sent to a different email address. Switch accounts to join, or continue with your current account if allowed.',
    primaryCTA: 'switch_account',
    secondaryCTA: 'contact_host',
    icon: 'auth',
    severity: 'warning',
  },

  // Invite state errors
  INVITE_NOT_FOUND: {
    title: 'Invite not found',
    message: 'This invite link is invalid or has been deleted. Ask the host for a new link.',
    primaryCTA: 'request_new_invite',
    secondaryCTA: 'go_to_dashboard',
    icon: 'alert',
    severity: 'error',
  },
  INVITE_EXPIRED: {
    title: 'Invite expired',
    message: 'This invite link has expired. Ask the host for a fresh link.',
    primaryCTA: 'request_new_invite',
    secondaryCTA: 'contact_host',
    icon: 'clock',
    severity: 'warning',
  },
  INVITE_INACTIVE: {
    title: 'Invite deactivated',
    message: 'The host has turned off this invite link. Contact them for a new one.',
    primaryCTA: 'request_new_invite',
    secondaryCTA: 'contact_host',
    icon: 'clock',
    severity: 'warning',
  },
  INVITE_MAX_USES: {
    title: 'Invite limit reached',
    message: 'This invite link has been used the maximum number of times. Ask the host for a new link.',
    primaryCTA: 'request_new_invite',
    secondaryCTA: 'contact_host',
    icon: 'users',
    severity: 'warning',
  },

  // Trip state errors
  TRIP_NOT_FOUND: {
    title: 'Trip deleted',
    message: 'This trip no longer exists. It may have been deleted by the organizer.',
    primaryCTA: 'go_to_dashboard',
    secondaryCTA: 'contact_host',
    icon: 'alert',
    severity: 'error',
  },
  TRIP_ARCHIVED: {
    title: 'Trip archived',
    message: 'This trip has been archived and is no longer accepting new members.',
    primaryCTA: 'go_to_dashboard',
    secondaryCTA: 'contact_host',
    icon: 'clock',
    severity: 'info',
  },
  TRIP_FULL: {
    title: 'Trip is full',
    message: 'This trip has reached its member limit. Contact the host to request a spot.',
    primaryCTA: 'contact_host',
    secondaryCTA: 'go_to_dashboard',
    icon: 'users',
    severity: 'warning',
  },

  // Access errors
  ACCESS_DENIED: {
    title: "You don't have access",
    message: "You don't have permission to view this trip. If you should have access, contact the host.",
    primaryCTA: 'contact_host',
    secondaryCTA: 'go_to_dashboard',
    icon: 'lock',
    severity: 'error',
  },
  APPROVAL_PENDING: {
    title: 'Request pending',
    message: 'Your join request is waiting for approval from the trip organizer.',
    primaryCTA: 'view_request_status',
    secondaryCTA: 'go_to_dashboard',
    icon: 'clock',
    severity: 'info',
  },
  APPROVAL_REJECTED: {
    title: 'Request declined',
    message: 'Your join request was declined. Contact the host if you think this is a mistake.',
    primaryCTA: 'contact_host',
    secondaryCTA: 'go_to_dashboard',
    icon: 'alert',
    severity: 'warning',
  },
  ALREADY_MEMBER: {
    title: "You're already in!",
    message: "You're already a member of this trip. Tap below to open it.",
    primaryCTA: 'open_trip',
    secondaryCTA: 'go_to_dashboard',
    icon: 'check',
    severity: 'info',
  },

  // Technical errors
  NETWORK_ERROR: {
    title: 'Connection error',
    message: "We couldn't load the invite details. Check your connection and try again.",
    primaryCTA: 'retry',
    secondaryCTA: 'go_to_dashboard',
    icon: 'network',
    severity: 'error',
  },
  INVALID_LINK: {
    title: 'Invalid link',
    message: 'This link appears to be malformed. Make sure you copied the full invite URL.',
    primaryCTA: 'request_new_invite',
    secondaryCTA: 'go_to_dashboard',
    icon: 'alert',
    severity: 'error',
  },
  UNKNOWN_ERROR: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again or contact support.',
    primaryCTA: 'retry',
    secondaryCTA: 'go_to_dashboard',
    icon: 'alert',
    severity: 'error',
  },
};

/**
 * Maps legacy error codes to the new taxonomy.
 * This ensures backward compatibility with existing edge function responses.
 */
export function normalizeErrorCode(legacyCode: string | undefined): InviteErrorCode {
  const mapping: Record<string, InviteErrorCode> = {
    // Legacy codes from get-invite-preview and join-trip
    INVALID: 'INVALID_LINK',
    EXPIRED: 'INVITE_EXPIRED',
    INACTIVE: 'INVITE_INACTIVE',
    MAX_USES: 'INVITE_MAX_USES',
    NOT_FOUND: 'INVITE_NOT_FOUND',
    NETWORK: 'NETWORK_ERROR',

    // New codes (pass through)
    AUTH_REQUIRED: 'AUTH_REQUIRED',
    AUTH_EXPIRED: 'AUTH_EXPIRED',
    ACCOUNT_MISMATCH: 'ACCOUNT_MISMATCH',
    INVITE_NOT_FOUND: 'INVITE_NOT_FOUND',
    INVITE_EXPIRED: 'INVITE_EXPIRED',
    INVITE_INACTIVE: 'INVITE_INACTIVE',
    INVITE_MAX_USES: 'INVITE_MAX_USES',
    TRIP_NOT_FOUND: 'TRIP_NOT_FOUND',
    TRIP_ARCHIVED: 'TRIP_ARCHIVED',
    TRIP_FULL: 'TRIP_FULL',
    ACCESS_DENIED: 'ACCESS_DENIED',
    APPROVAL_PENDING: 'APPROVAL_PENDING',
    APPROVAL_REJECTED: 'APPROVAL_REJECTED',
    ALREADY_MEMBER: 'ALREADY_MEMBER',
    NETWORK_ERROR: 'NETWORK_ERROR',
    INVALID_LINK: 'INVALID_LINK',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  };

  return mapping[legacyCode || ''] || 'UNKNOWN_ERROR';
}

/**
 * Creates a fully structured InviteError from an error code and optional metadata.
 */
export function createInviteError(
  code: InviteErrorCode,
  metadata?: InviteError['metadata'],
  customMessage?: string,
): InviteError {
  const spec = INVITE_ERROR_SPECS[code];
  return {
    code,
    title: spec.title,
    message: customMessage || spec.message,
    primaryCTA: spec.primaryCTA,
    secondaryCTA: spec.secondaryCTA,
    metadata,
  };
}

/**
 * Determines if an error is recoverable (user can take action to resolve).
 */
export function isRecoverableError(code: InviteErrorCode): boolean {
  const nonRecoverable: InviteErrorCode[] = ['TRIP_NOT_FOUND', 'APPROVAL_REJECTED'];
  return !nonRecoverable.includes(code);
}

/**
 * Gets the appropriate icon component name for an error.
 */
export function getErrorIconType(code: InviteErrorCode): string {
  return INVITE_ERROR_SPECS[code].icon;
}

/**
 * Gets the severity level for styling purposes.
 */
export function getErrorSeverity(code: InviteErrorCode): 'info' | 'warning' | 'error' {
  return INVITE_ERROR_SPECS[code].severity;
}
