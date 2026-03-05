import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Shared auth guard for edge functions.
 * Validates the Authorization header and returns the authenticated user.
 * Returns null + error response if auth fails.
 */
export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<
  | { user: { id: string; email?: string }; error: null; response: null }
  | { user: null; error: string; response: Response }
> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return {
      user: null,
      error: 'Authentication required',
      response: new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      user: null,
      error: 'Unauthorized',
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user, error: null, response: null };
}
