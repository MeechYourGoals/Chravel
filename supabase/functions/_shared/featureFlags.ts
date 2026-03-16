/**
 * Edge Function Feature Flags
 *
 * Reads runtime feature flags from the `feature_flags` Supabase table.
 * Use in edge functions to check kill switches before processing requests.
 *
 * Usage:
 *   import { isFeatureEnabled } from '../_shared/featureFlags.ts';
 *
 *   if (!await isFeatureEnabled('ai_concierge')) {
 *     return new Response(JSON.stringify({ error: 'Feature temporarily disabled' }), { status: 503 });
 *   }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Check if a feature flag is enabled.
 * Returns `defaultValue` if the table is unreachable (fail-open by default).
 */
export async function isFeatureEnabled(
  key: string,
  defaultValue: boolean = true,
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[FEATURE_FLAGS] Missing Supabase credentials, using default:', defaultValue);
      return defaultValue;
    }

    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client
      .from('feature_flags')
      .select('enabled')
      .eq('key', key)
      .single();

    if (error || !data) {
      console.warn(`[FEATURE_FLAGS] Could not read flag "${key}":`, error?.message);
      return defaultValue;
    }

    return data.enabled;
  } catch (err) {
    console.warn(`[FEATURE_FLAGS] Error reading flag "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Creates a 503 response for disabled features.
 */
export function createFeatureDisabledResponse(
  featureName: string,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({
      error: `${featureName} is temporarily unavailable. Please try again later.`,
      feature_disabled: true,
    }),
    {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
