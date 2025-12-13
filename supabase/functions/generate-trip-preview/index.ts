import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Minimal HTML escaping to prevent user-provided strings (trip name/description)
 * from breaking meta tags or HTML structure.
 *
 * Note: OG scrapers do not execute JS, but they do parse HTML. Broken head tags
 * can result in "no preview" even when the endpoint is reachable.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Demo trip data with public Unsplash images for OG tags - matches tripsData.ts
const demoTrips: Record<string, {
  title: string;
  location: string;
  dateRange: string;
  description: string;
  coverPhoto: string;
  participantCount: number;
  tripType?: 'consumer' | 'pro' | 'event';
  themeColor?: string; // For events only
}> = {
  '1': {
    title: 'Spring Break Cancun 2026 Kappa Alpha Psi Trip',
    location: 'Cancun, Mexico',
    dateRange: 'Mar 15 - Mar 22, 2026',
    description: 'Brotherhood spring break getaway with beach activities, nightlife, and bonding experiences',
    coverPhoto: 'https://chravel.app/demo-covers/cancun-spring-break.webp',
    participantCount: 5
  },
  '2': {
    title: 'Tokyo Adventure',
    location: 'Tokyo, Japan',
    dateRange: 'Oct 5 - Oct 15, 2025',
    description: "Cultural exploration of Japan's capital with temples, modern tech districts, and amazing cuisine",
    coverPhoto: 'https://chravel.app/demo-covers/tokyo-adventure.webp',
    participantCount: 3
  },
  '3': {
    title: "Jack and Jill's Destination Wedding",
    location: 'Bali, Indonesia',
    dateRange: 'Dec 10 - Dec 20, 2025',
    description: 'Romantic destination wedding celebration with family and friends in paradise',
    coverPhoto: 'https://chravel.app/demo-covers/bali-destination-wedding.webp',
    participantCount: 4
  },
  '4': {
    title: "Kristen's Bachelorette Party",
    location: 'Nashville, TN',
    dateRange: 'Nov 8 - Nov 10, 2025',
    description: 'Epic bachelorette celebration with honky-tonk bars, live music, and unforgettable memories',
    coverPhoto: 'https://chravel.app/demo-covers/nashville-bachelorette.webp',
    participantCount: 6
  },
  '5': {
    title: 'Coachella Squad 2026',
    location: 'Indio, CA',
    dateRange: 'Apr 10 - Apr 13, 2026',
    description: 'Music festival adventure with top artists, desert vibes, and group camping',
    coverPhoto: 'https://chravel.app/demo-covers/coachella-festival-new.webp',
    participantCount: 5
  },
  '6': {
    title: 'Johnson Family Summer Vacay',
    location: 'Saratoga Springs, NY',
    dateRange: 'Jul 20 - Jul 28, 2025',
    description: 'Multi-generational family retreat with horse racing, spa time, and quality family bonding',
    coverPhoto: 'https://chravel.app/demo-covers/aspen-family-summer.webp',
    participantCount: 5
  },
  '7': {
    title: "Fantasy Football Chat's Annual Golf Outing",
    location: 'Phoenix, Arizona',
    dateRange: 'Feb 20 - Feb 23, 2025',
    description: "Annual guys' golf trip with tournaments, poker nights, and fantasy football draft",
    coverPhoto: 'https://chravel.app/demo-covers/phoenix-golf-outing.webp',
    participantCount: 6
  },
  '8': {
    title: 'Tulum Wellness Retreat',
    location: 'Tulum, Mexico',
    dateRange: 'Nov 10 - Nov 16, 2025',
    description: 'Yoga and wellness focused retreat with breathwork, meditation, and spa treatments',
    coverPhoto: 'https://chravel.app/demo-covers/tulum-yoga-wellness.webp',
    participantCount: 8
  },
  '9': {
    title: 'Newly Divorced Wine-Tasting Getaway',
    location: 'Napa Valley, CA',
    dateRange: 'May 2 - May 5, 2025',
    description: 'Celebratory wine country escape with tastings, spa treatments, and new beginnings',
    coverPhoto: 'https://chravel.app/demo-covers/napa-wine-getaway.webp',
    participantCount: 6
  },
  '10': {
    title: 'Corporate Holiday Ski Trip – Aspen',
    location: 'Aspen, CO',
    dateRange: 'Dec 12 - Dec 17, 2025',
    description: 'Company holiday celebration with skiing, team building, and winter activities',
    coverPhoto: 'https://chravel.app/demo-covers/aspen-corporate-ski.webp',
    participantCount: 10
  },
  '11': {
    title: 'Disney Cruise Family Vacation',
    location: 'Port Canaveral, FL',
    dateRange: 'Jun 15 - Jun 22, 2025',
    description: 'Magical family cruise with Disney characters, activities, and island adventures',
    coverPhoto: 'https://chravel.app/demo-covers/disney-family-cruise.webp',
    participantCount: 7
  },
  '12': {
    title: 'Yellowstone National-Park Hiking Adventure',
    location: 'Yellowstone, WY',
    dateRange: 'Jul 10 - Jul 17, 2025',
    description: 'Outdoor adventure exploring geysers, wildlife, and backcountry hiking trails',
    coverPhoto: 'https://chravel.app/demo-covers/yellowstone-hiking-group.webp',
    participantCount: 5
  },
  // Pro Trips (12) - grayscale backgrounds
  'lakers-road-trip': {
    title: 'LA Lakers Road Trip to Denver',
    location: 'Denver, CO',
    dateRange: 'Mar 8 - Mar 10, 2026',
    description: 'Lakers vs Nuggets playoff game with VIP tailgate and team hotel',
    coverPhoto: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=630&fit=crop',
    participantCount: 24,
    tripType: 'pro'
  },
  'beyonce-cowboy-carter-tour': {
    title: 'Beyoncé Cowboy Carter World Tour',
    location: 'Houston, TX → Atlanta, GA → Chicago, IL',
    dateRange: 'Jun 15 - Jun 28, 2026',
    description: 'Multi-city tour following Queen Bey with VIP packages and meet & greets',
    coverPhoto: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
    participantCount: 18,
    tripType: 'pro'
  },
  'eli-lilly-c-suite-retreat-2026': {
    title: 'Eli Lilly C-Suite Retreat 2026',
    location: 'Scottsdale, AZ',
    dateRange: 'Sep 12 - Sep 15, 2026',
    description: 'Executive leadership offsite with strategy sessions and team building',
    coverPhoto: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=630&fit=crop',
    participantCount: 45,
    tripType: 'pro'
  },
  'paul-george-elite-aau-nationals-2025': {
    title: 'Paul George Elite AAU Nationals 2025',
    location: 'Las Vegas, NV',
    dateRange: 'Jul 20 - Jul 27, 2025',
    description: 'Elite AAU basketball nationals with 17U team competing for championship',
    coverPhoto: 'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=1200&h=630&fit=crop',
    participantCount: 32,
    tripType: 'pro'
  },
  'osu-notredame-2025': {
    title: 'Ohio State vs Notre Dame 2025',
    location: 'South Bend, IN',
    dateRange: 'Sep 6 - Sep 7, 2025',
    description: 'Historic rivalry game with tailgate, alumni gathering, and game day experience',
    coverPhoto: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=630&fit=crop',
    participantCount: 28,
    tripType: 'pro'
  },
  'unc-lax-2025': {
    title: 'UNC Women\'s Lacrosse ACC Tournament',
    location: 'Durham, NC',
    dateRange: 'May 1 - May 4, 2025',
    description: 'ACC Championship tournament with team travel and family spectator coordination',
    coverPhoto: 'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=1200&h=630&fit=crop',
    participantCount: 38,
    tripType: 'pro'
  },
  'a16z-speedrun-2026': {
    title: 'a16z Speedrun Demo Day 2026',
    location: 'San Francisco, CA',
    dateRange: 'Mar 20 - Mar 22, 2026',
    description: 'Accelerator demo day with pitch prep, investor meetings, and networking',
    coverPhoto: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=630&fit=crop',
    participantCount: 12,
    tripType: 'pro'
  },
  'kai-druski-jake-adin-24hr-atl': {
    title: 'Druski x Adin Ross 24HR Stream ATL',
    location: 'Atlanta, GA',
    dateRange: 'Apr 5 - Apr 6, 2026',
    description: '24-hour livestream collab with production crew, guest appearances, and content',
    coverPhoto: 'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=1200&h=630&fit=crop',
    participantCount: 15,
    tripType: 'pro'
  },
  'tesla-cybertruck-roadshow-2025': {
    title: 'Tesla Cybertruck Roadshow 2025',
    location: 'Austin, TX → Phoenix, AZ → LA, CA',
    dateRange: 'Oct 1 - Oct 15, 2025',
    description: 'Multi-city product showcase with demo drives, media events, and launches',
    coverPhoto: 'https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=1200&h=630&fit=crop',
    participantCount: 22,
    tripType: 'pro'
  },
  'postmalone-jellyroll-tour-2026': {
    title: 'Post Malone x Jelly Roll Tour 2026',
    location: 'Nashville, TN → Memphis, TN → New Orleans, LA',
    dateRange: 'Aug 10 - Aug 20, 2026',
    description: 'Southern leg of the tour with crew travel, venue coordination, and afterparties',
    coverPhoto: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=630&fit=crop',
    participantCount: 35,
    tripType: 'pro'
  },
  'gs-campus-gt-2025': {
    title: 'Goldman Sachs Georgia Tech Recruiting',
    location: 'Atlanta, GA',
    dateRange: 'Oct 15 - Oct 17, 2025',
    description: 'Campus recruiting visit with info sessions, interviews, and networking dinners',
    coverPhoto: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=630&fit=crop',
    participantCount: 8,
    tripType: 'pro'
  },
  'nvidia-bowling-2025': {
    title: 'NVIDIA Employee Bowling Night',
    location: 'Santa Clara, CA',
    dateRange: 'Nov 8, 2025',
    description: 'Team building event with bowling tournament, prizes, and company celebration',
    coverPhoto: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=1200&h=630&fit=crop',
    participantCount: 120,
    tripType: 'pro'
  },
  // Demo Events (7) - themed color backgrounds
  'sxsw-2025': {
    title: 'South by Southwest 2025',
    location: 'Austin, TX',
    dateRange: 'Mar 7 - Mar 16, 2025',
    description: 'Annual tech, film, and music festival with panels, showcases, and networking',
    coverPhoto: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=630&fit=crop',
    participantCount: 500,
    tripType: 'event',
    themeColor: '#8B5CF6' // Purple
  },
  'wef-2025': {
    title: 'World Economic Forum 2025',
    location: 'Davos, Switzerland',
    dateRange: 'Jan 20 - Jan 24, 2025',
    description: 'Global leaders summit discussing economic policy, climate, and innovation',
    coverPhoto: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=630&fit=crop',
    participantCount: 250,
    tripType: 'event',
    themeColor: '#10B981' // Green
  },
  'money-2020-2025': {
    title: 'Money 20/20 Las Vegas 2025',
    location: 'Las Vegas, NV',
    dateRange: 'Oct 26 - Oct 29, 2025',
    description: 'The world\'s largest fintech event with payments innovation and financial services networking',
    coverPhoto: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=630&fit=crop',
    participantCount: 10000,
    tripType: 'event',
    themeColor: '#92400E' // Brown/amber
  },
  'grammys-2025': {
    title: 'Grammy Awards 2025',
    location: 'Los Angeles, CA',
    dateRange: 'Feb 2, 2025',
    description: 'Music\'s biggest night with red carpet, performances, and afterparties',
    coverPhoto: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=630&fit=crop',
    participantCount: 180,
    tripType: 'event',
    themeColor: '#D97706' // Gold/amber
  },
  'google-io-2026-event': {
    title: 'Google I/O 2026',
    location: 'Mountain View, CA',
    dateRange: 'May 12 - May 14, 2026',
    description: 'Annual developer conference with keynotes, workshops, and product launches',
    coverPhoto: 'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&h=630&fit=crop',
    participantCount: 400,
    tripType: 'event',
    themeColor: '#4285F4' // Google Blue
  },
  'essence-festival-2026': {
    title: 'Essence Festival 2026',
    location: 'New Orleans, LA',
    dateRange: 'Jul 3 - Jul 6, 2026',
    description: 'Celebration of Black culture with concerts, empowerment seminars, and cuisine',
    coverPhoto: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&h=630&fit=crop',
    participantCount: 350,
    tripType: 'event',
    themeColor: '#DC2626' // Red
  },
  'coachella-2026-event': {
    title: 'Coachella 2026',
    location: 'Indio, CA',
    dateRange: 'Apr 10 - Apr 19, 2026',
    description: 'Premier music and arts festival with headliners, art installations, and camping',
    coverPhoto: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1200&h=630&fit=crop',
    participantCount: 600,
    tripType: 'event',
    themeColor: '#F59E0B' // Orange
  }
};

// Helper to darken a hex color for gradients
function darkenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darken = (c: number) => Math.max(0, Math.floor(c * 0.6));
  return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
}

function generateHTML(trip: {
  title: string;
  location: string;
  dateRange: string;
  description: string;
  coverPhoto: string;
  participantCount: number;
  tripType?: 'consumer' | 'pro' | 'event';
  themeColor?: string;
}, tripId: string, canonicalUrl: string, appBaseUrl: string): string {
  const safeTitle = escapeHtml(trip.title);
  const safeLocation = escapeHtml(trip.location);
  const safeDateRange = escapeHtml(trip.dateRange);
  const safeDescription = escapeHtml(trip.description);
  const safeCoverPhoto = escapeHtml(trip.coverPhoto);

  // Where humans should land after unfurling (public preview page with auth handling).
  const appTripUrl = `${appBaseUrl}/trip/${encodeURIComponent(tripId)}/preview`;
  
  // Determine header style based on trip type
  const isEvent = trip.tripType === 'event' && trip.themeColor;
  const isPro = trip.tripType === 'pro';
  
  // For events with theme colors, use gradient background instead of cover photo
  // For pro trips, use grayscale gradient
  // For consumer trips, use cover photo
  const headerContent = isEvent
    ? `<div class="cover-gradient" style="background: linear-gradient(135deg, ${trip.themeColor} 0%, ${darkenColor(trip.themeColor!)} 100%); height: 200px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 48px;">🎪</span>
       </div>`
    : isPro
    ? `<div class="cover-gradient" style="background: linear-gradient(135deg, #374151 0%, #1f2937 100%); height: 200px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 48px;">🏢</span>
       </div>`
    : `<img src="${safeCoverPhoto}" alt="${safeTitle}" class="cover">`;

  // Type badge for non-consumer trips
  const typeBadge = isEvent 
    ? `<div class="type-badge event" style="background: ${trip.themeColor}; color: white; display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Event</div>`
    : isPro
    ? `<div class="type-badge pro" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Pro</div>`
    : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle} | Chravel</title>
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:type" content="website">
  <!-- IMPORTANT: og:url should match the URL being scraped -->
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="og:title" content="${safeTitle} • ${safeDateRange}">
  <meta property="og:description" content="${safeLocation} • ${trip.participantCount} Chravelers">
  <meta property="og:image" content="${safeCoverPhoto}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Chravel">
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${safeTitle} • ${safeDateRange}">
  <meta name="twitter:description" content="${safeLocation} • ${trip.participantCount} Chravelers">
  <meta name="twitter:image" content="${safeCoverPhoto}">
  
  <!-- Additional Meta Tags -->
  <meta name="description" content="${safeDescription}">

  <!-- Human redirect with 5s delay (bots ignore; humans see card briefly then redirect) -->
  <meta http-equiv="refresh" content="5;url=${escapeHtml(appTripUrl)}">
  
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
        <div class="meta-item">👥 ${trip.participantCount} travelers</div>
      </div>
      <a href="${escapeHtml(appTripUrl)}" class="cta">View Trip on Chravel</a>
    </div>
    <div class="logo">Powered by Chravel</div>
  </div>
</body>
</html>`;
}

serve(async (req: Request): Promise<Response> => {
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
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    /**
     * Canonical URL should match the URL being scraped (important for unfurl caching).
     * If you're proxying through a branded domain (e.g., a Worker at `p.chravel.app`),
     * pass `canonicalUrl` so OG tags match the branded URL (not the supabase.co URL).
     */
    const canonicalUrl = canonicalUrlParam && canonicalUrlParam.startsWith('http')
      ? canonicalUrlParam
      : new URL(req.url).toString();

    // Determine app base URL for human redirect / CTAs.
    const appBaseUrl = appBaseUrlParam && appBaseUrlParam.startsWith('http')
      ? appBaseUrlParam
      : (Deno.env.get('SITE_URL') || 'https://chravel.app');
    
    // Check if it's a demo trip (numeric ID 1-12)
    if (demoTrips[tripId]) {
      console.log('[generate-trip-preview] Serving demo trip:', tripId);
      const html = generateHTML(demoTrips[tripId], tripId, canonicalUrl, appBaseUrl);
      return new Response(html, {
        status: 200,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      });
    }

    // For real trips (UUID format), query Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: trip, error } = await supabase
      .from('trips')
      .select('name, description, destination, start_date, end_date, cover_image_url')
      .eq('id', tripId)
      .maybeSingle();

    if (error) {
      console.error('[generate-trip-preview] Database error:', error);
      return new Response('Error fetching trip', { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    if (!trip) {
      console.log('[generate-trip-preview] Trip not found:', tripId);
      return new Response('Trip not found', { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
      });
    }

    // Get participant count
    const { count: participantCount } = await supabase
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    // Format dates
    const startDate = trip.start_date ? new Date(trip.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const endDate = trip.end_date ? new Date(trip.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    const dateRange = startDate && endDate ? `${startDate} - ${endDate}` : 'Dates TBD';

    const tripData = {
      title: trip.name || 'Untitled Trip',
      location: trip.destination || 'Location TBD',
      dateRange,
      description: trip.description || 'An amazing adventure awaits!',
      coverPhoto: trip.cover_image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&h=630&fit=crop',
      participantCount: participantCount || 1
    };

    console.log('[generate-trip-preview] Serving real trip:', tripId, tripData.title);
    const html = generateHTML(tripData, tripId, canonicalUrl, appBaseUrl);
    
    return new Response(html, {
      status: 200,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error('[generate-trip-preview] Error:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
});
