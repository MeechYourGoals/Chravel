import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxy `/trip/:tripId/preview` to Supabase `generate-trip-preview` edge function.
 *
 * Why: iMessage/OG scrapers do not execute SPA JS, so we must serve OG tags at the URL itself.
 * We avoid needing service-role secrets in Vercel by proxying to Supabase (which already uses
 * service-role internally and is configured as public).
 */
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const tripIdRaw = (req.query.tripId ?? req.query.tripID ?? req.query.id) as string | string[] | undefined;
    const tripId = Array.isArray(tripIdRaw) ? tripIdRaw[0] : tripIdRaw;

    if (!tripId) {
      res.status(400).setHeader('Content-Type', 'text/plain').send('Missing tripId');
      return;
    }

    const supabaseProjectRef =
      process.env.VITE_SUPABASE_URL?.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ??
      'jmjiyekmxwsxkfnqwyaa';
    const supabaseUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/generate-trip-preview?tripId=${encodeURIComponent(tripId)}`;

    const upstream = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        // Preserve UA for bot debugging; also prevents some caches from treating all responses equal.
        'User-Agent': req.headers['user-agent'] ?? 'chravel-preview-proxy',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    const body = await upstream.text();
    res.status(upstream.status);

    // Copy key headers (avoid hop-by-hop headers).
    const contentType = upstream.headers.get('content-type') ?? 'text/html; charset=utf-8';
    res.setHeader('Content-Type', contentType);

    const cacheControl = upstream.headers.get('cache-control');
    if (cacheControl) {
      res.setHeader('Cache-Control', cacheControl);
    }

    res.send(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).setHeader('Content-Type', 'text/plain').send(`Preview proxy error: ${message}`);
  }
}

