/**
 * Shared utilities for OG/unfurl edge functions.
 *
 * Centralises escapeHtml, toLandscapeOgImage, and the canonical demo-trip
 * dataset so that generate-trip-preview, generate-invite-preview,
 * get-trip-preview, and share-preview all reference a single source of truth.
 */

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

/**
 * Minimal HTML escaping to prevent user-provided strings (trip name / description)
 * from breaking meta tags or HTML structure.
 *
 * OG scrapers do not execute JS but they *do* parse HTML, so broken head tags
 * can result in "no preview" even when the endpoint is reachable.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// ---------------------------------------------------------------------------
// Image helpers
// ---------------------------------------------------------------------------

/** Landscape branded fallback for trips without a cover photo (1200x630). */
export const OG_FALLBACK_IMAGE = 'https://chravel.app/chravelapp-og-landscape.png';

/** Demo covers base URL in Supabase Storage. */
const DEMO_COVERS_BASE =
  'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers';

/**
 * Transform a Supabase Storage URL to the image-render API for 1200x630 cropping.
 * Ensures og:image is always landscape so platforms show the stacked layout.
 * Non-storage URLs are returned as-is.
 */
export function toLandscapeOgImage(url: string): string {
  const STORAGE_OBJECT_PREFIX = 'jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/';
  if (url.includes(STORAGE_OBJECT_PREFIX)) {
    return (
      url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') +
      '?width=1200&height=630&resize=cover'
    );
  }
  return url;
}

// ---------------------------------------------------------------------------
// Hex-colour validation (for themeColor rendered into style attributes)
// ---------------------------------------------------------------------------

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Return the colour only if it matches a strict `#RRGGBB` pattern.
 * Prevents injection via style attributes when themeColor is interpolated
 * directly into CSS strings (e.g. `background: ${themeColor}`).
 */
export function safeHexColor(color: string | undefined): string | undefined {
  if (color && HEX_COLOR_RE.test(color)) return color;
  return undefined;
}

// ---------------------------------------------------------------------------
// Demo trip data – single source of truth
// ---------------------------------------------------------------------------

export interface DemoTrip {
  title: string;
  location: string;
  dateRange: string;
  description: string;
  coverPhoto: string;
  participantCount: number;
  tripType?: 'consumer' | 'pro' | 'event';
  themeColor?: string;
}

export const DEMO_TRIPS: Record<string, DemoTrip> = {
  // ── Consumer Trips (1-12) ──────────────────────────────────────────
  '1': {
    title: 'Spring Break Cancun 2026 \u2013 Fraternity Trip',
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
    title: 'Corporate Holiday Ski Trip \u2013 Aspen',
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

  // ── Pro Trips ──────────────────────────────────────────────────────
  'lakers-road-trip': {
    title: 'LA Lakers Road Trip to Denver',
    location: 'Denver, CO',
    dateRange: 'Mar 8 - Mar 10, 2026',
    description: 'Lakers vs Nuggets playoff game with VIP tailgate and team hotel',
    coverPhoto: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=630&fit=crop',
    participantCount: 24,
    tripType: 'pro',
  },
  'beyonce-cowboy-carter-tour': {
    title: 'Beyonc\u00e9 Cowboy Carter World Tour',
    location: 'Houston, TX \u2192 Atlanta, GA \u2192 Chicago, IL',
    dateRange: 'Jun 15 - Jun 28, 2026',
    description: 'Multi-city tour following Queen Bey with VIP packages and meet & greets',
    coverPhoto:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
    participantCount: 18,
    tripType: 'pro',
  },
  'eli-lilly-c-suite-retreat-2026': {
    title: 'Eli Lilly C-Suite Retreat 2026',
    location: 'Scottsdale, AZ',
    dateRange: 'Sep 12 - Sep 15, 2026',
    description: 'Executive leadership offsite with strategy sessions and team building',
    coverPhoto:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=630&fit=crop',
    participantCount: 45,
    tripType: 'pro',
  },
  'paul-george-elite-aau-nationals-2025': {
    title: 'Paul George Elite AAU Nationals 2025',
    location: 'Las Vegas, NV',
    dateRange: 'Jul 20 - Jul 27, 2025',
    description: 'Elite AAU basketball nationals with 17U team competing for championship',
    coverPhoto:
      'https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=1200&h=630&fit=crop',
    participantCount: 32,
    tripType: 'pro',
  },
  'osu-notredame-2025': {
    title: 'Ohio State vs Notre Dame 2025',
    location: 'South Bend, IN',
    dateRange: 'Sep 6 - Sep 7, 2025',
    description: 'Historic rivalry game with tailgate, alumni gathering, and game day experience',
    coverPhoto:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&h=630&fit=crop',
    participantCount: 28,
    tripType: 'pro',
  },
  'unc-lax-2025': {
    title: "UNC Women's Lacrosse ACC Tournament",
    location: 'Durham, NC',
    dateRange: 'May 1 - May 4, 2025',
    description: 'ACC Championship tournament with team travel and family spectator coordination',
    coverPhoto:
      'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=1200&h=630&fit=crop',
    participantCount: 38,
    tripType: 'pro',
  },
  'a16z-speedrun-2026': {
    title: 'a16z Speedrun Demo Day 2026',
    location: 'San Francisco, CA',
    dateRange: 'Mar 20 - Mar 22, 2026',
    description: 'Accelerator demo day with pitch prep, investor meetings, and networking',
    coverPhoto: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=630&fit=crop',
    participantCount: 12,
    tripType: 'pro',
  },
  'kai-druski-jake-adin-24hr-atl': {
    title: 'Druski x Adin Ross 24HR Stream ATL',
    location: 'Atlanta, GA',
    dateRange: 'Apr 5 - Apr 6, 2026',
    description: '24-hour livestream collab with production crew, guest appearances, and content',
    coverPhoto:
      'https://images.unsplash.com/photo-1598387993441-a364f854c3e1?w=1200&h=630&fit=crop',
    participantCount: 15,
    tripType: 'pro',
  },
  'tesla-cybertruck-roadshow-2025': {
    title: 'Tesla Cybertruck Roadshow 2025',
    location: 'Austin, TX \u2192 Phoenix, AZ \u2192 LA, CA',
    dateRange: 'Oct 1 - Oct 15, 2025',
    description: 'Multi-city product showcase with demo drives, media events, and launches',
    coverPhoto:
      'https://images.unsplash.com/photo-1620891549027-942fdc95d3f5?w=1200&h=630&fit=crop',
    participantCount: 22,
    tripType: 'pro',
  },
  'postmalone-jellyroll-tour-2026': {
    title: 'Post Malone x Jelly Roll Tour 2026',
    location: 'Nashville, TN \u2192 Memphis, TN \u2192 New Orleans, LA',
    dateRange: 'Aug 10 - Aug 20, 2026',
    description: 'Southern leg of the tour with crew travel, venue coordination, and afterparties',
    coverPhoto:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=630&fit=crop',
    participantCount: 35,
    tripType: 'pro',
  },
  'gs-campus-gt-2025': {
    title: 'Goldman Sachs Georgia Tech Recruiting',
    location: 'Atlanta, GA',
    dateRange: 'Oct 15 - Oct 17, 2025',
    description: 'Campus recruiting visit with info sessions, interviews, and networking dinners',
    coverPhoto:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=630&fit=crop',
    participantCount: 8,
    tripType: 'pro',
  },
  'nvidia-bowling-2025': {
    title: 'NVIDIA Employee Bowling Night',
    location: 'Santa Clara, CA',
    dateRange: 'Nov 8, 2025',
    description: 'Team building event with bowling tournament, prizes, and company celebration',
    coverPhoto: 'https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=1200&h=630&fit=crop',
    participantCount: 120,
    tripType: 'pro',
  },

  // ── Events ─────────────────────────────────────────────────────────
  'sxsw-2025': {
    title: 'South by Southwest 2025',
    location: 'Austin, TX',
    dateRange: 'Mar 7 - Mar 16, 2025',
    description: 'Annual tech, film, and music festival with panels, showcases, and networking',
    coverPhoto:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=630&fit=crop',
    participantCount: 500,
    tripType: 'event',
    themeColor: '#8B5CF6',
  },
  'wef-2025': {
    title: 'World Economic Forum 2025',
    location: 'Davos, Switzerland',
    dateRange: 'Jan 20 - Jan 24, 2025',
    description: 'Global leaders summit discussing economic policy, climate, and innovation',
    coverPhoto:
      'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=630&fit=crop',
    participantCount: 250,
    tripType: 'event',
    themeColor: '#10B981',
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
    themeColor: '#92400E',
  },
  'grammys-2025': {
    title: 'Grammy Awards 2025',
    location: 'Los Angeles, CA',
    dateRange: 'Feb 2, 2025',
    description: "Music's biggest night with red carpet, performances, and afterparties",
    coverPhoto:
      'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1200&h=630&fit=crop',
    participantCount: 180,
    tripType: 'event',
    themeColor: '#D97706',
  },
  'google-io-2026-event': {
    title: 'Google I/O 2026',
    location: 'Mountain View, CA',
    dateRange: 'May 12 - May 14, 2026',
    description: 'Annual developer conference with keynotes, workshops, and product launches',
    coverPhoto:
      'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=1200&h=630&fit=crop',
    participantCount: 400,
    tripType: 'event',
    themeColor: '#4285F4',
  },
  'essence-festival-2026': {
    title: 'Essence Festival 2026',
    location: 'New Orleans, LA',
    dateRange: 'Jul 3 - Jul 6, 2026',
    description: 'Celebration of Black culture with concerts, empowerment seminars, and cuisine',
    coverPhoto:
      'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&h=630&fit=crop',
    participantCount: 350,
    tripType: 'event',
    themeColor: '#DC2626',
  },
  'coachella-2026-event': {
    title: 'Coachella 2026',
    location: 'Indio, CA',
    dateRange: 'Apr 10 - Apr 19, 2026',
    description: 'Premier music and arts festival with headliners, art installations, and camping',
    coverPhoto:
      'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=1200&h=630&fit=crop',
    participantCount: 600,
    tripType: 'event',
    themeColor: '#F59E0B',
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEMO_EVENT_IDS = new Set(
  Object.entries(DEMO_TRIPS)
    .filter(([, t]) => t.tripType === 'event')
    .map(([id]) => id),
);

/** Infer the trip type from a demo trip ID. */
export function getDemoTripType(tripId: string): 'consumer' | 'pro' | 'event' {
  if (/^\d+$/.test(tripId)) return 'consumer';
  if (DEMO_EVENT_IDS.has(tripId)) return 'event';
  return 'pro';
}

/**
 * Build security headers suitable for HTML responses served by OG preview
 * edge functions. Allows inline styles (needed for the preview cards) and
 * images from any HTTPS source.
 */
export function getOgSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'unsafe-inline'; img-src https: data:; connect-src 'none'; script-src 'none'; frame-ancestors 'none';",
  };
}
