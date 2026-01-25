import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Demo covers base URL - Supabase Storage
const DEMO_COVERS_BASE =
  'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers';

const demoTrips: Record<
  string,
  {
    title: string;
    location: string;
    description: string;
    coverPhoto: string;
    participantCount: number;
    dateRange: string;
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
    description: 'Romantic destination wedding celebration with family and friends in paradise',
    coverPhoto: `${DEMO_COVERS_BASE}/bali-destination-wedding.jpg`,
    participantCount: 63,
  },
  '4': {
    title: "Kristen Goldberg's Bachelorette Party",
    location: 'Nashville, TN',
    dateRange: 'Nov 8 - Nov 10, 2026',
    description:
      'Epic bachelorette celebration with honky-tonk bars, live music, and unforgettable memories',
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
      'Celebratory wine country escape with close friends to mark a major career milestone',
    coverPhoto: `${DEMO_COVERS_BASE}/napa-wine-getaway.jpg`,
    participantCount: 6,
  },
  '10': {
    title: 'Corporate Holiday Ski Trip – Aspen',
    location: 'Aspen, CO',
    dateRange: 'Dec 12 - Dec 15, 2026',
    description: 'Company holiday celebration with skiing, team building, and winter activities',
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
  // Pro Trips
  'lakers-road-trip': {
    title: 'LA Lakers – Road Trip to Denver',
    location: 'Denver, CO',
    dateRange: 'Mar 10 - Mar 12, 2026',
    description: 'Lakers vs Nuggets away game with team travel coordination and game preparation',
    coverPhoto: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&h=630&fit=crop',
    participantCount: 18,
  },
  'beyonce-cowboy-carter-tour': {
    title: 'Beyoncé – Cowboy Carter World Tour',
    location: 'Houston → Atlanta → NYC',
    dateRange: 'Jun 1 - Aug 30, 2026',
    description: 'Multi-city world tour production with crew coordination and venue logistics',
    coverPhoto:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
    participantCount: 45,
  },
  'eli-lilly-c-suite-retreat-2026': {
    title: 'Eli Lilly – C-Suite Leadership Retreat',
    location: 'Scottsdale, AZ',
    dateRange: 'Apr 15 - Apr 18, 2026',
    description: 'Executive leadership retreat with strategy sessions, team building, and golf',
    coverPhoto:
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&h=630&fit=crop',
    participantCount: 24,
  },
  'paul-george-elite-aau-nationals-2025': {
    title: 'Paul George Elite – AAU Nationals',
    location: 'Orlando, FL',
    dateRange: 'Jul 20 - Jul 27, 2025',
    description: 'AAU National Championship tournament with team logistics and player coordination',
    coverPhoto:
      'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=630&fit=crop',
    participantCount: 16,
  },
  'osu-notredame-2025': {
    title: 'Ohio State vs Notre Dame – Away Game',
    location: 'South Bend, IN',
    dateRange: 'Sep 27, 2025',
    description: 'College football rivalry game with fan travel and tailgate coordination',
    coverPhoto:
      'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=1200&h=630&fit=crop',
    participantCount: 85,
  },
  'unc-lax-2025': {
    title: "UNC Women's Lacrosse – ACC Tournament",
    location: 'Chapel Hill, NC',
    dateRange: 'Apr 25 - Apr 27, 2025',
    description: 'ACC Tournament with team travel, accommodation, and game day logistics',
    coverPhoto:
      'https://images.unsplash.com/photo-1471295253337-3ceaaedca402?w=1200&h=630&fit=crop',
    participantCount: 28,
  },
  'a16z-speedrun-2026': {
    title: 'a16z Speedrun 2026 – Demo Day',
    location: 'San Francisco, CA',
    dateRange: 'Mar 5 - Mar 7, 2026',
    description: 'VC accelerator demo day with founder pitches and investor networking',
    coverPhoto: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=630&fit=crop',
    participantCount: 120,
  },
  'kai-druski-jake-adin-24hr-atl': {
    title: 'Druski x Adin Ross – 24HR ATL Stream',
    location: 'Atlanta, GA',
    dateRange: 'Feb 14, 2026',
    description: '24-hour livestream event with content creator coordination and production',
    coverPhoto:
      'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=1200&h=630&fit=crop',
    participantCount: 12,
  },
  'tesla-cybertruck-roadshow-2025': {
    title: 'Tesla Cybertruck – National Roadshow',
    location: 'Austin → LA → NYC',
    dateRange: 'May 1 - Jun 15, 2025',
    description: 'Multi-city product launch roadshow with experiential marketing events',
    coverPhoto: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1200&h=630&fit=crop',
    participantCount: 35,
  },
  'postmalone-jellyroll-tour-2026': {
    title: 'Post Malone x Jelly Roll – Summer Tour',
    location: 'Nashville → Denver → Vegas',
    dateRange: 'Jul 1 - Sep 15, 2026',
    description: 'Co-headlining summer tour with dual production teams and venue coordination',
    coverPhoto:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=630&fit=crop',
    participantCount: 60,
  },
  'gs-campus-gt-2025': {
    title: 'Goldman Sachs – Georgia Tech Recruiting',
    location: 'Atlanta, GA',
    dateRange: 'Oct 8 - Oct 10, 2025',
    description: 'Campus recruiting trip with info sessions, interviews, and networking events',
    coverPhoto:
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=630&fit=crop',
    participantCount: 8,
  },
  'nvidia-bowling-2025': {
    title: 'NVIDIA Santa Clara – Employee Bowling Night',
    location: 'Santa Clara, CA',
    dateRange: 'Dec 8, 2025',
    description: 'Team building bowling event for NVIDIA employees with dinner and prizes',
    coverPhoto: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=1200&h=630&fit=crop',
    participantCount: 48,
  },
  'harris-elementary-dc-2025': {
    title: 'Harris Elementary – Washington D.C. Field Trip',
    location: 'Washington, D.C.',
    dateRange: 'May 12 - May 16, 2025',
    description: 'Educational field trip to national monuments, museums, and Capitol Hill',
    coverPhoto:
      'https://images.unsplash.com/photo-1617581629397-a72507c3de9e?w=1200&h=630&fit=crop',
    participantCount: 32,
  },
  'real-housewives-atl-s9': {
    title: 'Real Housewives of Atlanta – Season 9 Shoot',
    location: 'Atlanta, GA',
    dateRange: 'Jan 15 - Apr 30, 2025',
    description:
      'Reality TV production with cast coordination, filming locations, and crew logistics',
    coverPhoto:
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&h=630&fit=crop',
    participantCount: 28,
  },
  'google-io-2026': {
    title: 'Google I/O 2026 – Speakers & Demo Team',
    location: 'Mountain View, CA',
    dateRange: 'May 12 - May 15, 2026',
    description: 'Google developer conference with speaker coordination and demo booth logistics',
    coverPhoto:
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&h=630&fit=crop',
    participantCount: 15,
  },
  // Events
  'sxsw-2025': {
    title: 'SXSW 2025',
    location: 'Austin, TX',
    dateRange: 'Mar 7 - Mar 16, 2025',
    description: 'Annual tech, film, and music festival with panels, showcases, and networking',
    coverPhoto:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&h=630&fit=crop',
    participantCount: 500,
  },
  'wef-2025': {
    title: 'World Economic Forum 2025',
    location: 'Davos, Switzerland',
    dateRange: 'Jan 20 - Jan 24, 2025',
    description: 'Global leaders summit addressing economic, political, and social challenges',
    coverPhoto:
      'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?w=1200&h=630&fit=crop',
    participantCount: 2500,
  },
  'grammys-2025': {
    title: '67th Annual Grammy Awards',
    location: 'Los Angeles, CA',
    dateRange: 'Feb 2, 2025',
    description: "Music's biggest night celebrating excellence in recording arts",
    coverPhoto:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=630&fit=crop',
    participantCount: 18000,
  },
  'google-io-2026-event': {
    title: 'Google I/O 2026',
    location: 'Mountain View, CA',
    dateRange: 'May 12 - May 14, 2026',
    description: "Google's annual developer conference with keynotes, sessions, and hands-on labs",
    coverPhoto:
      'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&h=630&fit=crop',
    participantCount: 7000,
  },
  'essence-festival-2026': {
    title: 'Essence Festival 2026',
    location: 'New Orleans, LA',
    dateRange: 'Jul 3 - Jul 6, 2026',
    description: 'Celebration of Black culture with concerts, empowerment seminars, and community',
    coverPhoto:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&h=630&fit=crop',
    participantCount: 500000,
  },
  'coachella-2026-event': {
    title: 'Coachella Valley Music and Arts Festival 2026',
    location: 'Indio, CA',
    dateRange: 'Apr 10 - Apr 19, 2026',
    description: 'Iconic desert music festival featuring world-class artists and art installations',
    coverPhoto:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&h=630&fit=crop',
    participantCount: 125000,
  },
};

const DEMO_EVENT_TRIP_IDS = new Set([
  'sxsw-2025',
  'wef-2025',
  'grammys-2025',
  'google-io-2026-event',
  'essence-festival-2026',
  'coachella-2026-event',
]);

const getDemoTripType = (tripId: string): 'consumer' | 'pro' | 'event' => {
  if (/^\d+$/.test(tripId)) return 'consumer';
  if (DEMO_EVENT_TRIP_IDS.has(tripId)) return 'event';
  return 'pro';
};

type TripPreview = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  trip_type: string | null;
  member_count: number;
  description?: string | null;
};

serve(async (req): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === 'POST' ? await req.json() : {};
    const tripId = body.tripId ?? new URL(req.url).searchParams.get('tripId');

    if (!tripId || typeof tripId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'tripId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Demo trips
    const demo = demoTrips[tripId];
    if (demo) {
      const trip: TripPreview = {
        id: tripId,
        name: demo.title,
        destination: demo.location,
        start_date: null,
        end_date: null,
        cover_image_url: demo.coverPhoto,
        trip_type: getDemoTripType(tripId),
        member_count: demo.participantCount,
        description: demo.description,
      };

      return new Response(JSON.stringify({ success: true, trip }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    const { data: tripRow, error: tripError } = await supabaseClient
      .from('trips')
      .select(
        'id, name, destination, start_date, end_date, cover_image_url, trip_type, description',
      )
      .eq('id', tripId)
      .maybeSingle();

    if (tripError || !tripRow) {
      return new Response(JSON.stringify({ success: false, error: 'Trip not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { count: memberCount } = await supabaseClient
      .from('trip_members')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', tripId);

    const trip: TripPreview = {
      id: tripRow.id,
      name: tripRow.name,
      destination: tripRow.destination,
      start_date: tripRow.start_date,
      end_date: tripRow.end_date,
      cover_image_url: tripRow.cover_image_url,
      trip_type: tripRow.trip_type,
      member_count: memberCount ?? 0,
      description: tripRow.description,
    };

    return new Response(JSON.stringify({ success: true, trip }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
