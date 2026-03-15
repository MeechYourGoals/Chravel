import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import {
  escapeHtml,
  OG_FALLBACK_IMAGE,
  toLandscapeOgImage,
  isValidImageUrl,
  DEMO_TRIPS,
  safeHexColor,
  getOgSecurityHeaders,
} from '../_shared/ogUtils.ts';
import type { DemoTrip } from '../_shared/ogUtils.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[generate-invite-preview] ${step}${detailsStr}`);
};

function generateInviteHTML(
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
  baseUrl: string,
  canonicalUrl?: string | null,
  inviteCode?: string | null,
): string {
  // When we have an invite code, redirect directly to the join flow so the
  // code is preserved end-to-end. Fall back to the preview page otherwise.
  const appTripUrl = inviteCode
    ? `${baseUrl}/join/${encodeURIComponent(inviteCode)}`
    : `${baseUrl}/trip/${encodeURIComponent(tripId)}/preview`;
  // Use canonical URL (the branded unfurl URL) for og:url when provided
  const ogUrl = canonicalUrl || appTripUrl;

  // Safe values for OG tags
  const safeTitle = escapeHtml(trip.title);
  const safeDateRange = escapeHtml(trip.dateRange);
  const safeLocation = escapeHtml(trip.location);
  const safeDescription = escapeHtml(trip.description);

  // Format OG tags — location is included in the title so it always
  // appears in iMessage / SMS link previews (description is often hidden).
  const ogTitle = `You're Invited: ${safeTitle} • ${safeLocation} • ${safeDateRange}`;
  const ogDescription = `📍 ${safeLocation} • 📅 ${safeDateRange} • ${trip.participantCount} Chravelers`;

  // Determine trip type for badge display
  const safeTheme = safeHexColor(trip.themeColor);
  const isEvent = trip.tripType === 'event' && safeTheme;
  const isPro = trip.tripType === 'pro';

  // Always use cover photo for all trip types (consumer, pro, event)
  // This ensures consistent preview behavior and uses the actual uploaded cover photo
  const headerContent = `<img src="${escapeHtml(trip.coverPhoto)}" alt="${safeTitle}" class="cover">`;

  // Badge styling based on trip type
  const badgeStyle = isEvent
    ? `background: ${safeTheme};`
    : isPro
      ? `background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);`
      : `background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);`;

  const badgeText = isEvent
    ? '🎪 Event Invitation'
    : isPro
      ? '🏢 Pro Trip Invitation'
      : "✨ You're Invited!";

  const badgeTextColor = isEvent || isPro ? '#fff' : '#000';
  const datesColor = isEvent ? safeTheme : '#a855f7';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogTitle} | ChravelApp</title>

  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(ogUrl)}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${escapeHtml(toLandscapeOgImage(trip.coverPhoto))}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="ChravelApp">

  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${escapeHtml(toLandscapeOgImage(trip.coverPhoto))}">

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
    .badge {
      ${badgeStyle}
      color: ${badgeTextColor};
      text-align: center;
      padding: 8px;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
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
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .dates {
      color: ${datesColor};
      font-size: 14px;
      margin-bottom: 8px;
    }
    .location {
      color: #fbbf24;
      font-size: 14px;
      margin-bottom: 12px;
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
    .cta {
      display: block;
      ${badgeStyle}
      color: ${badgeTextColor};
      text-align: center;
      padding: 14px;
      font-weight: 600;
      text-decoration: none;
      margin-top: 20px;
      border-radius: 12px;
    }
    .logo {
      text-align: center;
      margin-top: 24px;
      color: rgba(255, 255, 255, 0.4);
      font-size: 12px;
    }
    .loading {
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 16px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${badgeText}</div>
    ${headerContent}
    <div class="content">
      <h1 class="title">${safeTitle}</h1>
      <div class="dates">📅 ${safeDateRange}</div>
      <div class="location">📍 ${safeLocation}</div>
      <p class="description">${safeDescription}</p>
      <div class="meta">
        <span>👥 ${trip.participantCount} Chravelers</span>
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
    const inviteCode = url.searchParams.get('code');
    const canonicalUrl = url.searchParams.get('canonicalUrl') || null;
    const appBaseUrl =
      url.searchParams.get('appBaseUrl') || Deno.env.get('SITE_URL') || 'https://chravel.app';

    logStep('Request received', {
      code: inviteCode?.substring(0, 12) + '...',
      canonicalUrl: canonicalUrl?.substring(0, 40),
    });

    if (!inviteCode) {
      return new Response('Missing code parameter', {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Determine base URL for links
    const baseUrl = appBaseUrl;

    // Check if it's a demo invite code (starts with "demo-")
    if (inviteCode.startsWith('demo-')) {
      // Extract trip ID from demo code (format: demo-{tripId}-{timestamp})
      const parts = inviteCode.split('-');
      // Handle multi-part trip IDs like "lakers-road-trip"
      const tripId = parts.slice(1, -1).join('-') || parts[1];

      // Check for direct trip ID match first
      if (DEMO_TRIPS[tripId]) {
        logStep('Serving demo invite', { tripId });
        const html = generateInviteHTML(DEMO_TRIPS[tripId], tripId, baseUrl, canonicalUrl);
        return new Response(html, {
          status: 200,
          headers: {
            ...corsHeaders,
            ...getOgSecurityHeaders(),
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // Fallback: try just the second part for simple numeric IDs
      if (parts[1] && DEMO_TRIPS[parts[1]]) {
        logStep('Serving demo invite (numeric)', { tripId: parts[1] });
        const html = generateInviteHTML(DEMO_TRIPS[parts[1]], parts[1], baseUrl, canonicalUrl);
        return new Response(html, {
          status: 200,
          headers: {
            ...corsHeaders,
            ...getOgSecurityHeaders(),
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    // For real invite codes, look up in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up the invite code
    const { data: invite, error: inviteError } = await supabase
      .from('trip_invites')
      .select('trip_id, is_active, expires_at')
      .eq('code', inviteCode)
      .maybeSingle();

    if (inviteError) {
      logStep('Database error fetching invite', { error: inviteError.message });
      return new Response('Error fetching invite', {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    if (!invite) {
      logStep('Invite not found', { code: inviteCode });
      // Return a proper 404 page — prevents social platforms from caching wrong metadata
      const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Invite Not Found | ChravelApp</title>
  <meta property="og:title" content="Invite Not Found | ChravelApp">
  <meta property="og:description" content="This invite link is invalid or has expired.">
  <meta property="og:image" content="${OG_FALLBACK_IMAGE}">
  <meta property="og:site_name" content="ChravelApp">
  <meta name="twitter:card" content="summary">
  <meta http-equiv="refresh" content="0; url=${baseUrl}/join/${encodeURIComponent(inviteCode)}">
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #1a1a2e; color: white;">
  <p>Redirecting to ChravelApp...</p>
</body>
</html>`;
      return new Response(notFoundHtml, {
        status: 404,
        headers: {
          ...corsHeaders,
          ...getOgSecurityHeaders(),
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Fetch trip details including trip_type and updated_at for proper badge display and cache busting
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select(
        'name, description, destination, start_date, end_date, cover_image_url, trip_type, updated_at',
      )
      .eq('id', invite.trip_id)
      .maybeSingle();

    if (tripError || !trip) {
      logStep('Trip not found', { tripId: invite.trip_id });
      return new Response('Trip not found', {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }

    // Get participant count
    const { count: participantCount } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', invite.trip_id);

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

    // Validate cover image URL to prevent non-image URLs (e.g. article pages)
    // from being used as og:image, which causes crawlers to scrape the wrong page
    if (trip.cover_image_url && !isValidImageUrl(trip.cover_image_url)) {
      console.warn(
        '[generate-invite-preview] Invalid cover image URL, using fallback:',
        trip.cover_image_url,
      );
    }

    const tripData = {
      title: trip.name || 'Untitled Trip',
      location: trip.destination || 'Location TBD',
      dateRange,
      description: trip.description || 'An amazing adventure awaits!',
      coverPhoto:
        trip.cover_image_url && isValidImageUrl(trip.cover_image_url)
          ? trip.cover_image_url
          : OG_FALLBACK_IMAGE,
      participantCount: participantCount || 1,
      tripType: trip.trip_type as 'consumer' | 'pro' | 'event' | undefined,
    };

    logStep('Serving invite preview', { tripId: invite.trip_id, title: tripData.title });
    const html = generateInviteHTML(tripData, invite.trip_id, baseUrl, canonicalUrl, inviteCode);

    // Build ETag from updated_at for cache busting
    const etag = trip.updated_at
      ? `"invite-${invite.trip_id}-${new Date(trip.updated_at).getTime()}"`
      : undefined;

    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      ...getOgSecurityHeaders(),
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    };
    if (etag) {
      responseHeaders['ETag'] = etag;
    }

    return new Response(html, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    logStep('Error', { message: error instanceof Error ? error.message : String(error) });
    return new Response('Internal server error', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  }
});
