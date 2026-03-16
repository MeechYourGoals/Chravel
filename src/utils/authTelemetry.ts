/**
 * Auth Event Telemetry
 *
 * Logs structured auth events (login, signup, logout, password reset, deletion)
 * to the security_audit_log table for observability and abuse detection.
 *
 * All logging is fire-and-forget — failures are silently swallowed to avoid
 * blocking auth flows. Uses the existing Supabase client (anon key + user JWT).
 *
 * NOTE: security_audit_log has service_role-only RLS, so client-side inserts
 * will be rejected. We use an edge function endpoint instead.
 */

import {
  supabase,
  SUPABASE_PROJECT_URL,
  SUPABASE_PUBLIC_ANON_KEY,
} from '@/integrations/supabase/client';

export type AuthEventType =
  | 'login_success'
  | 'login_failure'
  | 'signup_success'
  | 'signup_failure'
  | 'logout'
  | 'password_reset_requested'
  | 'password_change_success'
  | 'password_change_failure'
  | 'account_deletion_requested'
  | 'account_deletion_cancelled'
  | 'google_oauth_initiated'
  | 'phone_otp_requested'
  | 'phone_otp_failure';

interface AuthEventDetails {
  /** The auth method used (email, google, phone) */
  method?: string;
  /** Sanitized error reason (no passwords or tokens) */
  errorReason?: string;
  /** Additional safe metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Log an auth event to the security_audit_log.
 *
 * This is fire-and-forget — it will not throw or block the calling auth flow.
 * If the user is not authenticated (e.g., failed login), we still attempt to log
 * with a null user_id for abuse tracking.
 */
export function logAuthEvent(eventType: AuthEventType, details?: AuthEventDetails): void {
  // Fire-and-forget — intentionally not awaited
  void _logAuthEventAsync(eventType, details);
}

async function _logAuthEventAsync(
  eventType: AuthEventType,
  details?: AuthEventDetails,
): Promise<void> {
  try {
    // Get current session token if available
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLIC_ANON_KEY,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Call the log-auth-event edge function
    await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/log-auth-event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        event_type: eventType,
        details: {
          method: details?.method,
          error_reason: details?.errorReason,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          ...details?.metadata,
        },
      }),
    });
  } catch {
    // Silently swallow — telemetry must never block auth
  }
}
