import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test database connectivity with timing
    const dbStart = Date.now();
    const { data, error } = await supabase.from('trips').select('id').limit(1);
    const dbResponseMs = Date.now() - dbStart;

    const dbHealthy = !error;

    // Read feature flags status
    let flagsStatus: Record<string, boolean> = {};
    try {
      const { data: flags } = await supabase.from('feature_flags').select('key, enabled');
      if (flags) {
        flagsStatus = Object.fromEntries(
          (flags as Array<{ key: string; enabled: boolean }>).map(f => [f.key, f.enabled]),
        );
      }
    } catch {
      // Feature flags table may not exist yet — non-blocking
    }

    const health = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        database_response_ms: dbResponseMs,
        api: 'up',
      },
      deploy: {
        sha: Deno.env.get('DEPLOY_SHA') || 'unknown',
        version: Deno.env.get('DEPLOY_VERSION') || '1.0.0',
      },
      feature_flags: flagsStatus,
    };

    return new Response(JSON.stringify(health), {
      status: dbHealthy ? 200 : 503,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Health check failed:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
      }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } },
    );
  }
});
