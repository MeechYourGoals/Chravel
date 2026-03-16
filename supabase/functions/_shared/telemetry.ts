/**
 * Edge Function Telemetry Helper
 *
 * Lightweight structured logging for Supabase edge functions.
 * Outputs JSON lines that can be parsed by log drains (Supabase, Vercel, etc.).
 *
 * Usage:
 *   const ctx = createRequestContext('gemini-chat');
 *   try {
 *     // ... handler logic
 *     logMetrics(ctx, 'success', { user_id, trip_id });
 *   } catch (error) {
 *     logMetrics(ctx, 'error', { error_type: (error as Error).name });
 *     throw error;
 *   }
 */

export interface RequestContext {
  request_id: string;
  function_name: string;
  started_at: number;
}

export interface EdgeFunctionMetrics {
  type: 'EDGE_METRICS';
  function_name: string;
  request_id: string;
  duration_ms: number;
  status: 'success' | 'error';
  user_id?: string;
  trip_id?: string;
  error_type?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Create a request context at the start of an edge function handler.
 * Returns a context object and the request_id for inclusion in response headers.
 */
export function createRequestContext(functionName: string): RequestContext {
  return {
    request_id: crypto.randomUUID(),
    function_name: functionName,
    started_at: Date.now(),
  };
}

/**
 * Log structured metrics at the end of an edge function handler.
 * Call this in both success and error paths.
 */
export function logMetrics(
  ctx: RequestContext,
  status: 'success' | 'error',
  meta?: {
    user_id?: string;
    trip_id?: string;
    error_type?: string;
    [key: string]: unknown;
  },
): void {
  // Extract known fields; collect the rest as extra metadata
  const { user_id, trip_id, error_type, ...extra } = meta ?? {};
  const metrics: EdgeFunctionMetrics = {
    type: 'EDGE_METRICS',
    function_name: ctx.function_name,
    request_id: ctx.request_id,
    duration_ms: Date.now() - ctx.started_at,
    status,
    user_id,
    trip_id,
    error_type,
    metadata: Object.keys(extra).length > 0 ? extra : undefined,
    timestamp: new Date().toISOString(),
  };

  // Structured JSON log — parseable by log drains
  console.log(JSON.stringify(metrics));
}

/**
 * Add the request ID to response headers for frontend correlation.
 */
export function addRequestIdHeader(
  headers: Record<string, string>,
  ctx: RequestContext,
): Record<string, string> {
  return {
    ...headers,
    'X-Request-Id': ctx.request_id,
  };
}
