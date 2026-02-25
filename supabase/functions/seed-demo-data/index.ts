import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// City-specific link templates for realistic trip planning
const getCityLinks = (location: string) => {
  const city = location.split(',')[0].trim();

  const cityTemplates: Record<
    string,
    Array<{ title: string; url: string; description: string; category: string }>
  > = {
    Cancun: [
      {
        title: 'Cancun All-Inclusive Resort Deals',
        url: 'https://www.booking.com/city/mx/cancun.html',
        description: 'Top-rated beachfront resorts and hotels',
        category: 'accommodation',
      },
      {
        title: 'Chichen Itza Day Trip',
        url: 'https://www.viator.com/Cancun/d631-ttd',
        description: 'Ancient Mayan ruins tour with guide',
        category: 'activities',
      },
      {
        title: 'Cancun Nightlife Guide',
        url: 'https://www.timeout.com/cancun/nightlife',
        description: 'Best clubs, bars, and beach parties',
        category: 'nightlife',
      },
      {
        title: 'Best Tacos in Cancun',
        url: 'https://www.tripadvisor.com/Restaurants-g150807',
        description: 'Local seafood and authentic Mexican food',
        category: 'food',
      },
      {
        title: 'Isla Mujeres Snorkeling',
        url: 'https://www.getyourguide.com/cancun-l138/',
        description: 'Island day trip with water sports',
        category: 'activities',
      },
    ],
    Tokyo: [
      {
        title: 'Tokyo Central Hotels',
        url: 'https://www.booking.com/city/jp/tokyo.html',
        description: 'Hotels near Shibuya and Shinjuku stations',
        category: 'accommodation',
      },
      {
        title: 'Tokyo Skytree Tickets',
        url: 'https://www.klook.com/activity/233-tokyo-skytree-tokyo/',
        description: 'Skip-the-line observation deck',
        category: 'attractions',
      },
      {
        title: 'Tsukiji Market Food Tour',
        url: 'https://www.viator.com/Tokyo-tours/Food-Tours/d332-g6',
        description: 'Fresh sushi and street food',
        category: 'food',
      },
      {
        title: 'Shibuya Nightlife',
        url: 'https://www.timeout.com/tokyo/nightlife',
        description: 'Best bars and karaoke spots',
        category: 'nightlife',
      },
      {
        title: 'Mount Fuji Day Trip',
        url: 'https://www.getyourguide.com/tokyo-l193/',
        description: 'Scenic tour with onsen',
        category: 'activities',
      },
    ],
    Bali: [
      {
        title: 'Ubud Luxury Villas',
        url: 'https://www.airbnb.com/s/Bali--Indonesia',
        description: 'Private villas with pools',
        category: 'accommodation',
      },
      {
        title: 'Rice Terraces & Jungle Swing',
        url: 'https://www.getyourguide.com/bali-l294/',
        description: 'Instagram-worthy photo spots',
        category: 'attractions',
      },
      {
        title: 'Balinese Cooking Class',
        url: 'https://www.viator.com/Bali/d318-ttd',
        description: 'Market tour and cooking lesson',
        category: 'activities',
      },
      {
        title: 'Seminyak Beach Clubs',
        url: 'https://www.timeout.com/bali/beach-clubs',
        description: 'Sunset cocktails and parties',
        category: 'nightlife',
      },
      {
        title: 'Tanah Lot Sunset Tour',
        url: 'https://www.klook.com/activity/2347-tanah-lot-bali/',
        description: 'Sacred sea temple',
        category: 'attractions',
      },
    ],
    Nashville: [
      {
        title: 'Broadway Honky Tonks',
        url: 'https://www.visitmusiccity.com/honky-tonks',
        description: "Tootsie's, Robert's, and live music bars",
        category: 'nightlife',
      },
      {
        title: 'Nashville Hot Chicken',
        url: 'https://www.tripadvisor.com/Restaurants-g55229',
        description: "Prince's, Hattie B's, local favorites",
        category: 'food',
      },
      {
        title: 'Grand Ole Opry Tickets',
        url: 'https://www.opry.com/',
        description: 'Country music venue shows',
        category: 'attractions',
      },
      {
        title: 'Downtown Nashville Hotels',
        url: 'https://www.booking.com/city/us/nashville.html',
        description: 'Walking distance to Broadway',
        category: 'accommodation',
      },
      {
        title: 'Pedal Tavern Bar Crawl',
        url: 'https://www.nashvillepedaltavern.com/',
        description: 'Party bike downtown tour',
        category: 'activities',
      },
    ],
    Indio: [
      {
        title: 'Coachella Official Site',
        url: 'https://www.coachella.com/',
        description: 'Lineup, tickets, festival info',
        category: 'event',
      },
      {
        title: 'Coachella Camping Passes',
        url: 'https://www.coachella.com/camping',
        description: 'On-site camping and shuttles',
        category: 'accommodation',
      },
      {
        title: 'Palm Springs Hotels',
        url: 'https://www.booking.com/city/us/palm-springs.html',
        description: '30 minutes to festival',
        category: 'accommodation',
      },
      {
        title: 'Coachella Survival Guide',
        url: 'https://www.festivalpass.com/coachella-guide',
        description: 'What to pack and expect',
        category: 'tips',
      },
      {
        title: 'Coachella After-Parties',
        url: 'https://edmidentity.com/coachella-parties/',
        description: 'Pool parties and club events',
        category: 'nightlife',
      },
    ],
    Aspen: [
      {
        title: 'Aspen Snowmass Ski Info',
        url: 'https://www.aspensnowmass.com/',
        description: 'Trail maps and lift tickets',
        category: 'activities',
      },
      {
        title: 'Ski-In/Ski-Out Lodges',
        url: 'https://www.booking.com/city/us/aspen.html',
        description: 'Premium mountain hotels',
        category: 'accommodation',
      },
      {
        title: 'Maroon Bells Hiking',
        url: 'https://www.alltrails.com/parks/us/colorado/aspen',
        description: 'Scenic summer trails',
        category: 'activities',
      },
      {
        title: 'Aspen Restaurants',
        url: 'https://www.tripadvisor.com/Restaurants-g29141',
        description: 'Fine dining and après-ski',
        category: 'food',
      },
      {
        title: 'Aspen Spa & Wellness',
        url: 'https://www.aspenchamber.org/wellness',
        description: 'Luxury spa treatments',
        category: 'activities',
      },
    ],
    Phoenix: [
      {
        title: 'Scottsdale Golf Tee Times',
        url: 'https://www.golfnow.com/phoenix',
        description: 'TPC and desert courses',
        category: 'activities',
      },
      {
        title: 'Phoenix Steakhouses',
        url: 'https://www.tripadvisor.com/Restaurants-g31310',
        description: "Mastro's, Durant's, local dining",
        category: 'food',
      },
      {
        title: 'Scottsdale Golf Resorts',
        url: 'https://www.booking.com/city/us/scottsdale.html',
        description: 'Luxury resort hotels',
        category: 'accommodation',
      },
      {
        title: 'Old Town Scottsdale Bars',
        url: 'https://www.timeout.com/phoenix/bars',
        description: 'Nightlife entertainment district',
        category: 'nightlife',
      },
      {
        title: 'Desert Jeep Tours',
        url: 'https://www.viator.com/Phoenix/d4523-ttd',
        description: 'Sonoran Desert adventures',
        category: 'activities',
      },
    ],
    Tulum: [
      {
        title: 'Tulum Beachfront Hotels',
        url: 'https://www.booking.com/city/mx/tulum.html',
        description: 'Eco-chic Caribbean resorts',
        category: 'accommodation',
      },
      {
        title: 'Tulum Yoga Retreats',
        url: 'https://www.bookyogaretreats.com/tulum',
        description: 'Beachfront wellness centers',
        category: 'activities',
      },
      {
        title: 'Cenote Swimming Tours',
        url: 'https://www.getyourguide.com/tulum-l1087/',
        description: 'Underground caves and pools',
        category: 'activities',
      },
      {
        title: 'Tulum Mayan Ruins',
        url: 'https://www.viator.com/Tulum/d5165-ttd',
        description: 'Clifftop archaeological site',
        category: 'attractions',
      },
      {
        title: 'Vegan Restaurants Tulum',
        url: 'https://www.tripadvisor.com/Restaurants-g150813',
        description: 'Healthy organic dining',
        category: 'food',
      },
    ],
    'Napa Valley': [
      {
        title: 'Napa Winery Tours',
        url: 'https://www.viator.com/Napa-Valley/d909-ttd',
        description: 'Wine tasting experiences',
        category: 'activities',
      },
      {
        title: 'Luxury Spa Resorts',
        url: 'https://www.booking.com/region/us/napa-valley.html',
        description: 'Auberge and vineyard estates',
        category: 'accommodation',
      },
      {
        title: 'Michelin Restaurants Napa',
        url: 'https://www.tripadvisor.com/Restaurants-g32766',
        description: 'French Laundry and fine dining',
        category: 'food',
      },
      {
        title: 'Hot Air Balloon Rides',
        url: 'https://www.napavalleyballoons.com/',
        description: 'Sunrise flights over vineyards',
        category: 'activities',
      },
      {
        title: 'Calistoga Mud Baths',
        url: 'https://www.visitcalifornia.com/calistoga-spas/',
        description: 'Volcanic spa treatments',
        category: 'activities',
      },
    ],
    'Port Canaveral': [
      {
        title: 'Disney Cruise Official',
        url: 'https://disneycruise.disney.go.com/',
        description: 'Booking and itineraries',
        category: 'cruise',
      },
      {
        title: 'Port Canaveral Hotels',
        url: 'https://www.portcanaveral.com/hotels',
        description: 'Pre-cruise hotels with shuttle',
        category: 'accommodation',
      },
      {
        title: 'Kennedy Space Center',
        url: 'https://www.kennedyspacecenter.com/',
        description: 'NASA tours before cruise',
        category: 'attractions',
      },
      {
        title: 'Cocoa Beach Restaurants',
        url: 'https://www.tripadvisor.com/Restaurants-g34044',
        description: 'Fresh seafood and beach cafes',
        category: 'food',
      },
      {
        title: 'Disney Cruise Packing Tips',
        url: 'https://www.disneycruiselineblog.com/packing/',
        description: 'What to bring for families',
        category: 'tips',
      },
    ],
    Yellowstone: [
      {
        title: 'Yellowstone Park Passes',
        url: 'https://www.nps.gov/yell/planyourvisit/fees.htm',
        description: 'Entry fees and annual passes',
        category: 'entrance',
      },
      {
        title: 'Old Faithful Inn Lodges',
        url: 'https://www.yellowstonenationalparklodges.com/',
        description: 'Historic in-park lodging',
        category: 'accommodation',
      },
      {
        title: 'Geyser & Wildlife Tours',
        url: 'https://www.viator.com/Yellowstone/d5509-ttd',
        description: 'Guided tours of geysers and bison',
        category: 'activities',
      },
      {
        title: 'Best Hiking Trails',
        url: 'https://www.alltrails.com/parks/us/wyoming/yellowstone',
        description: 'Grand Prismatic and backcountry',
        category: 'activities',
      },
      {
        title: 'Wildlife Safety Tips',
        url: 'https://www.nps.gov/yell/planyourvisit/safety.htm',
        description: 'Bear safety and regulations',
        category: 'tips',
      },
    ],
  };

  return (
    cityTemplates[city] || [
      {
        title: `Visit ${city} Guide`,
        url: `https://www.google.com/search?q=visit+${city}`,
        description: 'Travel information',
        category: 'general',
      },
      {
        title: `Things to Do ${city}`,
        url: `https://www.tripadvisor.com`,
        description: 'Top attractions',
        category: 'attractions',
      },
      {
        title: `${city} Restaurants`,
        url: `https://www.yelp.com`,
        description: 'Dining recommendations',
        category: 'food',
      },
      {
        title: `${city} Hotels`,
        url: `https://www.booking.com`,
        description: 'Accommodation options',
        category: 'accommodation',
      },
      {
        title: `${city} Map`,
        url: `https://www.google.com/maps`,
        description: 'Navigation and directions',
        category: 'transportation',
      },
    ]
  );
};

serve(async req => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } =
    await import('../_shared/securityHeaders.ts');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Disable demo seeding in production environment
  const environment = Deno.env.get('ENVIRONMENT') || Deno.env.get('DENO_ENV') || 'production';
  if (environment === 'production') {
    console.log('[SEED-DEMO] Blocked: Demo seeding is disabled in production');
    return new Response(
      JSON.stringify({ error: 'Demo data seeding is disabled in production environment' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { tripId = '1' } = await req.json();

    // Get trip location for city-specific links
    const { data: tripData } = await supabase
      .from('trips')
      .select('destination')
      .eq('id', tripId)
      .single();

    const tripLocation = tripData?.destination || 'New York, NY';

    // Clear existing data for this trip
    await Promise.all([
      supabase.from('trip_chat_messages').delete().eq('trip_id', tripId),
      supabase.from('trip_polls').delete().eq('trip_id', tripId),
      supabase.from('trip_files').delete().eq('trip_id', tripId),
      supabase.from('trip_links').delete().eq('trip_id', tripId),
    ]);

    // Mock user IDs (these should correspond to actual profiles)
    const users = {
      sarah: '550e8400-e29b-41d4-a716-446655440001',
      mike: '550e8400-e29b-41d4-a716-446655440002',
      jessica: '550e8400-e29b-41d4-a716-446655440003',
      current: '550e8400-e29b-41d4-a716-446655440000', // Current user
    };

    // Seed chat messages
    const chatMessages = [
      {
        trip_id: tripId,
        content:
          'Hey everyone! Just confirmed our hotel reservations at the Grand Resort for March 15-18. Check-in is at 3 PM.',
        author_name: 'Sarah Chen',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        trip_id: tripId,
        content:
          "Perfect! I've booked our dinner at Marea for March 16th at 8 PM. They have that amazing seafood menu we talked about.",
        author_name: 'Mike Rodriguez',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        trip_id: tripId,
        content:
          'Flight update: My American Airlines flight 1847 lands at JFK at 2:15 PM on March 15th. Can someone pick me up?',
        author_name: 'Jessica Williams',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        trip_id: tripId,
        content:
          'I can pick you up Jessica! Also, I found some great Broadway show options for Friday night.',
        author_name: 'Sarah Chen',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        trip_id: tripId,
        content:
          'Thanks Sarah! Also, reminder that we need to pack warm clothes - weather forecast shows temps in the 40s.',
        author_name: 'Mike Rodriguez',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        trip_id: tripId,
        content:
          "Just arrived at the hotel! The view from our rooms is incredible. Can't wait for tomorrow's activities!",
        author_name: 'Sarah Chen',
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Seed polls
    const polls = [
      {
        trip_id: tripId,
        created_by: users.sarah,
        question: 'Where should we have lunch on Saturday?',
        options: JSON.stringify([
          { id: '1', text: "Katz's Delicatessen", votes: 3 },
          { id: '2', text: "Joe's Pizza", votes: 2 },
          { id: '3', text: 'The Plaza Food Hall', votes: 1 },
          { id: '4', text: 'Shake Shack', votes: 2 },
        ]),
        total_votes: 8,
        status: 'active',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        trip_id: tripId,
        created_by: users.mike,
        question: 'What time should we meet for the Central Park walk?',
        options: JSON.stringify([
          { id: '1', text: '9:00 AM', votes: 1 },
          { id: '2', text: '10:00 AM', votes: 4 },
          { id: '3', text: '11:00 AM', votes: 2 },
        ]),
        total_votes: 7,
        status: 'completed',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Seed files
    const files = [
      {
        trip_id: tripId,
        uploaded_by: users.sarah,
        name: 'Hotel Confirmation - Grand Resort.pdf',
        file_type: 'application/pdf',
        content_text:
          'Confirmation Number: GR78945. Guest: Sarah Chen. Check-in: March 15, 2024 3:00 PM. Check-out: March 18, 2024 11:00 AM. Room Type: Deluxe King Suite. Total Amount: $1,247.50. Includes breakfast and WiFi.',
        ai_summary:
          'Hotel reservation confirmation for Grand Resort, March 15-18, 2024, Deluxe King Suite for $1,247.50',
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        trip_id: tripId,
        uploaded_by: users.jessica,
        name: 'Flight Itinerary - American Airlines.pdf',
        file_type: 'application/pdf',
        content_text:
          'American Airlines Flight 1847. Departure: LAX 10:45 AM PST. Arrival: JFK 2:15 PM EST. Passenger: Jessica Williams. Seat: 12A. Confirmation: ABC123.',
        ai_summary: 'Flight itinerary for Jessica Williams, AA1847 from LAX to JFK on March 15',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        trip_id: tripId,
        uploaded_by: users.mike,
        name: 'NYC Restaurant List.docx',
        file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        content_text:
          "NYC Must-Try Restaurants: 1. Marea - Seafood, Midtown. Reservation confirmed for March 16, 8 PM. 2. Eleven Madison Park - Fine dining. 3. Peter Luger - Steakhouse, Brooklyn. 4. Le Bernardin - French seafood. 5. Joe's Pizza - Classic NY slice.",
        ai_summary: 'List of recommended NYC restaurants including confirmed Marea reservation',
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    // Seed city-specific links
    const cityLinks = getCityLinks(tripLocation);
    const userList = [users.sarah, users.mike, users.jessica];

    const links = cityLinks.map((link, index) => ({
      trip_id: tripId,
      added_by: userList[index % userList.length],
      title: link.title,
      url: link.url,
      description: link.description,
      category: link.category,
      votes: Math.floor(Math.random() * 5) + 1,
      created_at: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
    }));

    // Insert all data
    const results = await Promise.all([
      supabase.from('trip_chat_messages').insert(chatMessages),
      supabase.from('trip_polls').insert(polls),
      supabase.from('trip_files').insert(files),
      supabase.from('trip_links').insert(links),
    ]);

    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Seeding errors:', errors);
      throw new Error(`Failed to seed data: ${errors.map(e => e.error?.message).join(', ')}`);
    }

    // Trigger AI ingestion for the trip
    const { error: ingestError } = await supabase.functions.invoke('ai-ingest', {
      body: {
        source: 'trip_batch',
        sourceId: tripId,
        tripId: tripId,
      },
    });

    if (ingestError) {
      console.error('Ingestion error:', ingestError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data seeded successfully',
        counts: {
          messages: chatMessages.length,
          polls: polls.length,
          files: files.length,
          links: links.length,
        },
        ingestionTriggered: !ingestError,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
