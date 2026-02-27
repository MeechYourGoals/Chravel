import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[generate-invite-preview] ${step}${detailsStr}`);
};

// Helper to escape HTML entities
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Demo covers base URL - Supabase Storage
const DEMO_COVERS_BASE =
  'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers';

// Demo trip data with Supabase Storage images for OG tags
// IMPORTANT: Keep in sync with src/data/tripsData.ts - this is the source of truth for OG previews
const demoTrips: Record<
  string,
  {
    title: string;
    location: string;
    dateRange: string;
    description: string;
    coverPhoto: string;
    participantCount: number;
    tripType?: 'consumer' | 'pro' | 'event';
    themeColor?: string; // For events only
  }
> = {
  // Consumer Trips (1-12) - Using Supabase Storage images
  '1': {
    title: 'Spring Break Cancun 2026 – Fraternity Trip',
    location: 'Cancun, Mexico',
    dateRange: 'Mar 15 - Mar 22, 2026',
    description:
      'Brotherhood spring break getaway with beach activities, nightlife, and bonding experiences',
    coverPhoto: `${DEMO_COVERS_BASE}/cancun-spring-break.jpg`,
    participantCount: 14,
  },
  '2': {
    title: 'Tokyo Adventure',
    location: 'Tokyo, Japan',
    dateRange: 'Oct 5 - Oct 15, 2026',
    description:
      "Cultural exploration of Japan's capital with temples, modern tech districts, and amazing cuisine",
    coverPhoto: `${DEMO_COVERS_BASE}/tokyo-adventure.jpg`,
    participantCount: 12,
  },
  '3': {
    title: "The Tyler's Tie The Knot",
    location: 'Bali, Indonesia',
    dateRange: 'Dec 10 - Dec 12, 2026',
    description:
      'Romantic destination wedding celebration with family and friends in paradise, featuring welcome dinner, ceremony, and reception',
    coverPhoto: `${DEMO_COVERS_BASE}/bali-destination-wedding.jpg`,
    participantCount: 63,
  },
  '4': {
    title: "Kristen Goldberg's Bachelorette Party",
    location: 'Nashville, TN',
    dateRange: 'Nov 8 - Nov 10, 2026',
    description:
      'Epic bachelorette celebration with honky-tonk bars, live music, spa day, karaoke, and unforgettable memories across multiple Nashville venues',
    coverPhoto: `${DEMO_COVERS_BASE}/nashville-bachelorette.jpg`,
    participantCount: 22,
  },
  '5': {
    title: 'Coachella Squad 2026',
    location: 'Indio, CA',
    dateRange: 'Apr 10 - Apr 13, 2026',
    description: 'Music festival adventure with top artists, desert vibes, and group camping',
    coverPhoto: `${DEMO_COVERS_BASE}/coachella-festival.jpg`,
    participantCount: 22,
  },
  '6': {
    title: "Cameron Knight's Dubai Birthday",
    location: 'Dubai, UAE',
    dateRange: 'Jul 5 - Jul 9, 2026',
    description:
      'Luxury birthday celebration in Dubai featuring Burj Khalifa, desert safari, yacht party, and fine dining',
    coverPhoto: `${DEMO_COVERS_BASE}/dubai-birthday.jpg`,
    participantCount: 8,
  },
  '7': {
    title: "Fantasy Football Chat's Annual Golf Outing",
    location: 'Phoenix, Arizona',
    dateRange: 'Feb 20 - Feb 23, 2026',
    description:
      "Annual guys' golf trip with tournaments, poker nights, and fantasy football draft",
    coverPhoto: `${DEMO_COVERS_BASE}/phoenix-golf-outing.jpg`,
    participantCount: 6,
  },
  '8': {
    title: 'Tulum Wellness Retreat',
    location: 'Tulum, Mexico',
    dateRange: 'Nov 10 - Nov 23, 2026',
    description:
      'Yoga and wellness focused retreat with breathwork, meditation, and spa treatments',
    coverPhoto: `${DEMO_COVERS_BASE}/tulum-yoga-wellness.jpg`,
    participantCount: 34,
  },
  '9': {
    title: "Sarah Gardelin's Promotion Celebration",
    location: 'Napa Valley, CA',
    dateRange: 'May 2 - May 5, 2026',
    description:
      'Celebratory wine country escape with close friends to mark a major career milestone, featuring tastings, spa treatments, and new adventures',
    coverPhoto: `${DEMO_COVERS_BASE}/napa-wine-getaway.jpg`,
    participantCount: 6,
  },
  '10': {
    title: 'Corporate Holiday Ski Trip – Aspen',
    location: 'Aspen, CO',
    dateRange: 'Dec 12 - Dec 15, 2026',
    description:
      'Company holiday celebration with skiing, team building, and winter activities featuring corporate lodging, group ski lessons, and team dinners',
    coverPhoto: `${DEMO_COVERS_BASE}/aspen-corporate-ski.jpg`,
    participantCount: 44,
  },
  '11': {
    title: 'Disney Cruise Family Vacation',
    location: 'Port Canaveral, FL',
    dateRange: 'Jun 15 - Jun 22, 2026',
    description: 'Magical family cruise with Disney characters, activities, and island adventures',
    coverPhoto: `${DEMO_COVERS_BASE}/disney-family-cruise.jpg`,
    participantCount: 7,
  },
  '12': {
    title: 'Yellowstone National-Park Hiking Adventure',
    location: 'Yellowstone, WY',
    dateRange: 'Jul 10 - Jul 17, 2026',
    description: 'Outdoor adventure exploring geysers, wildlife, and backcountry hiking trails',
    coverPhoto: `${DEMO_COVERS_BASE}/yellowstone-hiking-group.jpg`,
    participantCount: 5,
  },
  // Pro Trips - grayscale backgrounds
  'lakers-road-trip': {
    title: 'Lakers Road Trip – Phoenix Away Game',
    location: 'Phoenix, AZ',
    dateRange: 'Mar 5 - Mar 7, 2026',
    description:
      'Road game logistics for players, coaches, and support staff with coordinated travel and accommodations',
    coverPhoto: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=630&fit=crop',
    participantCount: 45,
    tripType: 'pro',
  },
  'beyonce-cowboy-carter-tour': {
    title: 'Beyoncé Cowboy Carter Tour',
    location: 'Houston TX → Dallas TX → Atlanta GA',
    dateRange: 'Jun 15 - Jul 30, 2026',
    description:
      'Multi-city stadium tour with crew coordination, venue logistics, and production schedules',
    coverPhoto:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
    participantCount: 150,
    tripType: 'pro',
  },
  'duke-basketball-acc-tournament': {
    title: 'Duke Basketball – ACC Tournament',
    location: 'Charlotte, NC',
    dateRange: 'Mar 11 - Mar 15, 2026',
    description:
      'Tournament travel for the Blue Devils with game prep, team meals, and media sessions',
    coverPhoto:
      'https://images.unsplash.com/photo-1504450758481-7338bbe75c8e?w=1200&h=630&fit=crop',
    participantCount: 35,
    tripType: 'pro',
  },
  'morgan-wallen-one-night-tour': {
    title: 'Morgan Wallen – One Night At A Time Tour',
    location: 'Nashville TN → Chicago IL → Denver CO',
    dateRange: 'May 1 - Aug 30, 2026',
    description:
      'National stadium tour with band coordination, production crew, and merchandise logistics',
    coverPhoto:
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&h=630&fit=crop',
    participantCount: 85,
    tripType: 'pro',
  },
  'tech-sales-kickoff': {
    title: 'Q1 Sales Kickoff – Las Vegas',
    location: 'Las Vegas, NV',
    dateRange: 'Jan 15 - Jan 18, 2026',
    description:
      'Annual sales team alignment with training sessions, team building, and strategy planning',
    coverPhoto:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=630&fit=crop',
    participantCount: 200,
    tripType: 'pro',
  },
  'stanford-study-abroad': {
    title: 'Stanford Florence Study Abroad',
    location: 'Florence, Italy',
    dateRange: 'Sep 1 - Dec 15, 2025',
    description:
      'Semester abroad program with class schedules, cultural excursions, and student housing',
    coverPhoto:
      'https://images.unsplash.com/photo-1476362555312-ab9e108a0b7e?w=1200&h=630&fit=crop',
    participantCount: 45,
    tripType: 'pro',
  },
  'youtube-creator-retreat': {
    title: 'YouTube Creator Summit – Malibu',
    location: 'Malibu, CA',
    dateRange: 'Apr 20 - Apr 25, 2026',
    description:
      'Content creator collaboration retreat with workshops, brand meetings, and content shoots',
    coverPhoto:
      'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=1200&h=630&fit=crop',
    participantCount: 30,
    tripType: 'pro',
  },
  'pharma-conference': {
    title: 'BioTech Annual Conference',
    location: 'San Diego, CA',
    dateRange: 'Oct 8 - Oct 12, 2025',
    description: 'Industry conference with keynotes, networking events, and partnership meetings',
    coverPhoto:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=630&fit=crop',
    participantCount: 500,
    tripType: 'pro',
  },
  'high-school-band-competition': {
    title: 'State Marching Band Championship',
    location: 'Austin, TX',
    dateRange: 'Nov 1 - Nov 3, 2025',
    description:
      'State championship competition with performance schedules, equipment logistics, and parent coordination',
    coverPhoto:
      'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=630&fit=crop',
    participantCount: 120,
    tripType: 'pro',
  },
  'film-production-shoot': {
    title: 'Indie Film Production – Desert Shoot',
    location: 'Joshua Tree, CA',
    dateRange: 'Mar 1 - Mar 20, 2026',
    description:
      'On-location film production with cast, crew schedules, equipment rentals, and catering',
    coverPhoto:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=630&fit=crop',
    participantCount: 60,
    tripType: 'pro',
  },
  'real-estate-investor-tour': {
    title: 'Multi-Family Property Tour – Atlanta',
    location: 'Atlanta, GA',
    dateRange: 'Feb 10 - Feb 14, 2026',
    description:
      'Investment property tour with site visits, due diligence meetings, and networking dinners',
    coverPhoto: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=630&fit=crop',
    participantCount: 25,
    tripType: 'pro',
  },
  'esports-tournament': {
    title: 'League of Legends Championship Finals',
    location: 'Los Angeles, CA',
    dateRange: 'Aug 20 - Aug 25, 2026',
    description:
      'Championship tournament with team practice schedules, media appearances, and fan events',
    coverPhoto: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=630&fit=crop',
    participantCount: 40,
    tripType: 'pro',
  },
  // Events - themed color backgrounds
  'sxsw-2025': {
    title: 'SXSW 2025',
    location: 'Austin, TX',
    dateRange: 'Mar 7 - Mar 16, 2025',
    description:
      'Annual tech, film, and music festival with panels, showcases, and networking events',
    coverPhoto:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=630&fit=crop',
    participantCount: 500,
    tripType: 'event',
    themeColor: '#8B5CF6', // Purple
  },
  'wef-2025': {
    title: 'World Economic Forum 2025',
    location: 'Davos, Switzerland',
    dateRange: 'Jan 20 - Jan 24, 2025',
    description:
      'Global leaders summit discussing economic challenges, climate action, and international cooperation',
    coverPhoto:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=630&fit=crop',
    participantCount: 3000,
    tripType: 'event',
    themeColor: '#10B981', // Green
  },
  'money-2020-2025': {
    title: 'Money 20/20 Las Vegas 2025',
    location: 'Las Vegas, NV',
    dateRange: 'Oct 26 - Oct 29, 2025',
    description:
      "The world's largest fintech event with payments innovation and financial services networking",
    coverPhoto: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=630&fit=crop',
    participantCount: 10000,
    tripType: 'event',
    themeColor: '#92400E', // Brown/amber
  },
  'coachella-2026': {
    title: 'Coachella Valley Music and Arts Festival 2026',
    location: 'Indio, CA',
    dateRange: 'Apr 10 - Apr 19, 2026',
    description:
      'Premier music and arts festival featuring top artists, art installations, and immersive experiences',
    coverPhoto:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&h=630&fit=crop',
    participantCount: 125000,
    tripType: 'event',
    themeColor: '#F59E0B', // Orange
  },
  'art-basel-miami-2025': {
    title: 'Art Basel Miami Beach 2025',
    location: 'Miami Beach, FL',
    dateRange: 'Dec 5 - Dec 8, 2025',
    description:
      'International art fair showcasing modern and contemporary works from leading galleries worldwide',
    coverPhoto:
      'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1200&h=630&fit=crop',
    participantCount: 83000,
    tripType: 'event',
    themeColor: '#EC4899', // Pink
  },
  'ted-2026': {
    title: 'TED 2026: The Future of Everything',
    location: 'Vancouver, BC',
    dateRange: 'Apr 14 - Apr 18, 2026',
    description:
      'Annual TED conference featuring breakthrough ideas in technology, entertainment, and design',
    coverPhoto:
      'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&h=630&fit=crop',
    participantCount: 2000,
    tripType: 'event',
    themeColor: '#DC2626', // Red
  },
  'super-bowl-2026': {
    title: 'Super Bowl LX Watch Party',
    location: 'Santa Clara, CA',
    dateRange: 'Feb 8, 2026',
    description:
      'Ultimate Super Bowl experience with premium viewing, tailgate parties, and championship atmosphere',
    coverPhoto:
      'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1200&h=630&fit=crop',
    participantCount: 70000,
    tripType: 'event',
    themeColor: '#1D4ED8', // Blue
  },
};

// Helper to darken a hex color for gradients
function darkenColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darken = (c: number) => Math.max(0, Math.floor(c * 0.6));
  return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
}

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
  inviteCode: string,
  baseUrl: string,
  canonicalUrl?: string | null,
): string {
  const joinUrl = `${baseUrl}/join/${inviteCode}`;
  // Use canonical URL (the branded unfurl URL) for og:url when provided
  const ogUrl = canonicalUrl || joinUrl;

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
  const isEvent = trip.tripType === 'event' && trip.themeColor;
  const isPro = trip.tripType === 'pro';

  // Always use cover photo for all trip types (consumer, pro, event)
  // This ensures consistent preview behavior and uses the actual uploaded cover photo
  const headerContent = `<img src="${escapeHtml(trip.coverPhoto)}" alt="${safeTitle}" class="cover">`;

  // Badge styling based on trip type
  const badgeStyle =
    isEvent && trip.themeColor
      ? `background: ${trip.themeColor};`
      : isPro
        ? `background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);`
        : `background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);`;

  const badgeText = isEvent
    ? '🎪 Event Invitation'
    : isPro
      ? '🏢 Pro Trip Invitation'
      : "✨ You're Invited!";

  const badgeTextColor = isEvent || isPro ? '#fff' : '#000';
  const datesColor = isEvent && trip.themeColor ? trip.themeColor : '#a855f7';

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
  <meta property="og:image" content="${escapeHtml(trip.coverPhoto)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="ChravelApp">
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${escapeHtml(trip.coverPhoto)}">
  
  <!-- Additional Meta Tags -->
  <meta name="description" content="${safeDescription}">
  
  
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
      <a href="${escapeHtml(joinUrl)}" class="cta">Join This Trip</a>
    </div>
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
      if (demoTrips[tripId]) {
        logStep('Serving demo invite', { tripId });
        const html = generateInviteHTML(demoTrips[tripId], inviteCode, baseUrl, canonicalUrl);
        return new Response(html, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }

      // Fallback: try just the second part for simple numeric IDs
      if (parts[1] && demoTrips[parts[1]]) {
        logStep('Serving demo invite (numeric)', { tripId: parts[1] });
        const html = generateInviteHTML(demoTrips[parts[1]], inviteCode, baseUrl, canonicalUrl);
        return new Response(html, {
          status: 200,
          headers: {
            ...corsHeaders,
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
      // Return a generic "invite not found" page with OG tags
      const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trip Invite | ChravelApp</title>
  <meta property="og:title" content="You're Invited! | ChravelApp">
  <meta property="og:description" content="Join a trip on ChravelApp - The Group Chat Travel App">
  <meta property="og:image" content="https://chravel.app/chravel-logo.png">
  <meta property="og:site_name" content="ChravelApp">
  <meta name="twitter:card" content="summary_large_image">
  
</head>
<body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #1a1a2e; color: white;">
  <p>Redirecting to ChravelApp...</p>
</body>
</html>`;
      return new Response(notFoundHtml, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // Fetch trip details including trip_type for proper badge display
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('name, description, destination, start_date, end_date, cover_image_url, trip_type')
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

    const tripData = {
      title: trip.name || 'Untitled Trip',
      location: trip.destination || 'Location TBD',
      dateRange,
      description: trip.description || 'An amazing adventure awaits!',
      coverPhoto: trip.cover_image_url || 'https://chravel.app/chravelapp-og-20251219.png',
      participantCount: participantCount || 1,
      tripType: trip.trip_type as 'consumer' | 'pro' | 'event' | undefined,
    };

    logStep('Serving invite preview', { tripId: invite.trip_id, title: tripData.title });
    const html = generateInviteHTML(tripData, inviteCode, baseUrl, canonicalUrl);

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    logStep('Error', { message: error instanceof Error ? error.message : String(error) });
    return new Response('Internal server error', {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  }
});
