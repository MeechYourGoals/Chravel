/**
 * Chravel branded unfurl service (Cloudflare Worker style).
 *
 * Goal:
 * - Provide stable, branded URLs for link unfurling that DO NOT depend on the SPA host.
 * - Serve OG HTML for bots; redirect humans to your app.
 *
 * Routes:
 * - GET /t/:tripId -> Trip preview OG HTML
 * - GET /healthz   -> 200 ok
 *
 * How it works:
 * - Proxies to Supabase Edge Function `generate-trip-preview`
 * - Passes the branded canonical URL so og:url is correct (critical for caching/unfurl)
 *
 * Deploy:
 * - Put this on `p.chravel.app` (or similar) via Cloudflare Workers (recommended),
 *   Fly.io, Render, or any edge runtime that supports the Fetch API.
 */

type Env = {
  SUPABASE_PROJECT_REF: string;
  APP_BASE_URL: string; // e.g. https://chravel.app
};

function htmlResponse(body: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'text/html; charset=utf-8');
  }
  // Allow caches to store unfurls briefly; platforms often re-fetch aggressively.
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
  }
  return new Response(body, { ...init, headers });
}

function textResponse(body: string, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'text/plain; charset=utf-8');
  }
  return new Response(body, { ...init, headers });
}

function notFound(): Response {
  return textResponse('Not found', { status: 404 });
}

function getTripIdFromPath(pathname: string): string | null {
  // Expected: /t/:tripId
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0] === 't' && parts[1]) {
    return parts[1];
  }
  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/healthz') {
      return textResponse('ok', { status: 200 });
    }

    const tripId = getTripIdFromPath(url.pathname);
    if (!tripId) return notFound();

    const projectRef = env.SUPABASE_PROJECT_REF || 'jmjiyekmxwsxkfnqwyaa';
    const appBaseUrl = env.APP_BASE_URL || 'https://chravel.app';

    // Branded canonical URL = the URL being scraped (this Worker endpoint).
    const canonicalUrl = url.toString();

    const upstreamUrl = new URL(`https://${projectRef}.supabase.co/functions/v1/generate-trip-preview`);
    upstreamUrl.searchParams.set('tripId', tripId);
    upstreamUrl.searchParams.set('canonicalUrl', canonicalUrl);
    upstreamUrl.searchParams.set('appBaseUrl', appBaseUrl);

    // Forward UA so Supabase logs are useful; accept HTML.
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('user-agent') ?? 'chravel-unfurl-worker',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const body = await upstream.text();

    // Always return HTML (even for errors) so platforms can show *something*.
    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') ?? 'text/html; charset=utf-8');

    // Respect upstream cache control when present; otherwise use our default.
    const cacheControl = upstream.headers.get('cache-control');
    if (cacheControl) headers.set('Cache-Control', cacheControl);

    return htmlResponse(body, { status: upstream.status, headers });
  },
};

