/**
 * Cron/Service Guard for Edge Functions
 *
 * Protects internal-only functions (cron jobs, background workers) from
 * being called directly by unauthenticated external requests.
 *
 * Validates one of:
 * 1. A shared secret passed via X-Cron-Secret header (for Supabase Cron / external schedulers)
 * 2. A valid service-role Authorization header (for internal function-to-function calls)
 */

const CRON_SECRET = Deno.env.get('CRON_SECRET');

export interface CronGuardResult {
  authorized: boolean;
  response?: Response;
}

/**
 * Verifies that the request is from an authorized internal caller.
 *
 * Usage:
 * ```ts
 * const guard = verifyCronAuth(req, corsHeaders);
 * if (!guard.authorized) return guard.response!;
 * ```
 */
export function verifyCronAuth(req: Request, corsHeaders: Record<string, string>): CronGuardResult {
  // 1. Check X-Cron-Secret header (primary method for scheduled invocations)
  const cronSecret = req.headers.get('x-cron-secret');
  if (CRON_SECRET && cronSecret === CRON_SECRET) {
    return { authorized: true };
  }

  // 2. Check for Authorization header with service role key
  //    Supabase internal invocations include the service role bearer token
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (serviceRoleKey && authHeader === `Bearer ${serviceRoleKey}`) {
      return { authorized: true };
    }
  }

  // 3. If CRON_SECRET is not configured, log warning but allow
  //    (graceful degradation during rollout — remove after CRON_SECRET is set in all envs)
  if (!CRON_SECRET) {
    console.warn(
      '[CronGuard] CRON_SECRET env var not configured — allowing request. ' +
        'Set CRON_SECRET in production to secure cron endpoints.',
    );
    return { authorized: true };
  }

  // Deny
  return {
    authorized: false,
    response: new Response(
      JSON.stringify({ error: 'Unauthorized — valid cron secret or service key required' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    ),
  };
}
