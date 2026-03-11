import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  escapeHtml,
  OG_FALLBACK_IMAGE,
  toLandscapeOgImage,
  DEMO_TRIPS,
  safeHexColor,
  getOgSecurityHeaders,
} from '../_shared/ogUtils.ts';
import type { DemoTrip } from '../_shared/ogUtils.ts';

function generateHTML(
  trip: {
    title: string;
    location: string;
    dateRange: string;
    description: string;
    coverPhoto: string;
    participantCount: number;
    tripType?: 'consumer' | 'pro' | 'event';
    themeColor?: string;
  },
  tripId: string,
  canonicalUrl: string,
  appBaseUrl: string,
): string {
  const safeTitle = escapeHtml(trip.title);
  const safeLocation = escapeHtml(trip.location);
  const safeDateRange = escapeHtml(trip.dateRange);
  const safeDescription = escapeHtml(trip.description);
  const safeCoverPhoto = escapeHtml(trip.coverPhoto);
  // OG image must be landscape (1200x630) for stacked layout in messaging apps
  const ogImageUrl = escapeHtml(toLandscapeOgImage(trip.coverPhoto));

  // Always route to preview page — invite codes are resolved client-side to avoid
  // leaking live tokens in publicly-scrapable OG HTML.
  const appTripUrl = `${appBaseUrl}/trip/${encodeURIComponent(tripId)}/preview`;

  // Determine trip type for badge display
  const safeTheme = safeHexColor(trip.themeColor);
  const isEvent = trip.tripType === 'event' && safeTheme;
  const isPro = trip.tripType === 'pro';

  // Always use cover photo for all trip types (consumer, pro, event)
  // This ensures consistent preview behavior across all trip types
  const headerContent = `<img src="${safeCoverPhoto}" alt="${safeTitle}" class="cover">`;

  // Type badge for non-consumer trips
  const typeBadge = isEvent
    ? `<div class="type-badge event" style="background: ${safeTheme}; color: white; display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Event</div>`
    : isPro
      ? `<div class="type-badge pro" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Pro</div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} | ChravelApp</title>

  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="website">
  <!-- IMPORTANT: og:url should match the URL being scraped -->
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${safeTitle} • ${safeLocation} • ${safeDateRange}">
  <meta property="og:description" content="📍 ${safeLocation} • 📅 ${safeDateRange} • ${trip.participantCount} Chravelers">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="ChravelApp">

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle} • ${safeLocation} • ${safeDateRange}">
  <meta name="twitter:description" content="📍 ${safeLocation} • 📅 ${safeDateRange} • ${trip.participantCount} Chravelers">
  <meta name="twitter:image" content="${ogImageUrl}">

  <!-- Additional Meta Tags -->
  <meta name="description" content="${safeDescription}">

  <!-- Auto-redirect real users to the app (crawlers ignore meta refresh) -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(appTripUrl)}">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      overflow: hidden;
      max-width: 400px;
      width: 100%;
      backdrop-filter: blur(10px);
    }
    .cover {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    .content {
      padding: 24px;
    }
    .title {
      color: #fff;
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .location {
      color: #fbbf24;
      font-size: 14px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .description {
      color: rgba(255, 255, 255, 0.7);
      font-size: 14px;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    .meta {
      display: flex;
      gap: 16px;
      color: rgba(255, 255, 255, 0.6);
      font-size: 13px;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cta {
      display: block;
      background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
      color: #000;
      text-align: center;
      padding: 14px;
      font-weight: 600;
      text-decoration: none;
      margin-top: 20px;
      border-radius: 12px;
    }
    .cta:hover {
      opacity: 0.9;
    }
    .logo {
      text-align: center;
      margin-top: 24px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="card">
    ${headerContent}
    <div class="content">
      ${typeBadge}
      <h1 class="title">${safeTitle}</h1>
      <div class="location">📍 ${safeLocation}</div>
      <p class="description">${safeDescription}</p>
      <div class="meta">
        <div class="meta-item">📅 ${safeDateRange}</div>
        <div class="meta-item">👥 ${trip.participantCount} Chravelers</div>
      </div>
      <a href="${escapeHtml(appTripUrl)}" class="cta">Open in ChravelApp</a>
    </div>

  </div>
</body>
</html>`;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tripId = url.searchParams.get('tripId');
    const canonicalUrlParam = url.searchParams.get('canonicalUrl');
    const appBaseUrlParam = url.searchParams.get('appBaseUrl');

    console.log('[generate-trip-preview] Request for tripId:', tripId);

    if (!tripId) {
      return new Response('Missing tripId parameter', {
        status: 400,
        headers: { ...corsHeaders, ...getOgSecurityHeaders(), 'Content-Type': 'text/plain' },
      });
    }

    /**
     * Canonical URL should match the URL being scraped (important for unfurl caching).
     * If you're proxying through a branded domain (e.g., a Worker at `p.chravel.app`),
     * pass `canonicalUrl` so OG tags match the branded URL (not the supabase.co URL).
     */
    const canonicalUrl =
      canonicalUrlParam && canonicalUrlParam.startsWith('http')
        ? canonicalUrlParam
        : new URL(req.url).toString();

    // Determine app base URL for human redirect / CTAs.
    const appBaseUrl =
      appBaseUrlParam && appBaseUrlParam.startsWith('http')
        ? appBaseUrlParam
        : Deno.env.get('SITE_URL') || 'https://chravel.app';

    // Check if it's a demo trip (numeric ID 1-12)
    if (DEMO_TRIPS[tripId]) {
      console.log('[generate-trip-preview] Serving demo trip:', tripId);
      const html = generateHTML(DEMO_TRIPS[tripId], tripId, canonicalUrl, appBaseUrl);
      return new Response(html, {
        status: 200,
        headers: {
          ...corsHeaders,
          ...getOgSecurityHeaders(),
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    }

    // For real trips (UUID format), query Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: trip, error } = await supabase
      .from('trips')
      .select(
        'name, description, destination, start_date, end_date, cover_image_url, trip_type, updated_at',
      )
      .eq('id', tripId)
      .maybeSingle();

    if (error) {
      console.error('[generate-trip-preview] Database error:', error);
      return new Response('Error fetching trip', {
        status: 500,
        headers: { ...corsHeaders, ...getOgSecurityHeaders(), 'Content-Type': 'text/plain' },
      });
    }

    if (!trip) {
      console.log('[generate-trip-preview] Trip not found:', tripId);
      return new Response('Trip not found', {
        status: 404,
        headers: { ...corsHeaders, ...getOgSecurityHeaders(), 'Content-Type': 'text/plain' },
      });
    }

    // Get participant count
    const { count: participantCount } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    // Format dates
    const startDate = trip.start_date
      ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';
    const endDate = trip.end_date
      ? new Date(trip.end_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';
    const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : 'Dates TBD';

    const tripData = {
      title: trip.name || 'Untitled Trip',
      location: trip.destination || 'Location TBD',
      dateRange,
      description: trip.description || 'An amazing adventure awaits!',
      coverPhoto: trip.cover_image_url || 'https://chravel.app/chravelapp-og-20251219.png',
      participantCount: participantCount || 1,
      tripType: trip.trip_type as 'consumer' | 'pro' | 'event' | undefined,
    };

    console.log('[generate-trip-preview] Serving real trip:', tripId, tripData.title);
    const html = generateHTML(tripData, tripId, canonicalUrl, appBaseUrl);

    // Cache busting ETag based on updated_at
    const etag = `"trip-${tripId}-${new Date(trip.updated_at || trip.start_date || '').getTime()}"`;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        ...getOgSecurityHeaders(),
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
        ETag: etag,
      },
    });
  } catch (error) {
    console.error('[generate-trip-preview] Error:', error);
    return new Response('Internal server error', {
      status: 500,
      headers: { ...corsHeaders, ...getOgSecurityHeaders(), 'Content-Type': 'text/plain' },
    });
  }
});
