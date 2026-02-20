import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SHARE-PREVIEW] ${step}${detailsStr}`);
};

const DEFAULT_IMAGE = 'https://chravel.app/chravelapp-og-20251219.png';
const CHRAVEL_LOGO =
  'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/assets/chravel-logo.png';

function formatDateRange(startDate: string | null, endDate: string | null): string {
  if (!startDate) return '';

  const start = new Date(startDate);
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (endDate) {
    const end = new Date(endDate);
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${startStr} - ${endStr}`;
  }
  return startStr;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateOGHtml(params: {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  siteName: string;
  type: 'trip' | 'event' | 'pro';
  destination?: string;
  dateRange?: string;
  memberCount?: number;
}): string {
  const { title, description, imageUrl, url, siteName, type, destination, dateRange, memberCount } =
    params;

  const typeLabel = type === 'event' ? 'Event' : type === 'pro' ? 'Pro Trip' : 'Trip';

  // Build an OG title that always includes location so it appears
  // in iMessage / SMS link previews where description is often hidden.
  const ogTitleParts = [title];
  if (destination) ogTitleParts.push(destination);
  if (dateRange) ogTitleParts.push(dateRange);
  const ogTitle = ogTitleParts.join(' \u2022 ');

  const fullDescription = [
    destination ? `\uD83D\uDCCD ${destination}` : '',
    dateRange ? `\uD83D\uDCC5 ${dateRange}` : '',
    memberCount !== undefined ? `${memberCount} member${memberCount !== 1 ? 's' : ''}` : '',
    description,
  ]
    .filter(Boolean)
    .join(' \u2022 ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ogTitle)} - ChravelApp</title>

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:title" content="${escapeHtml(ogTitle)}">
  <meta property="og:description" content="${escapeHtml(fullDescription)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="ChravelApp">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${escapeHtml(url)}">
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
  <meta name="twitter:description" content="${escapeHtml(fullDescription)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">

  <!-- Apple iMessage -->
  <meta name="apple-mobile-web-app-title" content="${escapeHtml(ogTitle)}">

  <!-- Redirect to actual app -->
  <meta http-equiv="refresh" content="0; url=${escapeHtml(url)}">

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
      text-align: center;
    }
    .card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 24px;
      padding: 40px;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .loader {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 { margin: 0 0 10px; font-size: 24px; }
    p { margin: 0; opacity: 0.7; }
    .badge {
      display: inline-block;
      background: rgba(52, 152, 219, 0.2);
      color: #3498db;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="loader"></div>
    <div class="badge">${escapeHtml(typeLabel)}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>Redirecting to ChravelApp...</p>
  </div>
</body>
</html>`;
}

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Function started');

    const url = new URL(req.url);
    const inviteCode = url.searchParams.get('code');
    const tripId = url.searchParams.get('tripId');

    if (!inviteCode && !tripId) {
      logStep('ERROR: No code or tripId provided');
      return new Response('Missing code or tripId parameter', { status: 400 });
    }

    // Create Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    let tripData: {
      id: string;
      name: string;
      destination: string | null;
      start_date: string | null;
      end_date: string | null;
      cover_image_url: string | null;
      trip_type: string | null;
      description: string | null;
    } | null = null;

    let memberCount = 0;
    let redirectUrl = '';
    const baseAppUrl = Deno.env.get('APP_URL') || 'https://app.chravel.com';

    if (inviteCode) {
      // Lookup by invite code
      logStep('Looking up invite', { code: inviteCode.substring(0, 8) + '...' });

      const { data: invite, error: inviteError } = await supabaseClient
        .from('trip_invites')
        .select('trip_id, is_active, expires_at, max_uses, current_uses')
        .eq('code', inviteCode)
        .single();

      if (inviteError || !invite) {
        logStep('Invite not found');
        // Return a generic preview for invalid invites
        const html = generateOGHtml({
          title: 'Join a Trip on Chravel',
          description: "You've been invited to join a trip! Click to see details.",
          imageUrl: DEFAULT_IMAGE,
          url: `${baseAppUrl}/join/${inviteCode}`,
          siteName: 'ChravelApp',
          type: 'trip',
        });
        return new Response(html, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // Validate invite
      if (
        !invite.is_active ||
        (invite.expires_at && new Date(invite.expires_at) < new Date()) ||
        (invite.max_uses && invite.current_uses >= invite.max_uses)
      ) {
        logStep('Invite invalid/expired');
        const html = generateOGHtml({
          title: 'Invite Expired',
          description: 'This invite link is no longer valid. Please request a new one.',
          imageUrl: DEFAULT_IMAGE,
          url: `${baseAppUrl}/join/${inviteCode}`,
          siteName: 'ChravelApp',
          type: 'trip',
        });
        return new Response(html, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // Fetch trip details
      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select(
          'id, name, destination, start_date, end_date, cover_image_url, trip_type, description',
        )
        .eq('id', invite.trip_id)
        .single();

      if (tripError || !trip) {
        logStep('Trip not found');
        const html = generateOGHtml({
          title: 'Trip Not Found',
          description: 'This trip may have been deleted.',
          imageUrl: DEFAULT_IMAGE,
          url: `${baseAppUrl}/join/${inviteCode}`,
          siteName: 'ChravelApp',
          type: 'trip',
        });
        return new Response(html, {
          headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      tripData = trip;
      redirectUrl = `${baseAppUrl}/join/${inviteCode}`;

      // Get member count
      const { count } = await supabaseClient
        .from('trip_members')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', invite.trip_id);

      memberCount = count || 0;
    } else if (tripId) {
      // Direct trip lookup
      logStep('Looking up trip', { tripId });

      const { data: trip, error: tripError } = await supabaseClient
        .from('trips')
        .select(
          'id, name, destination, start_date, end_date, cover_image_url, trip_type, description',
        )
        .eq('id', tripId)
        .single();

      if (tripError || !trip) {
        logStep('Trip not found');
        return new Response('Trip not found', { status: 404 });
      }

      tripData = trip;

      // Determine redirect URL based on trip type
      if (trip.trip_type === 'event') {
        redirectUrl = `${baseAppUrl}/event/${tripId}`;
      } else if (trip.trip_type === 'pro') {
        redirectUrl = `${baseAppUrl}/tour/pro/${tripId}`;
      } else {
        redirectUrl = `${baseAppUrl}/trip/${tripId}`;
      }

      // Get member count
      const { count } = await supabaseClient
        .from('trip_members')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId);

      memberCount = count || 0;
    }

    if (!tripData) {
      return new Response('Trip data not found', { status: 404 });
    }

    logStep('Generating preview', { tripName: tripData.name, tripType: tripData.trip_type });

    const tripType = (tripData.trip_type as 'trip' | 'event' | 'pro') || 'trip';
    const dateRange = formatDateRange(tripData.start_date, tripData.end_date);

    let title = `Join ${tripData.name}`;
    if (tripType === 'event') {
      title = `You're Invited: ${tripData.name}`;
    }

    const description =
      tripData.description ||
      `You've been invited to ${tripType === 'event' ? 'an event' : 'a trip'}! Click to see details and join.`;

    const html = generateOGHtml({
      title,
      description,
      imageUrl: tripData.cover_image_url || DEFAULT_IMAGE,
      url: redirectUrl,
      siteName: 'ChravelApp',
      type: tripType,
      destination: tripData.destination || undefined,
      dateRange: dateRange || undefined,
      memberCount,
    });

    logStep('Success', { title, redirectUrl });

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in share-preview', { message: errorMessage });

    // Return a fallback page
    const html = generateOGHtml({
      title: 'Join a Trip on Chravel',
      description: 'Plan and coordinate group travel with friends, family, or colleagues.',
      imageUrl: DEFAULT_IMAGE,
      url: 'https://app.chravel.com',
      siteName: 'ChravelApp',
      type: 'trip',
    });

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});
