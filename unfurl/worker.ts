/**
 * Chravel branded unfurl service (Cloudflare Worker style).
 *
 * Routes:
 * - GET /t/:tripId  -> Trip preview OG HTML (proxied from Supabase Edge Function)
 * - GET /j/:code    -> Invite preview OG HTML (proxied from Supabase Edge Function)
 * - GET /healthz    -> 200 ok
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

function parsePath(pathname: string): { type: 'trip'; id: string } | { type: 'invite'; code: string } | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2) {
    if (parts[0] === 't' && parts[1]) return { type: 'trip', id: parts[1] };
    if (parts[0] === 'j' && parts[1]) return { type: 'invite', code: parts[1] };
  }
  return null;
}

async function proxyUpstream(
  upstreamUrl: URL,
  userAgent: string | null,
): Promise<Response> {
  const upstream = await fetch(upstreamUrl.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': userAgent ?? 'chravel-unfurl-worker',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  const body = await upstream.text();
  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('content-type') ?? 'text/html; charset=utf-8');
  const cacheControl = upstream.headers.get('cache-control');
  if (cacheControl) headers.set('Cache-Control', cacheControl);

  return htmlResponse(body, { status: upstream.status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/healthz') {
      return textResponse('ok', { status: 200 });
    }

    const parsed = parsePath(url.pathname);
    if (!parsed) return notFound();

    const projectRef = env.SUPABASE_PROJECT_REF || 'jmjiyekmxwsxkfnqwyaa';
    const appBaseUrl = env.APP_BASE_URL || 'https://chravel.app';
    const canonicalUrl = url.toString();
    const userAgent = request.headers.get('user-agent');

    if (parsed.type === 'trip') {
      const upstreamUrl = new URL(
        `https://${projectRef}.supabase.co/functions/v1/generate-trip-preview`,
      );
      upstreamUrl.searchParams.set('tripId', parsed.id);
      upstreamUrl.searchParams.set('canonicalUrl', canonicalUrl);
      upstreamUrl.searchParams.set('appBaseUrl', appBaseUrl);
      return proxyUpstream(upstreamUrl, userAgent);
    }

    // parsed.type === 'invite'
    const upstreamUrl = new URL(
      `https://${projectRef}.supabase.co/functions/v1/generate-invite-preview`,
    );
    upstreamUrl.searchParams.set('code', parsed.code);
    upstreamUrl.searchParams.set('canonicalUrl', canonicalUrl);
    upstreamUrl.searchParams.set('appBaseUrl', appBaseUrl);
    return proxyUpstream(upstreamUrl, userAgent);
  },
};
