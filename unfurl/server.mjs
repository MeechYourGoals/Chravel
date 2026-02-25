/**
 * Chravel branded unfurl server (provider-agnostic).
 *
 * Why:
 * - Unfurler bots don't execute JS, so they need server-rendered OG HTML.
 * - This service lets you keep a stable branded domain (e.g. p.chravel.app)
 *   regardless of where the SPA is hosted.
 *
 * Routes:
 * - GET /t/:tripId  -> OG HTML (proxied from Supabase Edge Function)
 * - GET /j/:code    -> Invite OG HTML (proxied from Supabase Edge Function)
 * - GET /healthz    -> "ok"
 *
 * Config (env):
 * - PORT (default 8787)
 * - SUPABASE_PROJECT_REF (default jmjiyekmxwsxkfnqwyaa)
 * - APP_BASE_URL (default https://chravel.app)
 */

import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT ?? 8787);
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'jmjiyekmxwsxkfnqwyaa';
const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://chravel.app';

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

function sendText(res, statusCode, text) {
  send(res, statusCode, { 'Content-Type': 'text/plain; charset=utf-8' }, text);
}

function sendHtml(res, statusCode, html, extraHeaders = {}) {
  send(
    res,
    statusCode,
    {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      ...extraHeaders,
    },
    html,
  );
}

function parseTripId(pathname) {
  // /t/:tripId
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0] === 't' && parts[1]) return parts[1];
  return null;
}

function parseInviteCode(pathname) {
  // /j/:code
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 2 && parts[0] === 'j' && parts[1]) return parts[1];
  return null;
}

async function proxyTripPreview({ tripId, canonicalUrl, userAgent }) {
  const upstream = new URL(
    `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/generate-trip-preview`,
  );
  upstream.searchParams.set('tripId', tripId);
  upstream.searchParams.set('canonicalUrl', canonicalUrl);
  upstream.searchParams.set('appBaseUrl', APP_BASE_URL);

  const resp = await fetch(upstream.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': userAgent ?? 'chravel-unfurl-node',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  const html = await resp.text();
  const cacheControl = resp.headers.get('cache-control');

  return {
    status: resp.status,
    html,
    headers: cacheControl ? { 'Cache-Control': cacheControl } : undefined,
  };
}

async function proxyInvitePreview({ inviteCode, canonicalUrl, userAgent }) {
  const upstream = new URL(
    `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/generate-invite-preview`,
  );
  upstream.searchParams.set('code', inviteCode);
  upstream.searchParams.set('canonicalUrl', canonicalUrl);
  upstream.searchParams.set('appBaseUrl', APP_BASE_URL);

  const resp = await fetch(upstream.toString(), {
    method: 'GET',
    headers: {
      'User-Agent': userAgent ?? 'chravel-unfurl-node',
      Accept: 'text/html,application/xhtml+xml',
    },
  });

  const html = await resp.text();
  const cacheControl = resp.headers.get('cache-control');

  return {
    status: resp.status,
    html,
    headers: cacheControl ? { 'Cache-Control': cacheControl } : undefined,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (requestUrl.pathname === '/healthz') {
      return sendText(res, 200, 'ok');
    }

    // Check for trip preview route /t/:tripId
    const tripId = parseTripId(requestUrl.pathname);
    if (tripId) {
      const canonicalUrl = requestUrl.toString().replace(/^http:\/\//, 'https://');
      const upstream = await proxyTripPreview({
        tripId,
        canonicalUrl,
        userAgent: req.headers['user-agent'],
      });
      return sendHtml(res, upstream.status, upstream.html, upstream.headers);
    }

    // Check for invite preview route /j/:code
    const inviteCode = parseInviteCode(requestUrl.pathname);
    if (inviteCode) {
      const canonicalUrl = requestUrl.toString().replace(/^http:\/\//, 'https://');
      const upstream = await proxyInvitePreview({
        inviteCode,
        canonicalUrl,
        userAgent: req.headers['user-agent'],
      });
      return sendHtml(res, upstream.status, upstream.html, upstream.headers);
    }

    return sendText(res, 404, 'Not found');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return sendText(res, 500, `unfurl error: ${message}`);
  }
});

server.listen(PORT, () => {
  console.log(`[unfurl] listening on :${PORT}`);
});
