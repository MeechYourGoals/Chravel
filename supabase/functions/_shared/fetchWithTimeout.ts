/**
 * Fetch wrapper with timeout guard.
 * Prevents edge functions from hanging indefinitely on slow external services.
 *
 * Default: 15 seconds (well within Supabase's 60s edge function limit,
 * leaves room for retries and response processing).
 */
export async function fetchWithTimeout(
  input: string | URL | Request,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = 15_000, ...fetchInit } = init ?? {};

  return fetch(input, {
    ...fetchInit,
    signal: fetchInit.signal ?? AbortSignal.timeout(timeoutMs),
  });
}
