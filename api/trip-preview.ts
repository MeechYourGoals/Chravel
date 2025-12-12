/**
 * Vercel Edge Function: Proxy `/trip/:tripId/preview` to Supabase `generate-trip-preview`.
 *
 * Why Edge Function: iMessage/OG scrapers do not execute SPA JS, so we must serve OG tags
 * at the URL itself. Edge Functions use Web Standards API (no @vercel/node dependency).
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const tripId = url.searchParams.get('tripId');

  // DEV logging
  console.log('[trip-preview] Received request for tripId:', tripId);

  if (!tripId) {
    return new Response('Missing tripId', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    // Proxy to Supabase generate-trip-preview edge function
    const supabaseProjectRef = 'jmjiyekmxwsxkfnqwyaa';
    const supabaseUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/generate-trip-preview?tripId=${encodeURIComponent(tripId)}`;

    console.log('[trip-preview] Fetching from:', supabaseUrl);

    const upstream = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('user-agent') ?? 'chravel-preview-proxy',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const body = await upstream.text();

    console.log('[trip-preview] Upstream status:', upstream.status, 'Body length:', body.length);

    // Build response with proper headers
    const responseHeaders: Record<string, string> = {
      'Content-Type': upstream.headers.get('content-type') ?? 'text/html; charset=utf-8',
    };

    const cacheControl = upstream.headers.get('cache-control');
    if (cacheControl) {
      responseHeaders['Cache-Control'] = cacheControl;
    } else {
      // Default 5-minute cache for OG previews
      responseHeaders['Cache-Control'] = 'public, max-age=300, s-maxage=300';
    }

    return new Response(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[trip-preview] Error:', message);
    
    return new Response(`Preview proxy error: ${message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}
