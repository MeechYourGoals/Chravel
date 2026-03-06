import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';

const DEMO_USER_ID = '11ba817d-f0c8-411d-9a75-b1bde6c4df4a';

// ─── Mock Users ──────────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  display_name: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url: string;
}

const MOCK_USERS: MockUser[] = [
  { id: 'demo-mock-0001-alex-countley', display_name: 'Alexandra Countley', first_name: 'Alexandra', last_name: 'Countley', email: 'alex@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Alexandra+Countley&background=6366f1&color=fff&size=128' },
  { id: 'demo-mock-0002-jordan-james', display_name: 'Jordan James', first_name: 'Jordan', last_name: 'James', email: 'jordan@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Jordan+James&background=ec4899&color=fff&size=128' },
  { id: 'demo-mock-0003-tara-crajen', display_name: 'Tara Crajen', first_name: 'Tara', last_name: 'Crajen', email: 'tara@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Tara+Crajen&background=f59e0b&color=fff&size=128' },
  { id: 'demo-mock-0004-dev-patel', display_name: 'Dev Patel', first_name: 'Dev', last_name: 'Patel', email: 'dev@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Dev+Patel&background=10b981&color=fff&size=128' },
  { id: 'demo-mock-0005-sam-nepoli', display_name: 'Sam Nepoli', first_name: 'Sam', last_name: 'Nepoli', email: 'sam@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Sam+Nepoli&background=3b82f6&color=fff&size=128' },
  { id: 'demo-mock-0006-maya-less', display_name: 'Maya Less', first_name: 'Maya', last_name: 'Less', email: 'maya@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Maya+Less&background=8b5cf6&color=fff&size=128' },
  { id: 'demo-mock-0007-leo-bicaprio', display_name: 'Leo Bicaprio', first_name: 'Leo', last_name: 'Bicaprio', email: 'leo@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Leo+Bicaprio&background=ef4444&color=fff&size=128' },
  { id: 'demo-mock-0008-sophie-chamal', display_name: 'Sophie Chamal', first_name: 'Sophie', last_name: 'Chamal', email: 'sophie@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Sophie+Chamal&background=14b8a6&color=fff&size=128' },
  { id: 'demo-mock-0009-jalen-silver', display_name: 'Jalen Silver', first_name: 'Jalen', last_name: 'Silver', email: 'jalen@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Jalen+Silver&background=f97316&color=fff&size=128' },
  { id: 'demo-mock-0010-ava-duvet', display_name: 'Ava Duvet', first_name: 'Ava', last_name: 'Duvet', email: 'ava@chravel-demo.com', avatar_url: 'https://ui-avatars.com/api/?name=Ava+Duvet&background=d946ef&color=fff&size=128' },
];

const MOCK_USER_IDS = MOCK_USERS.map(u => u.id);

// Pick 3-4 mock users for a trip based on trip index
function getTripMembers(tripIndex: number): MockUser[] {
  const count = 3 + (tripIndex % 2); // 3 or 4
  const start = (tripIndex * 3) % MOCK_USERS.length;
  const members: MockUser[] = [];
  for (let i = 0; i < count; i++) {
    members.push(MOCK_USERS[(start + i) % MOCK_USERS.length]);
  }
  return members;
}

// ─── Trip Definitions ────────────────────────────────────────────────────────

interface TripDef {
  id: string;
  name: string;
  description: string;
  destination: string;
  trip_type: 'consumer' | 'pro' | 'event';
  start_date: string;
  end_date: string;
  basecamp_name: string;
  basecamp_address: string;
  categories?: string[];
  chat_mode?: string;
}

const CONSUMER_TRIPS: TripDef[] = [
  {
    id: 'carlton-iceland-2026',
    name: 'Iceland Northern Lights Trip',
    description: 'Chasing auroras across the Golden Circle with the crew. Ice caves, hot springs, and midnight skies.',
    destination: 'Reykjavik, Iceland',
    trip_type: 'consumer',
    start_date: '2026-01-08T00:00:00Z',
    end_date: '2026-01-14T00:00:00Z',
    basecamp_name: 'Hotel Rangá',
    basecamp_address: 'Suðurlandsvegur, 851 Hella, Iceland',
  },
  {
    id: 'carlton-mexico-city-2025',
    name: 'Mexico City Art Weekend',
    description: 'Gallery openings, street art tours, mezcal tastings, and the best tacos al pastor on the planet.',
    destination: 'Mexico City, Mexico',
    trip_type: 'consumer',
    start_date: '2025-11-14T00:00:00Z',
    end_date: '2025-11-17T00:00:00Z',
    basecamp_name: 'Casa Habita CDMX',
    basecamp_address: 'Colonia Roma Norte, Mexico City, Mexico',
  },
  {
    id: 'carlton-sxsw-2025',
    name: 'SXSW Austin 2025',
    description: 'Panels, parties, and premiere screenings. Networking on 6th Street and tacos on every corner.',
    destination: 'Austin, TX',
    trip_type: 'consumer',
    start_date: '2025-03-07T00:00:00Z',
    end_date: '2025-03-15T00:00:00Z',
    basecamp_name: 'The Driskill Hotel',
    basecamp_address: '604 Brazos St, Austin, TX 78701',
  },
  {
    id: 'carlton-nba-summer-2025',
    name: 'NBA Summer League Vegas',
    description: 'Scouting rookies, courtside hangs, and pool parties at Encore.',
    destination: 'Las Vegas, NV',
    trip_type: 'consumer',
    start_date: '2025-07-11T00:00:00Z',
    end_date: '2025-07-15T00:00:00Z',
    basecamp_name: 'Encore at Wynn',
    basecamp_address: '3131 S Las Vegas Blvd, Las Vegas, NV 89109',
  },
  {
    id: 'carlton-nola-jazz-2025',
    name: 'New Orleans Jazz Weekend',
    description: "Live jazz on Frenchmen, beignets at Café du Monde, and late night po'boys.",
    destination: 'New Orleans, LA',
    trip_type: 'consumer',
    start_date: '2025-10-17T00:00:00Z',
    end_date: '2025-10-20T00:00:00Z',
    basecamp_name: 'Ace Hotel New Orleans',
    basecamp_address: '600 Carondelet St, New Orleans, LA 70130',
  },
  {
    id: 'carlton-tokyo-2025',
    name: 'Tokyo Street Food Crawl',
    description: 'From Tsukiji to Shibuya — ramen bars, izakayas, and the best sushi of our lives.',
    destination: 'Tokyo, Japan',
    trip_type: 'consumer',
    start_date: '2025-08-20T00:00:00Z',
    end_date: '2025-08-28T00:00:00Z',
    basecamp_name: 'Park Hyatt Tokyo',
    basecamp_address: '3-7-1-2 Nishi Shinjuku, Shinjuku City, Tokyo 163-1055, Japan',
  },
  {
    id: 'carlton-ibiza-2026',
    name: 'Ibiza Birthday Weekend',
    description: 'Turning 32 in style. Beach clubs, sunset DJs at Café del Mar, and a villa with a view.',
    destination: 'Ibiza, Spain',
    trip_type: 'consumer',
    start_date: '2026-03-13T00:00:00Z',
    end_date: '2026-03-17T00:00:00Z',
    basecamp_name: 'Villa Can Furnet',
    basecamp_address: 'Can Furnet, Santa Eulalia, Ibiza, Spain',
  },
  {
    id: 'carlton-toronto-2026',
    name: 'Toronto Food & Music Weekend',
    description: "Drake's hometown. Kensington Market, CN Tower dinner, and OVO Fest afterparties.",
    destination: 'Toronto, Canada',
    trip_type: 'consumer',
    start_date: '2026-04-10T00:00:00Z',
    end_date: '2026-04-14T00:00:00Z',
    basecamp_name: 'The Drake Hotel',
    basecamp_address: '1150 Queen St W, Toronto, ON M6J 1J3, Canada',
  },
  {
    id: 'carlton-miami-f1-consumer',
    name: 'Miami F1 Grand Prix',
    description: 'Race weekend with the boys. Paddock passes, rooftop watch parties, and South Beach nightlife.',
    destination: 'Miami, FL',
    trip_type: 'consumer',
    start_date: '2026-05-01T00:00:00Z',
    end_date: '2026-05-05T00:00:00Z',
    basecamp_name: 'Faena Hotel Miami Beach',
    basecamp_address: '3201 Collins Ave, Miami Beach, FL 33140',
  },
  {
    id: 'carlton-amalfi-2026',
    name: 'Amalfi Coast Escape',
    description: 'Positano sunsets, Ravello gardens, limoncello on the cliffs. Pure Italian summer.',
    destination: 'Amalfi, Italy',
    trip_type: 'consumer',
    start_date: '2026-06-20T00:00:00Z',
    end_date: '2026-06-27T00:00:00Z',
    basecamp_name: 'Hotel Le Sirenuse',
    basecamp_address: 'Via Cristoforo Colombo, 30, 84017 Positano SA, Italy',
  },
  {
    id: 'carlton-bali-2026',
    name: 'Bali Surf Retreat',
    description: 'Morning surf sessions, rice terrace hikes, temple visits, and sunset yoga in Uluwatu.',
    destination: 'Bali, Indonesia',
    trip_type: 'consumer',
    start_date: '2026-08-05T00:00:00Z',
    end_date: '2026-08-14T00:00:00Z',
    basecamp_name: 'COMO Uma Canggu',
    basecamp_address: 'Jl. Pantai Batu Mejan, Echo Beach, Canggu, Bali 80361',
  },
  {
    id: 'carlton-greek-islands-2026',
    name: 'Greek Island Hopper',
    description: 'Santorini to Mykonos to Paros. Cliff-side dinners, catamaran sailing, and ouzo sunsets.',
    destination: 'Santorini, Greece',
    trip_type: 'consumer',
    start_date: '2026-09-10T00:00:00Z',
    end_date: '2026-09-20T00:00:00Z',
    basecamp_name: 'Canaves Oia Suites',
    basecamp_address: 'Oia 847 02, Santorini, Greece',
  },
];

const PRO_TRIPS: TripDef[] = [
  {
    id: 'carlton-chappelle-chicago',
    name: 'Dave Chappelle Comedy Tour — Chicago',
    description: 'Production coordination for the Chicago stop. Load-in, soundcheck, greenroom setup, and show night.',
    destination: 'Chicago, IL',
    trip_type: 'pro',
    start_date: '2025-09-18T00:00:00Z',
    end_date: '2025-09-21T00:00:00Z',
    basecamp_name: 'The Chicago Athletic Association',
    basecamp_address: '12 S Michigan Ave, Chicago, IL 60603',
    categories: ['touring'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-nba-media-vegas',
    name: 'NBA Summer League Media Trip',
    description: 'Press credentials, courtside content capture, player interviews, and podcast recordings.',
    destination: 'Las Vegas, NV',
    trip_type: 'pro',
    start_date: '2025-07-12T00:00:00Z',
    end_date: '2025-07-16T00:00:00Z',
    basecamp_name: 'The Venetian Resort',
    basecamp_address: '3355 S Las Vegas Blvd, Las Vegas, NV 89109',
    categories: ['sports'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-podcast-austin',
    name: 'Podcast Creator Summit — Austin',
    description: 'Live podcast recordings, creator meetups, and brand partnership meetings at the summit.',
    destination: 'Austin, TX',
    trip_type: 'pro',
    start_date: '2025-10-03T00:00:00Z',
    end_date: '2025-10-06T00:00:00Z',
    basecamp_name: 'South Congress Hotel',
    basecamp_address: '1603 South Congress Ave, Austin, TX 78704',
    categories: ['work'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-dj-tour-berlin',
    name: 'Global DJ Tour Stop — Berlin',
    description: 'Berghain afterparty, Tresor DJ set, and studio sessions with local producers.',
    destination: 'Berlin, Germany',
    trip_type: 'pro',
    start_date: '2026-02-12T00:00:00Z',
    end_date: '2026-02-16T00:00:00Z',
    basecamp_name: 'Hotel Zoo Berlin',
    basecamp_address: 'Kurfürstendamm 25, 10719 Berlin, Germany',
    categories: ['touring'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-film-vancouver',
    name: 'Film Production Shoot — Vancouver',
    description: 'Three-day shoot for a brand campaign. Scouting locations, crew coordination, and post-production review.',
    destination: 'Vancouver, BC',
    trip_type: 'pro',
    start_date: '2026-04-22T00:00:00Z',
    end_date: '2026-04-27T00:00:00Z',
    basecamp_name: 'Fairmont Hotel Vancouver',
    basecamp_address: '900 W Georgia St, Vancouver, BC V6C 2W6, Canada',
    categories: ['productions'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-fashion-paris',
    name: 'Fashion Week Coverage — Paris',
    description: 'Front row at Jacquemus, backstage at Louis Vuitton, and content shoots at the Palais de Tokyo.',
    destination: 'Paris, France',
    trip_type: 'pro',
    start_date: '2026-06-28T00:00:00Z',
    end_date: '2026-07-03T00:00:00Z',
    basecamp_name: 'Le Marais Boutique Hotel',
    basecamp_address: 'Rue de Rivoli, 75004 Paris, France',
    categories: ['work'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-sports-agent-miami',
    name: 'Sports Agent Client Meeting — Miami',
    description: 'Contract negotiations, client dinners at Prime 112, and a Heat game at Kaseya Center.',
    destination: 'Miami, FL',
    trip_type: 'pro',
    start_date: '2026-01-22T00:00:00Z',
    end_date: '2026-01-25T00:00:00Z',
    basecamp_name: 'Four Seasons Surf Club',
    basecamp_address: '9011 Collins Ave, Surfside, FL 33154',
    categories: ['sports'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-music-fest-la',
    name: 'Music Festival Production — Los Angeles',
    description: 'Stage management, artist logistics, sound engineering coordination for a two-day festival.',
    destination: 'Los Angeles, CA',
    trip_type: 'pro',
    start_date: '2026-05-15T00:00:00Z',
    end_date: '2026-05-19T00:00:00Z',
    basecamp_name: 'The LINE LA',
    basecamp_address: '3515 Wilshire Blvd, Los Angeles, CA 90010',
    categories: ['touring'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-founder-tahoe',
    name: 'Venture Founder Retreat — Lake Tahoe',
    description: 'Three days of fireside chats, pitch sessions, and networking with top-tier VCs at the lake.',
    destination: 'Lake Tahoe, CA',
    trip_type: 'pro',
    start_date: '2026-07-10T00:00:00Z',
    end_date: '2026-07-14T00:00:00Z',
    basecamp_name: 'The Ritz-Carlton Lake Tahoe',
    basecamp_address: '13031 Ritz-Carlton Highlands Ct, Truckee, CA 96161',
    categories: ['work'],
    chat_mode: 'everyone',
  },
  {
    id: 'carlton-creator-conf-nyc',
    name: 'Creator Economy Conference — NYC',
    description: 'Keynote speaking, brand deal workshops, and after-party at The Standard.',
    destination: 'New York, NY',
    trip_type: 'pro',
    start_date: '2026-08-20T00:00:00Z',
    end_date: '2026-08-23T00:00:00Z',
    basecamp_name: 'The Standard High Line',
    basecamp_address: '848 Washington St, New York, NY 10014',
    categories: ['work'],
    chat_mode: 'everyone',
  },
];

const EVENT_TRIPS: TripDef[] = [
  {
    id: 'carlton-event-miami-f1',
    name: 'Miami Formula 1 Grand Prix',
    description: 'The ultimate race weekend experience. Paddock access, fan zones, and celebrity after-parties.',
    destination: 'Miami, FL',
    trip_type: 'event',
    start_date: '2026-05-01T00:00:00Z',
    end_date: '2026-05-04T00:00:00Z',
    basecamp_name: 'Hard Rock Stadium',
    basecamp_address: '347 Don Shula Dr, Miami Gardens, FL 33056',
  },
  {
    id: 'carlton-event-super-bowl',
    name: 'Super Bowl 2027',
    description: 'The Big Game. Tailgate, pregame concerts, and the best seats in the house.',
    destination: 'New Orleans, LA',
    trip_type: 'event',
    start_date: '2027-02-12T00:00:00Z',
    end_date: '2027-02-15T00:00:00Z',
    basecamp_name: 'The Roosevelt New Orleans',
    basecamp_address: '130 Roosevelt Way, New Orleans, LA 70112',
  },
  {
    id: 'carlton-event-cannes',
    name: 'Cannes Film Festival',
    description: 'Red carpet premieres, yacht parties, and networking with filmmakers on the Croisette.',
    destination: 'Cannes, France',
    trip_type: 'event',
    start_date: '2026-05-19T00:00:00Z',
    end_date: '2026-05-25T00:00:00Z',
    basecamp_name: 'Hôtel Martinez',
    basecamp_address: '73 La Croisette, 06400 Cannes, France',
  },
  {
    id: 'carlton-event-jfl-montreal',
    name: 'Just For Laughs Montreal',
    description: 'Comedy showcases, gala tapings, and secret late-night sets in Old Montreal.',
    destination: 'Montreal, Canada',
    trip_type: 'event',
    start_date: '2026-07-15T00:00:00Z',
    end_date: '2026-07-20T00:00:00Z',
    basecamp_name: 'Hotel Nelligan',
    basecamp_address: '106 Rue Saint-Paul O, Montréal, QC H2Y 1Z3, Canada',
  },
  {
    id: 'carlton-event-art-basel',
    name: 'Art Basel Miami',
    description: 'Gallery previews, installations in Wynwood, and collector dinners in the Design District.',
    destination: 'Miami, FL',
    trip_type: 'event',
    start_date: '2025-12-03T00:00:00Z',
    end_date: '2025-12-07T00:00:00Z',
    basecamp_name: 'The Setai Miami Beach',
    basecamp_address: '2001 Collins Ave, Miami Beach, FL 33139',
  },
  {
    id: 'carlton-event-sundance',
    name: 'Sundance Film Festival',
    description: 'Indie film premieres, Q&As with directors, and après-ski at Deer Valley.',
    destination: 'Park City, UT',
    trip_type: 'event',
    start_date: '2026-01-22T00:00:00Z',
    end_date: '2026-01-28T00:00:00Z',
    basecamp_name: 'Stein Eriksen Lodge',
    basecamp_address: '7700 Stein Way, Park City, UT 84060',
  },
  {
    id: 'carlton-event-sxsw',
    name: 'SXSW Austin 2026',
    description: 'Music showcases, interactive panels, film premieres, and the legendary 6th Street crawl.',
    destination: 'Austin, TX',
    trip_type: 'event',
    start_date: '2026-03-06T00:00:00Z',
    end_date: '2026-03-15T00:00:00Z',
    basecamp_name: 'Austin Proper Hotel',
    basecamp_address: '600 W 2nd St, Austin, TX 78701',
  },
  {
    id: 'carlton-event-monaco-gp',
    name: 'Monaco Grand Prix',
    description: 'The crown jewel of motorsport. Yacht viewing, Casino Square, and the Monte Carlo circuit.',
    destination: 'Monte Carlo, Monaco',
    trip_type: 'event',
    start_date: '2026-05-22T00:00:00Z',
    end_date: '2026-05-26T00:00:00Z',
    basecamp_name: 'Hôtel de Paris Monte-Carlo',
    basecamp_address: 'Place du Casino, 98000 Monaco',
  },
];

const ALL_TRIPS = [...CONSUMER_TRIPS, ...PRO_TRIPS, ...EVENT_TRIPS];

// ─── Multiplayer Chat Messages ──────────────────────────────────────────────

interface ChatMsg {
  content: string;
  offset_hours: number;
  /** Index into trip's member list. null = Carlton Gold (demo user) */
  sender: number | null;
  /** Message type: text (default), system, broadcast */
  message_type?: 'text' | 'system' | 'broadcast';
  system_event_type?: string;
  /** Reactions as emoji -> sender indices */
  reactions?: Record<string, number[]>;
}

function getChatMessages(trip: TripDef, members: MockUser[]): ChatMsg[] {
  // m0, m1, m2, m3 are indices into the members array for this trip
  const map: Record<string, ChatMsg[]> = {
    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #1: Tokyo Street Food Crawl — AI builds a night plan
    // ────────────────────────────────────────────────────────────────────────
    'carlton-tokyo-2025': [
      { content: 'Narita Express to Shinjuku — meeting everyone at the hotel lobby at 6pm.', offset_hours: -2, sender: null },
      { content: 'just landed! immigration took forever but i made it 🛬', offset_hours: -1, sender: 0 },
      { content: 'same. grabbing the express now', offset_hours: -0.5, sender: 1 },
      { content: 'Tsukiji outer market for breakfast tomorrow. Fresh sushi at 7am.', offset_hours: 6, sender: null },
      { content: '7am?? on vacation?? 😂', offset_hours: 6.1, sender: 2 },
      { content: 'trust me it\'s worth it', offset_hours: 6.2, sender: null },
      { content: 'fine but coffee first', offset_hours: 6.3, sender: 2 },
      { content: 'Found a 6-seat omakase in Ginza with a 3-month waitlist. Got us in. 🍣', offset_hours: 24, sender: null, reactions: { '🔥': [0, 1], '🙏': [2] } },
      { content: 'HOW', offset_hours: 24.1, sender: 1 },
      { content: 'don\'t ask questions just show up', offset_hours: 24.2, sender: null },
      { content: 'Shibuya Crossing at night is something else. Filmed the whole thing.', offset_hours: 48, sender: null },
      { content: 'the video is insane. posting it tomorrow', offset_hours: 48.2, sender: 0 },
      { content: 'Ramen Ichiran at 1am — the solo booth experience is peak introvert dining.', offset_hours: 60, sender: null },
      { content: 'i literally ate three bowls', offset_hours: 60.5, sender: 1 },
      { content: 'no shame. it\'s that good', offset_hours: 60.6, sender: 0 },
      { content: 'TeamLab Borderless was mind-blowing. Allow 3 hours minimum.', offset_hours: 72, sender: null, reactions: { '🤯': [0, 1, 2] } },
      // System messages
      { content: 'Jordan James added a place: Ichiran Shibuya', offset_hours: 61, sender: 1, message_type: 'system', system_event_type: 'calendar_item_added' },
      { content: 'Alexandra Countley uploaded 12 photos', offset_hours: 73, sender: 0, message_type: 'system', system_event_type: 'photos_uploaded' },
      // Post-AI reactions (AI query about best first night food plan)
      { content: '@concierge best first night food plan near Shibuya?', offset_hours: 5, sender: 0 },
      { content: 'that izakaya crawl route looks perfect', offset_hours: 5.5, sender: 1 },
      { content: 'add the first two to places', offset_hours: 5.6, sender: null },
      { content: 'Alexandra Countley added 2 places from AI Concierge recommendations', offset_hours: 5.7, sender: 0, message_type: 'system', system_event_type: 'calendar_item_added' },
      { content: 'Day trip to Hakone for hot springs and views of Fuji. Worth every minute.', offset_hours: 120, sender: null },
      { content: 'the onsen was life-changing', offset_hours: 121, sender: 2 },
      { content: 'Last night in Roppongi. This trip changed how I think about food and culture.', offset_hours: 180, sender: null },
      { content: 'already planning to come back 🇯🇵', offset_hours: 180.5, sender: 0 },
      { content: 'this was the best trip we\'ve done. period.', offset_hours: 181, sender: 1 },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #2: Ibiza Birthday Weekend — AI decision flow
    // ────────────────────────────────────────────────────────────────────────
    'carlton-ibiza-2026': [
      { content: 'Birthday trip is LOCKED. Villa booked, flights confirmed. Let\'s go! 🎉', offset_hours: -168, sender: null, reactions: { '🎉': [0, 1, 2, 3] } },
      { content: 'YESSS been waiting for this', offset_hours: -167, sender: 0 },
      { content: 'counting the days', offset_hours: -166, sender: 1 },
      { content: 'need this trip badly', offset_hours: -165, sender: 2 },
      { content: 'Café del Mar sunset session Friday night — I\'ll put us on the list.', offset_hours: -72, sender: null },
      { content: 'legendary spot', offset_hours: -71, sender: 3 },
      { content: 'Private boat charter on Saturday. Departure from San Antonio marina at 11am.', offset_hours: -24, sender: null },
      { content: 'should we rent a boat saturday', offset_hours: -25, sender: 1 },
      { content: 'yes', offset_hours: -24.9, sender: 0 },
      { content: '100%', offset_hours: -24.8, sender: 2 },
      { content: 'i\'m in', offset_hours: -24.7, sender: 3 },
      { content: 'Jordan James created task: Book boat charter', offset_hours: -24.5, sender: 1, message_type: 'system', system_event_type: 'task_created' },
      { content: 'The villa has a pool, DJ setup, and views of Dalt Vila. We\'re set.', offset_hours: 0, sender: null },
      { content: 'wait there\'s a DJ booth?? 🎧', offset_hours: 0.5, sender: 1 },
      { content: 'i\'m claiming it', offset_hours: 0.6, sender: 1 },
      { content: 'no one let Jordan pick the restaurant again', offset_hours: 1, sender: 2 },
      { content: 'one bad taco place and i\'m banned forever 😂', offset_hours: 1.1, sender: 1 },
      { content: 'Birthday dinner at Cala Bonita — reservation for 10 at 8:30pm.', offset_hours: 12, sender: null, reactions: { '🔥': [0, 1], '👏': [2, 3] } },
      { content: 'should we reserve dinner friday?', offset_hours: 8, sender: 2 },
      // Post-AI reactions (AI about dinner/sunset/boat)
      { content: '@concierge help decide friday dinner, sunset drinks, and saturday boat options', offset_hours: -50, sender: null },
      { content: 'that second restaurant looks incredible', offset_hours: -49, sender: 0 },
      { content: 'create the poll for dinner', offset_hours: -48.5, sender: null },
      { content: 'Carlton Gold created a poll: "Dinner Friday night?"', offset_hours: -48, sender: null, message_type: 'system', system_event_type: 'poll_created' },
      { content: 'Pacha tonight. Table confirmed. This is what 32 looks like. 🕺', offset_hours: 36, sender: null },
      { content: 'HAPPY BIRTHDAY 🎂', offset_hours: 36.5, sender: 0 },
      { content: '32 looks good on you', offset_hours: 36.6, sender: 1 },
      { content: 'Best birthday I\'ve ever had. Love this crew.', offset_hours: 72, sender: null },
      { content: 'this reminded me of the SXSW trip but better', offset_hours: 72.5, sender: 0 },
      { content: 'Recovery day at the villa. Pool, music, zero plans.', offset_hours: 84, sender: null },
      { content: 'perfect', offset_hours: 84.1, sender: 1 },
      { content: '📣 Meet at the villa lobby at 7pm for birthday dinner. Dress code: island vibes.', offset_hours: 11, sender: null, message_type: 'broadcast' },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #3: Amalfi Coast — Reservation card moment
    // ────────────────────────────────────────────────────────────────────────
    'carlton-amalfi-2026': [
      { content: 'Flights booked! Rome → Naples → ferry to Positano. Arriving June 20th.', offset_hours: -336, sender: null },
      { content: 'booked mine too ✈️', offset_hours: -335, sender: 0 },
      { content: 'Le Sirenuse is one of the most beautiful hotels on the planet. Can\'t wait.', offset_hours: -240, sender: null },
      { content: 'the photos look unreal', offset_hours: -239, sender: 1 },
      { content: 'Renting a boat for the day to hit Capri — Grotta Azzurra is a must.', offset_hours: -168, sender: null },
      { content: 'Need restaurant recommendations — Da Adolfo for beach lunch? Zass for dinner?', offset_hours: -120, sender: null },
      { content: 'Da Adolfo is a vibe. you take a boat to get there', offset_hours: -119, sender: 2 },
      { content: '@concierge find us a special dinner for Saturday with a view', offset_hours: -100, sender: null },
      { content: 'oh wow that Zass recommendation is perfect', offset_hours: -99, sender: 0 },
      { content: 'add it to the calendar', offset_hours: -98.5, sender: 1 },
      { content: 'Carlton Gold added calendar event: Dinner at Zass', offset_hours: -98, sender: null, message_type: 'system', system_event_type: 'calendar_item_added' },
      { content: 'this trip is going to be different', offset_hours: -97, sender: 2, reactions: { '🙌': [0, 1] } },
      { content: 'Packing light — it\'s all linen and sandals for a week.', offset_hours: -72, sender: null },
      { content: 'same. one carry-on energy', offset_hours: -71, sender: 0 },
      { content: 'Limoncello tasting in Ravello on day 3. The gardens there are insane.', offset_hours: -48, sender: null },
      { content: 'this reminds me of the greek islands trip we\'re planning', offset_hours: -47, sender: 1 },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #4: Toronto — "Add to calendar" moment
    // ────────────────────────────────────────────────────────────────────────
    'carlton-toronto-2026': [
      { content: 'Flying into YYZ Thursday night. Anyone arriving earlier?', offset_hours: -48, sender: null },
      { content: 'getting in wednesday night actually', offset_hours: -47, sender: 0 },
      { content: 'same! early bird crew', offset_hours: -46, sender: 1 },
      { content: 'Kensington Market food crawl Friday afternoon — empanadas, jerk chicken, and dim sum.', offset_hours: 0, sender: null },
      { content: 'i\'m starving already', offset_hours: 0.5, sender: 2 },
      { content: '@concierge best live music spots near downtown friday night?', offset_hours: 1, sender: 1 },
      { content: 'add that to calendar', offset_hours: 2, sender: 1 },
      { content: 'Jordan James added calendar event: Live music at The Horseshoe Tavern', offset_hours: 2.5, sender: 1, message_type: 'system', system_event_type: 'calendar_item_added' },
      { content: 'CN Tower dinner is booked for Saturday at 7pm. Window table. 🗼', offset_hours: 24, sender: null, reactions: { '🔥': [0, 1, 2] } },
      { content: 'Drake\'s OVO store is a 5-minute walk from the hotel. Just saying.', offset_hours: 28, sender: null },
      { content: 'already planned on it 😂', offset_hours: 28.5, sender: 0 },
      { content: 'Found a crazy good ramen spot in Koreatown. Kinton Ramen — go immediately.', offset_hours: 48, sender: null },
      { content: 'on it', offset_hours: 48.1, sender: 1 },
      { content: 'St. Lawrence Market on Sunday morning for peameal bacon sandwiches. Canadian staple.', offset_hours: 60, sender: null },
      { content: 'Toronto punches way above its weight. Underrated food city.', offset_hours: 84, sender: null },
      { content: 'already better planned than SXSW 😂', offset_hours: 84.5, sender: 0 },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // Other Consumer Trips (multiplayer but no highlight moment)
    // ────────────────────────────────────────────────────────────────────────
    'carlton-iceland-2026': [
      { content: 'Just booked the Northern Lights jeep tour for the 10th — everyone needs to be ready by 8pm 🌌', offset_hours: -72, sender: null },
      { content: 'wait 8pm?? isn\'t it dark at like 4?', offset_hours: -71, sender: 0 },
      { content: 'that\'s the point lol', offset_hours: -70.5, sender: 1 },
      { content: 'Pack thermal layers. It was -15°C last year when my friend went.', offset_hours: -48, sender: null },
      { content: 'noted. buying thermals now', offset_hours: -47, sender: 2 },
      { content: 'Hotel Rangá has a hot tub with direct aurora views. We\'re locked in.', offset_hours: -24, sender: null, reactions: { '🔥': [0, 1, 2] } },
      { content: 'Golden Circle day trip confirmed — Gullfoss, Geysir, Thingvellir. Driver picking us up at 9am.', offset_hours: 2, sender: null },
      { content: 'THE LIGHTS WERE INSANE TONIGHT. Best I\'ve ever seen. Check the group album.', offset_hours: 52, sender: null, reactions: { '🤯': [0, 1], '🙌': [2] } },
      { content: 'crying. actual tears.', offset_hours: 52.5, sender: 0 },
      { content: 'best thing i\'ve ever witnessed', offset_hours: 53, sender: 1 },
      { content: 'Ice cave tour tomorrow at 11am. Don\'t forget waterproof boots.', offset_hours: 72, sender: null },
      { content: 'Last night dinner at Grillið was incredible. The lamb is a must.', offset_hours: 96, sender: null },
      { content: 'that lamb tho 🤤', offset_hours: 96.5, sender: 2 },
      { content: 'Already planning to come back next winter. This trip set the bar.', offset_hours: 140, sender: null },
      { content: 'absolutely. top 3 trip of all time', offset_hours: 141, sender: 0 },
      { content: 'Alexandra Countley uploaded 24 photos', offset_hours: 100, sender: 0, message_type: 'system', system_event_type: 'photos_uploaded' },
    ],
    'carlton-mexico-city-2025': [
      { content: 'Landing at MEX at 2pm Thursday. Who\'s arriving when?', offset_hours: -48, sender: null },
      { content: 'same flight actually lol', offset_hours: -47, sender: 0 },
      { content: 'getting in friday morning', offset_hours: -46, sender: 1 },
      { content: 'Found an incredible mezcal tasting in Roma Norte — Friday at 7pm?', offset_hours: -24, sender: null },
      { content: 'yes please 🥃', offset_hours: -23, sender: 0 },
      { content: 'The gallery opening in Coyoacán is Saturday night. Dress code: creative casual.', offset_hours: 0, sender: null },
      { content: 'Tacos al pastor at El Vilsito at 2am was a religious experience. 10/10.', offset_hours: 24, sender: null, reactions: { '🔥': [0, 1] } },
      { content: 'i ate four plates. no regrets', offset_hours: 24.5, sender: 1 },
      { content: 'Street art tour in Roma was amazing. The guide knew every artist personally.', offset_hours: 36, sender: null },
      { content: 'Churros y chocolate at El Moro before we fly out tomorrow ☕', offset_hours: 60, sender: null },
      { content: 'perfect ending', offset_hours: 60.5, sender: 0 },
    ],
    'carlton-sxsw-2025': [
      { content: 'Badge pickup is at the convention center. I\'ll grab everyone\'s.', offset_hours: -12, sender: null },
      { content: 'MVP move 🙏', offset_hours: -11, sender: 0 },
      { content: 'The AI panel at 2pm is a must-see — Sam Altman is on it.', offset_hours: 0, sender: null },
      { content: 'Free tacos at the Google activation on Rainey Street 🌮', offset_hours: 24, sender: null },
      { content: 'already there lol', offset_hours: 24.1, sender: 1 },
      { content: 'Secret Kendrick show tonight at Stubb\'s. RSVP link in the group.', offset_hours: 48, sender: null, reactions: { '🔥': [0, 1, 2] } },
      { content: 'NO WAY', offset_hours: 48.1, sender: 0 },
      { content: 'Met some incredible founders at the mixer. Adding them to my network.', offset_hours: 72, sender: null },
      { content: 'Last day — catching the closing night film at the Paramount Theatre.', offset_hours: 168, sender: null },
      { content: 'SXSW never disappoints. Already registered for next year.', offset_hours: 192, sender: null },
      { content: 'same. see you there', offset_hours: 192.5, sender: 0 },
    ],
    'carlton-nba-summer-2025': [
      { content: 'Courtside seats locked for the first three games. Let\'s gooo 🏀', offset_hours: -24, sender: null, reactions: { '🏀': [0, 1, 2] } },
      { content: 'Pool party at Encore Beach Club after today\'s games.', offset_hours: 12, sender: null },
      { content: 'That rookie from Duke is going to be a problem. Mark my words.', offset_hours: 36, sender: null },
      { content: 'agreed. his handle is insane', offset_hours: 36.5, sender: 0 },
      { content: 'Dinner at STK tonight — reservation for 6 at 9pm.', offset_hours: 48, sender: null },
      { content: 'Last game today. Anyone want to hit the sportsbook after?', offset_hours: 72, sender: null },
      { content: 'obviously', offset_hours: 72.1, sender: 1 },
      { content: 'i\'m in', offset_hours: 72.2, sender: 2 },
      { content: 'Vegas Summer League is the best annual tradition we have.', offset_hours: 96, sender: null },
    ],
    'carlton-nola-jazz-2025': [
      { content: 'Landing in NOLA at noon. Going straight to Frenchmen Street. 🎷', offset_hours: -6, sender: null },
      { content: 'Beignets at Café du Monde first thing — non-negotiable.', offset_hours: 0, sender: null },
      { content: 'obviously 🍩', offset_hours: 0.5, sender: 0 },
      { content: 'The Preservation Hall show was transcendent. Real jazz is alive.', offset_hours: 18, sender: null, reactions: { '🎷': [0, 1] } },
      { content: 'Late night po\'boys at Parkway Bakery. Turkey & gravy. Trust me.', offset_hours: 30, sender: null },
      { content: 'life-changing sandwich', offset_hours: 30.5, sender: 1 },
      { content: 'Swamp tour tomorrow morning — gators and all.', offset_hours: 36, sender: null },
      { content: 'NOLA will always be one of my favorite cities. The soul is unmatched.', offset_hours: 60, sender: null },
      { content: 'can\'t believe it\'s over already', offset_hours: 60.5, sender: 0 },
    ],
    'carlton-miami-f1-consumer': [
      { content: 'Race weekend itinerary coming tomorrow. Paddock passes are confirmed! 🏎️', offset_hours: -120, sender: null, reactions: { '🏎️': [0, 1, 2] } },
      { content: 'Rooftop watch party at 1 Hotel on Friday — practice sessions and cocktails.', offset_hours: -24, sender: null },
      { content: 'i\'m bringing binoculars', offset_hours: -23, sender: 0 },
      { content: 'Qualifying is Saturday at 4pm. Meeting at the gate at 2pm for paddock walkthrough.', offset_hours: 0, sender: null },
      { content: 'Post-qualifying dinner at Zuma. Reservation for 8 at 9pm.', offset_hours: 6, sender: null },
      { content: 'Race day! Let\'s get there early. Gates open at 11am.', offset_hours: 24, sender: null },
      { content: 'LIV on Sunday night. Table confirmed. The energy after the race is unreal.', offset_hours: 30, sender: null },
      { content: 'What a weekend. Miami F1 is becoming the best event on the calendar.', offset_hours: 72, sender: null },
      { content: 'Need to do Monaco next month. Who\'s in?', offset_hours: 84, sender: null },
      { content: '🙋‍♂️', offset_hours: 84.1, sender: 0 },
      { content: '🙋‍♀️', offset_hours: 84.2, sender: 1 },
    ],
    'carlton-bali-2026': [
      { content: 'Surf retreat is happening! August 5-14 in Canggu. Villa secured 🏄‍♂️', offset_hours: -504, sender: null },
      { content: 'let\'s gooo', offset_hours: -503, sender: 0 },
      { content: 'Morning surf sessions at Echo Beach, afternoon yoga at The Practice. Balance.', offset_hours: -336, sender: null },
      { content: 'Tegallalang rice terraces day trip planned for day 3.', offset_hours: -240, sender: null },
      { content: 'the pictures from there are insane', offset_hours: -239, sender: 1 },
      { content: 'Uluwatu temple sunset ceremony — supposed to be life-changing.', offset_hours: -168, sender: null },
      { content: 'La Brisa for sunset cocktails. Best beach club in Canggu.', offset_hours: -120, sender: null },
      { content: 'Anyone want to do the Mount Batur sunrise trek? 2am start but worth it.', offset_hours: -72, sender: null },
      { content: 'i\'m in if there\'s coffee at the top', offset_hours: -71, sender: 2 },
      { content: 'there is! they cook breakfast up there', offset_hours: -70, sender: null },
    ],
    'carlton-greek-islands-2026': [
      { content: 'Island hopping route: Santorini (3 nights) → Mykonos (3 nights) → Paros (3 nights). Ferries booked.', offset_hours: -504, sender: null },
      { content: 'this is going to be epic', offset_hours: -503, sender: 0 },
      { content: 'Sunset dinner at Ammoudi Bay in Oia — the seafood tavernas right on the water.', offset_hours: -336, sender: null },
      { content: 'Catamaran sailing day in Santorini — includes swimming stops and BBQ on board.', offset_hours: -240, sender: null, reactions: { '⛵': [0, 1, 2] } },
      { content: 'Mykonos nightlife is legendary. Scorpios for sunset, then Little Venice.', offset_hours: -168, sender: null },
      { content: 'Paros is the hidden gem of the Cyclades. Less touristy, more authentic.', offset_hours: -120, sender: null },
      { content: 'this reminds me of the amalfi planning', offset_hours: -119, sender: 1 },
      { content: 'Need to book that cliffside restaurant in Fira everyone keeps recommending.', offset_hours: -72, sender: null },
      { content: 'on it', offset_hours: -71, sender: 0 },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #5: Dave Chappelle Chicago — Pro logistics
    // ────────────────────────────────────────────────────────────────────────
    'carlton-chappelle-chicago': [
      { content: 'Load-in at the Chicago Theatre starts at 10am. Crew meet at the loading dock.', offset_hours: -12, sender: null },
      { content: 'copy. i\'ll be there at 9:30', offset_hours: -11.5, sender: 0 },
      { content: 'same', offset_hours: -11.4, sender: 1 },
      { content: 'Soundcheck moved to 4pm — Dave wants extra time for the new material.', offset_hours: 0, sender: null },
      { content: 'got it. updating the schedule now', offset_hours: 0.5, sender: 0 },
      { content: 'Greenroom setup: sparkling water, fresh fruit, and NO peanuts. Allergy on crew.', offset_hours: 6, sender: null },
      { content: 'noted ✅', offset_hours: 6.1, sender: 1 },
      { content: '@concierge summarize tomorrow\'s logistics and turn anything urgent into tasks', offset_hours: -6, sender: null },
      { content: 'this is exactly what we needed', offset_hours: -5, sender: 0, reactions: { '👏': [1, 2] } },
      { content: 'Carlton Gold created task: Confirm ground transport', offset_hours: -4.5, sender: null, message_type: 'system', system_event_type: 'task_created' },
      { content: 'Carlton Gold created task: Merch inventory check', offset_hours: -4.4, sender: null, message_type: 'system', system_event_type: 'task_created' },
      { content: 'Carlton Gold created task: Green room guest list', offset_hours: -4.3, sender: null, message_type: 'system', system_event_type: 'task_created' },
      { content: '📣 Lobby call is 3:30pm. Wheels up 4:00pm. Don\'t be late.', offset_hours: -3, sender: null, message_type: 'broadcast' },
      { content: 'Show was INCREDIBLE. Standing ovation. Three encores. Chicago loves Dave.', offset_hours: 24, sender: null, reactions: { '🔥': [0, 1, 2] } },
      { content: 'that was one of the best shows i\'ve ever worked', offset_hours: 24.5, sender: 0 },
      { content: 'Post-show dinner at Gibson\'s. The team earned it.', offset_hours: 26, sender: null },
      { content: 'Next stop is Detroit. Travel logistics coming tomorrow.', offset_hours: 48, sender: null },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #6: NBA Summer League Media — Flight card
    // ────────────────────────────────────────────────────────────────────────
    'carlton-nba-media-vegas': [
      { content: 'Press credentials confirmed. Courtside media row, games 1-4.', offset_hours: -24, sender: null },
      { content: 'huge. let\'s get it', offset_hours: -23, sender: 0 },
      { content: '@concierge best flight options for arriving before media availability thursday?', offset_hours: -48, sender: null },
      { content: 'let\'s book the nonstop', offset_hours: -47, sender: null },
      { content: 'Carlton Gold created task: Book airport transfer from LAS', offset_hours: -46, sender: null, message_type: 'system', system_event_type: 'task_created' },
      { content: 'Interview with the #2 pick scheduled for 3pm at the Thomas & Mack Center.', offset_hours: 0, sender: null },
      { content: 'Content team: need B-roll of the crowd energy during the halftime dunk contest.', offset_hours: 12, sender: null },
      { content: 'on it 📹', offset_hours: 12.5, sender: 1 },
      { content: 'Podcast recording at the hotel suite tonight — mics are set up.', offset_hours: 24, sender: null },
      { content: 'Got exclusive quotes from the Celtics coach. This episode is going to be fire 🔥', offset_hours: 36, sender: null, reactions: { '🔥': [0, 1] } },
      { content: 'this saved me 20 tabs of research', offset_hours: 37, sender: 0 },
      { content: 'Wrap on the Vegas media trip. Content calendar is loaded for the next month.', offset_hours: 72, sender: null },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #7: DJ Tour Berlin — Chaos containment
    // ────────────────────────────────────────────────────────────────────────
    'carlton-dj-tour-berlin': [
      { content: 'Equipment shipped to Berlin — arriving at the venue Thursday morning.', offset_hours: -48, sender: null },
      { content: 'what time is load-in?', offset_hours: -47, sender: 0 },
      { content: 'where are we eating tonight?', offset_hours: -46, sender: 1 },
      { content: 'what time is hotel check-in?', offset_hours: -45, sender: 2 },
      { content: '@concierge organize the important logistics from this thread', offset_hours: -44, sender: null },
      { content: 'this is exactly what we needed', offset_hours: -43, sender: 0, reactions: { '🙏': [1, 2] } },
      { content: 'Carlton Gold created task: Confirm load-in time with venue', offset_hours: -42.5, sender: null, message_type: 'system', system_event_type: 'task_created' },
      { content: 'Carlton Gold created task: Book dinner reservation', offset_hours: -42.4, sender: null, message_type: 'system', system_event_type: 'task_created' },
      { content: 'Studio session with local producers at Funkhaus from 2-6pm.', offset_hours: 0, sender: null },
      { content: 'Tresor set is Saturday night 1-3am. Going to debut the new tracks.', offset_hours: 12, sender: null },
      { content: 'After-party location confirmed. Invite-only. 50 people max.', offset_hours: 24, sender: null },
      { content: 'The crowd at Tresor was something else. Berlin knows how to party.', offset_hours: 48, sender: null, reactions: { '🎧': [0, 1, 2] } },
      { content: 'Berlin might be my favorite city for music. The culture here is unmatched.', offset_hours: 72, sender: null },
      { content: 'understatement of the century', offset_hours: 72.5, sender: 1 },
    ],

    // Other Pro trips
    'carlton-podcast-austin': [
      { content: 'Studio is booked at the hotel conference room. Bringing portable mics.', offset_hours: -12, sender: null },
      { content: 'Panel on creator monetization at 2pm — I\'m moderating.', offset_hours: 0, sender: null },
      { content: 'good luck! you\'ll crush it', offset_hours: 0.5, sender: 0 },
      { content: 'Live podcast recording tonight with 200+ in attendance. Sold out.', offset_hours: 18, sender: null, reactions: { '🎙️': [0, 1] } },
      { content: 'Brand partnership meeting with Nike tomorrow at 10am. Big opportunity.', offset_hours: 24, sender: null },
      { content: 'Austin\'s creator scene is growing fast. So many talented people here.', offset_hours: 48, sender: null },
      { content: 'Summit was a success. 3 new brand deals in the pipeline.', offset_hours: 60, sender: null },
      { content: 'huge W', offset_hours: 60.5, sender: 0 },
    ],
    'carlton-film-vancouver': [
      { content: 'Shot list finalized. Day 1: downtown locations. Day 2: Stanley Park. Day 3: studio.', offset_hours: -24, sender: null },
      { content: 'Crew call time is 6am at the Gastown location. Coffee will be there.', offset_hours: 0, sender: null },
      { content: 'coffee is mandatory at 6am', offset_hours: 0.5, sender: 0 },
      { content: 'Lost the light at 4pm but got incredible golden hour footage.', offset_hours: 10, sender: null },
      { content: 'Rain delay on Day 2 — switching to the studio scenes first.', offset_hours: 24, sender: null },
      { content: 'good call', offset_hours: 24.5, sender: 1 },
      { content: 'Wrap on principal photography! Dailies look amazing.', offset_hours: 72, sender: null, reactions: { '🎬': [0, 1, 2] } },
      { content: 'Post-production meeting Monday. Editor is already cutting the first assembly.', offset_hours: 96, sender: null },
    ],
    'carlton-fashion-paris': [
      { content: 'Schedule: Jacquemus Mon, Louis Vuitton Tue, Dior Wed, Chanel Thu.', offset_hours: -24, sender: null },
      { content: 'Backstage pass confirmed for the Louis Vuitton show. Content gold.', offset_hours: 0, sender: null },
      { content: 'incredible 📸', offset_hours: 0.5, sender: 0 },
      { content: 'Shot some incredible looks at the Palais de Tokyo installation.', offset_hours: 24, sender: null },
      { content: 'Dinner at Le Cinq tonight — Michelin 3-star. Dress to impress.', offset_hours: 36, sender: null },
      { content: 'Paris Fashion Week is exhausting but the content is chef\'s kiss. 📸', offset_hours: 72, sender: null },
      { content: 'The croissants alone make this trip worth it.', offset_hours: 96, sender: null },
      { content: 'facts', offset_hours: 96.5, sender: 1 },
    ],
    'carlton-sports-agent-miami': [
      { content: 'Client meeting at 10am at the Four Seasons. Bring the updated contract terms.', offset_hours: 0, sender: null },
      { content: 'printing now', offset_hours: 0.5, sender: 0 },
      { content: 'Dinner at Prime 112 tonight — client wants to celebrate the deal.', offset_hours: 8, sender: null },
      { content: 'Heat game tomorrow night. Kaseya Center, Section 108, Row 2.', offset_hours: 18, sender: null },
      { content: 'Deal is signed. Three-year extension. Huge win for the team. 🤝', offset_hours: 36, sender: null, reactions: { '🎉': [0, 1, 2] } },
      { content: 'Celebrating at LIV tonight. The client insisted.', offset_hours: 40, sender: null },
      { content: 'Back to LA tomorrow. What a productive Miami trip.', offset_hours: 60, sender: null },
    ],
    'carlton-music-fest-la': [
      { content: 'Stage plot approved. Main stage, secondary stage, and acoustic tent.', offset_hours: -48, sender: null },
      { content: 'Artist check-in starts at noon. Headliner arriving at 4pm.', offset_hours: 0, sender: null },
      { content: 'Sound issue on Stage B — sending the tech team now.', offset_hours: 8, sender: null },
      { content: 'on it', offset_hours: 8.1, sender: 0 },
      { content: 'Day 1 attendance: 15,000. Exceeded projections by 20%.', offset_hours: 14, sender: null, reactions: { '📈': [0, 1] } },
      { content: 'Headliner just killed it. The crowd was electric. Best set of the festival.', offset_hours: 26, sender: null },
      { content: 'Festival wrap. Zero incidents, great weather, incredible performances. We did it.', offset_hours: 48, sender: null },
      { content: 'incredible run. proud of this team', offset_hours: 48.5, sender: 0 },
    ],
    'carlton-founder-tahoe': [
      { content: 'Agenda: Day 1 = pitch sessions. Day 2 = fireside chats. Day 3 = outdoor activities.', offset_hours: -24, sender: null },
      { content: 'Met a VC from a16z at the welcome dinner. Very interested in the creator space.', offset_hours: 6, sender: null },
      { content: 'huge connection', offset_hours: 6.5, sender: 0 },
      { content: 'Morning kayaking on the lake before sessions start. This view is unreal.', offset_hours: 18, sender: null },
      { content: 'Great feedback on my pitch. Need to refine the go-to-market slide.', offset_hours: 30, sender: null },
      { content: 'Connected with 12 founders in similar spaces. The network here is incredible.', offset_hours: 54, sender: null },
      { content: 'Lake Tahoe retreat is the best founder event I\'ve attended. Already signed up for next year.', offset_hours: 72, sender: null },
    ],
    'carlton-creator-conf-nyc': [
      { content: 'Keynote is Tuesday at 10am. Slides are done. Rehearsal at 8am.', offset_hours: -12, sender: null },
      { content: 'Panel on "Building a Creator Business" at 2pm — I\'m alongside MrBeast\'s team.', offset_hours: 0, sender: null },
      { content: 'After-party at The Standard rooftop. Views of the High Line at sunset.', offset_hours: 12, sender: null },
      { content: 'Three brand deal meetings today. Netflix, Nike, and Apple.', offset_hours: 24, sender: null },
      { content: 'Keynote went perfectly. Standing ovation. Let\'s go! 🎤', offset_hours: 26, sender: null, reactions: { '👏': [0, 1, 2] } },
      { content: 'you crushed it', offset_hours: 26.5, sender: 0 },
      { content: 'NYC energy is unmatched. This conference gets better every year.', offset_hours: 48, sender: null },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #8: Miami F1 Grand Prix (Event) — VIP curation
    // ────────────────────────────────────────────────────────────────────────
    'carlton-event-miami-f1': [
      { content: 'VIP paddock wristbands distributed. Don\'t lose them — they\'re $5K each.', offset_hours: -24, sender: null },
      { content: 'noted 😳', offset_hours: -23, sender: 0 },
      { content: '@concierge plan us a strong F1 Saturday: brunch, paddock timing, dinner, nightlife', offset_hours: -20, sender: null },
      { content: 'that itinerary is PERFECT', offset_hours: -19, sender: 0, reactions: { '🔥': [1, 2] } },
      { content: 'this app is ridiculous (in the best way)', offset_hours: -18.5, sender: 1 },
      { content: 'Dev Patel saved a place: Zuma Miami', offset_hours: -18, sender: 3, message_type: 'system', system_event_type: 'calendar_item_added' },
      { content: 'Practice sessions today. Great chance to explore the fan zone.', offset_hours: 0, sender: null },
      { content: 'Qualifying was INSANE. Verstappen by 0.003 seconds.', offset_hours: 24, sender: null, reactions: { '🏎️': [0, 1, 2] } },
      { content: 'Race day! Meeting at Gate 5 at 10am. Bring sunscreen.', offset_hours: 48, sender: null },
      { content: '📣 All: Meet at Gate 5 by 10am sharp. Paddock passes required. Sunscreen recommended.', offset_hours: 47, sender: null, message_type: 'broadcast' },
      { content: 'Post-race concert by The Weeknd. This event is on another level.', offset_hours: 54, sender: null },
      { content: 'Best F1 weekend yet. Miami knows how to put on a show.', offset_hours: 72, sender: null },
      { content: 'honestly top 3 event of my life', offset_hours: 72.5, sender: 0 },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #9: Cannes — Context-aware recommendation → poll
    // ────────────────────────────────────────────────────────────────────────
    'carlton-event-cannes': [
      { content: 'Red carpet premiere tonight at 7pm. Black tie mandatory.', offset_hours: 0, sender: null },
      { content: 'Yacht party invitation from the producers — dock at Port Canto, 9pm.', offset_hours: 12, sender: null },
      { content: '@concierge best place for a client dinner near the Palais that won\'t feel too touristy?', offset_hours: 14, sender: null },
      { content: 'oh the second option looks perfect', offset_hours: 15, sender: 0 },
      { content: 'create the poll', offset_hours: 15.5, sender: null },
      { content: 'Carlton Gold created a poll: "Client dinner location?"', offset_hours: 16, sender: null, message_type: 'system', system_event_type: 'poll_created' },
      { content: 'voted for Mantel', offset_hours: 16.5, sender: 1 },
      { content: 'Screening of the new Nolan film. Speechless. Oscar contender for sure.', offset_hours: 24, sender: null, reactions: { '🎬': [0, 1, 2] } },
      { content: 'Lunch at La Colombe d\'Or. The art collection on the walls is priceless — literally.', offset_hours: 48, sender: null },
      { content: 'Networking dinner with distributors. Four deal discussions in one evening.', offset_hours: 72, sender: null },
      { content: 'Cannes is where art meets business. There\'s nothing else like it.', offset_hours: 120, sender: null },
      { content: 'already want to come back', offset_hours: 120.5, sender: 0 },
    ],

    // ────────────────────────────────────────────────────────────────────────
    // HIGHLIGHT #10: Super Bowl 2027 — Group coordination masterclass
    // ────────────────────────────────────────────────────────────────────────
    'carlton-event-super-bowl': [
      { content: '@concierge we need hotel, game-day transport, and one Saturday night group dinner locked', offset_hours: -120, sender: null },
      { content: 'this breakdown is incredible', offset_hours: -119, sender: 0 },
      { content: 'book it', offset_hours: -118.5, sender: 1 },
      { content: 'Carlton Gold created a poll: "Saturday dinner spot?"', offset_hours: -118, sender: null, message_type: 'system', system_event_type: 'poll_created' },
      { content: 'Carlton Gold created task: Book game-day transport', offset_hours: -117.5, sender: null, message_type: 'system', system_event_type: 'task_created' },
      { content: 'Carlton Gold created task: Confirm hotel block', offset_hours: -117.4, sender: null, message_type: 'system', system_event_type: 'task_created' },
      { content: 'Carlton Gold added calendar reminder: Super Bowl Kickoff', offset_hours: -117, sender: null, message_type: 'system', system_event_type: 'calendar_item_added' },
      { content: '📣 Final logistics: Tailgate starts at 10am. Grill is confirmed. Transport departs hotel at 9am.', offset_hours: -6, sender: null, message_type: 'broadcast' },
      { content: 'Tailgate setup starts at 10am. Bringing the grill and the good speakers.', offset_hours: -5, sender: null },
      { content: 'let\'s gooo 🏈', offset_hours: -4, sender: 0 },
      { content: 'Pre-game concert is going to be insane this year.', offset_hours: 0, sender: null },
      { content: 'Section 142, Row 8. We can see the 50-yard line perfectly.', offset_hours: 2, sender: null },
      { content: 'WHAT A GAME. Overtime! My voice is gone.', offset_hours: 6, sender: null, reactions: { '🏈': [0, 1, 2, 3] } },
      { content: 'i lost my voice completely 😂', offset_hours: 6.5, sender: 0 },
      { content: 'worth it', offset_hours: 6.6, sender: 1 },
      { content: 'After-party at The Roosevelt. Open bar until 2am.', offset_hours: 8, sender: null },
      { content: 'Super Bowl in NOLA is the perfect combination. Football + best food city.', offset_hours: 24, sender: null },
      { content: 'best weekend of the year. not even close', offset_hours: 24.5, sender: 2 },
    ],

    // Other Event trips
    'carlton-event-jfl-montreal': [
      { content: 'Gala taping tonight at Place des Arts. Seats in the 3rd row.', offset_hours: 0, sender: null },
      { content: 'Secret set at Comedyworks — only 80 seats. IYKYK.', offset_hours: 24, sender: null },
      { content: 'we have to go', offset_hours: 24.5, sender: 0 },
      { content: 'Old Montreal food tour today. Poutine, smoked meat, and maple everything.', offset_hours: 36, sender: null },
      { content: 'the smoked meat was life-changing', offset_hours: 36.5, sender: 1 },
      { content: 'The new comedians this year are INCREDIBLE. Watch for that Brooklyn kid.', offset_hours: 48, sender: null },
      { content: 'Comedy is the best live art form. These shows prove it every year.', offset_hours: 96, sender: null },
      { content: 'Already planning to come back. JFL Montreal is a can\'t-miss.', offset_hours: 108, sender: null },
    ],
    'carlton-event-art-basel': [
      { content: 'Preview day access confirmed. Getting in before the public.', offset_hours: -12, sender: null },
      { content: 'The Wynwood Walls installation this year is jaw-dropping.', offset_hours: 0, sender: null, reactions: { '🎨': [0, 1] } },
      { content: 'Collector dinner in the Design District tonight. Seated next to the curator from MoMA.', offset_hours: 18, sender: null },
      { content: 'what a flex', offset_hours: 18.5, sender: 0 },
      { content: 'Bought a piece from an emerging artist. Supporting new talent is the move.', offset_hours: 36, sender: null },
      { content: 'Art Basel is where you see what culture will look like in 5 years.', offset_hours: 72, sender: null },
      { content: 'Miami in December > Miami in August. Perfect weather for art walks.', offset_hours: 84, sender: null },
    ],
    'carlton-event-sundance': [
      { content: 'Premiere tickets for 3 films secured. First screening at 10am tomorrow.', offset_hours: -12, sender: null },
      { content: 'The documentary about AI art just won the audience award. Mind-blowing.', offset_hours: 24, sender: null, reactions: { '🎬': [0, 1] } },
      { content: 'Après-ski at Deer Valley with the cast of the opening night film. Surreal.', offset_hours: 36, sender: null },
      { content: 'pinch me', offset_hours: 36.5, sender: 0 },
      { content: 'Park City is magical in winter. The snow, the movies, the hot chocolate.', offset_hours: 48, sender: null },
      { content: 'Discovered 4 films I\'ll be watching for at the Oscars.', offset_hours: 96, sender: null },
      { content: 'Sundance reminds me why I love storytelling. See you next January.', offset_hours: 120, sender: null },
    ],
    'carlton-event-sxsw': [
      { content: 'Interactive badge confirmed. Keynote schedule is stacked this year.', offset_hours: -24, sender: null },
      { content: 'The AI + Music panel was the best session so far. Wild implications.', offset_hours: 24, sender: null },
      { content: 'Last year\'s SXSW was good but this year is on another level.', offset_hours: 48, sender: null },
      { content: 'agreed', offset_hours: 48.5, sender: 0 },
      { content: 'Secret show at Mohawk tonight — indie band from London. Trust me.', offset_hours: 72, sender: null },
      { content: 'Austin keeps growing but 6th Street still hits different during SXSW.', offset_hours: 120, sender: null },
      { content: 'Wrapped SXSW 2026. Already counting down to next year.', offset_hours: 192, sender: null },
    ],
    'carlton-event-monaco-gp': [
      { content: 'Yacht viewing confirmed. Deck access at Turn 1 — the best angle on the circuit.', offset_hours: -24, sender: null, reactions: { '🛥️': [0, 1, 2] } },
      { content: 'Casino Square at night is pure James Bond energy.', offset_hours: 0, sender: null },
      { content: 'felt like a movie', offset_hours: 0.5, sender: 0 },
      { content: 'Practice laps echoing through the streets. The sound is visceral.', offset_hours: 12, sender: null },
      { content: 'Dinner at Le Louis XV tonight. Alain Ducasse\'s 3-Michelin-star masterpiece.', offset_hours: 24, sender: null },
      { content: 'Race day. The most iconic circuit in motorsport. Champagne on the yacht.', offset_hours: 48, sender: null },
      { content: 'Monaco is not a place. It\'s a feeling. Until next year. 🇲🇨', offset_hours: 60, sender: null },
      { content: 'still processing this trip', offset_hours: 60.5, sender: 1 },
    ],
  };

  const msgs = map[trip.id];
  if (msgs) return msgs;

  // Fallback for any unmapped trip
  return [
    { content: `Excited about ${trip.name}! Planning is underway.`, offset_hours: -48, sender: null },
    { content: `${trip.destination} — here we come! ✈️`, offset_hours: -24, sender: null },
    { content: 'let\'s gooo', offset_hours: -23, sender: 0 },
    { content: 'Logistics are coming together nicely. All details in the calendar.', offset_hours: 0, sender: null },
    { content: 'Having an amazing time. This trip is one for the books.', offset_hours: 24, sender: null },
    { content: 'seriously incredible', offset_hours: 24.5, sender: 1 },
    { content: 'Can\'t believe it\'s almost over. Time flies when you\'re living your best life.', offset_hours: 48, sender: null },
    { content: 'Back home. Already miss it. Who\'s down for the next one?', offset_hours: 72, sender: null },
    { content: '🙋‍♂️', offset_hours: 72.1, sender: 0 },
    { content: '🙋‍♀️', offset_hours: 72.2, sender: 2 },
  ];
}

// ─── Events per Trip (unchanged) ────────────────────────────────────────────

function getEvents(trip: TripDef): { title: string; description: string; location: string; offset_hours: number; duration_hours: number; category: string }[] {
  const eventsMap: Record<string, ReturnType<typeof getEvents>> = {
    'carlton-iceland-2026': [
      { title: 'Northern Lights Jeep Tour', description: 'Guided aurora hunting expedition with professional photographer', location: 'Thingvellir National Park', offset_hours: 48, duration_hours: 4, category: 'activity' },
      { title: 'Golden Circle Day Trip', description: 'Gullfoss, Geysir, and Thingvellir', location: 'Golden Circle Route', offset_hours: 24, duration_hours: 10, category: 'excursion' },
      { title: 'Ice Cave Exploration', description: 'Guided tour of crystal ice caves in Vatnajökull', location: 'Vatnajökull Glacier', offset_hours: 72, duration_hours: 6, category: 'activity' },
    ],
    'carlton-ibiza-2026': [
      { title: 'Birthday Dinner at Cala Bonita', description: 'Private dinner for 10 on the beach', location: 'Cala Bonita, Santa Eulalia', offset_hours: 12, duration_hours: 3, category: 'dining' },
      { title: 'Café del Mar Sunset Session', description: 'Live DJ set at the iconic sunset spot', location: 'Café del Mar, San Antonio', offset_hours: -12, duration_hours: 4, category: 'nightlife' },
      { title: 'Private Boat Charter', description: 'Full day sailing around Ibiza and Formentera', location: 'San Antonio Marina', offset_hours: 24, duration_hours: 8, category: 'activity' },
    ],
    'carlton-tokyo-2025': [
      { title: 'Omakase at Ginza Sushi Counter', description: '12-course omakase at Michelin 2-star counter', location: 'Ginza, Tokyo', offset_hours: 24, duration_hours: 2, category: 'dining' },
      { title: 'TeamLab Borderless', description: 'Immersive digital art museum experience', location: 'Azabudai Hills, Tokyo', offset_hours: 72, duration_hours: 3, category: 'activity' },
      { title: 'Hakone Day Trip', description: 'Hot springs and Mt. Fuji views', location: 'Hakone, Kanagawa', offset_hours: 120, duration_hours: 12, category: 'excursion' },
    ],
    'carlton-chappelle-chicago': [
      { title: 'Load-In & Setup', description: 'Equipment unload and stage setup at Chicago Theatre', location: 'Chicago Theatre', offset_hours: -12, duration_hours: 6, category: 'production' },
      { title: 'Soundcheck', description: 'Full soundcheck with Dave and opening act', location: 'Chicago Theatre', offset_hours: 0, duration_hours: 2, category: 'production' },
      { title: 'Show Time', description: 'Dave Chappelle live — Chicago stop', location: 'Chicago Theatre', offset_hours: 6, duration_hours: 3, category: 'performance' },
    ],
    'carlton-event-cannes': [
      { title: 'Red Carpet Premiere', description: 'Opening night film premiere at Palais des Festivals', location: 'Palais des Festivals', offset_hours: 0, duration_hours: 4, category: 'premiere' },
      { title: 'Yacht Party', description: 'Hosted by independent film producers at Port Canto', location: 'Port Canto', offset_hours: 12, duration_hours: 5, category: 'networking' },
      { title: 'Director Q&A', description: 'Post-screening conversation with Christopher Nolan', location: 'Salle Debussy', offset_hours: 48, duration_hours: 2, category: 'screening' },
    ],
    'carlton-event-miami-f1': [
      { title: 'Practice Sessions', description: 'Free practice 1 & 2 with paddock access', location: 'Miami International Autodrome', offset_hours: 0, duration_hours: 6, category: 'race' },
      { title: 'Qualifying', description: 'Saturday qualifying session with VIP viewing', location: 'Miami International Autodrome', offset_hours: 24, duration_hours: 4, category: 'race' },
      { title: 'Race Day', description: 'Main race event with post-race concert', location: 'Miami International Autodrome', offset_hours: 48, duration_hours: 8, category: 'race' },
    ],
  };

  return eventsMap[trip.id] || [
    { title: 'Welcome Gathering', description: `Kick-off for ${trip.name}`, location: trip.basecamp_name, offset_hours: 2, duration_hours: 2, category: 'social' },
    { title: 'Group Dinner', description: 'Team dinner at a local favorite', location: trip.destination, offset_hours: 30, duration_hours: 3, category: 'dining' },
  ];
}

// ─── Tasks, Payments, Polls, Links (unchanged from original) ────────────────

function getTasks(trip: TripDef): { title: string; description: string; offset_hours: number }[] {
  if (trip.trip_type === 'pro') {
    return [
      { title: 'Confirm venue logistics', description: `Finalize load-in time, parking, and access for ${trip.destination}`, offset_hours: -168 },
      { title: 'Equipment checklist', description: 'Verify all production gear is packed and shipped', offset_hours: -120 },
      { title: 'Book team travel', description: 'Flights and ground transportation for the crew', offset_hours: -240 },
    ];
  }
  if (trip.trip_type === 'event') {
    return [
      { title: 'Distribute event credentials', description: 'VIP badges, wristbands, and access passes', offset_hours: -48 },
      { title: 'Confirm transportation', description: `Airport transfers and local transport in ${trip.destination}`, offset_hours: -120 },
    ];
  }
  return [
    { title: 'Book flights', description: `Flights to ${trip.destination} — check group chat for dates`, offset_hours: -336 },
    { title: 'Confirm restaurant reservations', description: 'Finalize dinner reservations for the group', offset_hours: -168 },
  ];
}

function getPayments(trip: TripDef): { description: string; amount: number; currency: string }[] {
  if (trip.trip_type === 'pro') {
    return [
      { description: `Venue deposit — ${trip.destination}`, amount: 2500, currency: 'USD' },
      { description: `Hotel block — ${trip.basecamp_name}`, amount: 4800, currency: 'USD' },
    ];
  }
  if (trip.trip_type === 'event') {
    return [
      { description: `VIP tickets — ${trip.name}`, amount: 1200, currency: 'USD' },
      { description: `Hotel reservation — ${trip.basecamp_name}`, amount: 1800, currency: 'USD' },
    ];
  }
  return [
    { description: 'Group dinner split', amount: 340, currency: 'USD' },
    { description: `Accommodation — ${trip.basecamp_name}`, amount: 1500, currency: 'USD' },
  ];
}

function getPoll(trip: TripDef): { question: string; options: string[] } | null {
  const polls: Record<string, { question: string; options: string[] }> = {
    'carlton-iceland-2026': { question: 'Which day for the Northern Lights tour?', options: ['January 10', 'January 11', 'January 12'] },
    'carlton-ibiza-2026': { question: 'Birthday dinner location?', options: ['Cala Bonita', 'Amante Ibiza', 'Es Torrent'] },
    'carlton-tokyo-2025': { question: 'Sushi vs ramen for the first night?', options: ['Omakase sushi', 'Ichiran Ramen', 'Both (sushi then ramen)'] },
    'carlton-miami-f1-consumer': { question: 'Post-race dinner spot?', options: ['Zuma', 'Komodo', 'Carbone'] },
    'carlton-amalfi-2026': { question: 'Day trip to Capri or Ravello?', options: ['Capri boat trip', 'Ravello gardens', 'Both — split days'] },
    'carlton-greek-islands-2026': { question: 'Extra night in Santorini or Mykonos?', options: ['Santorini (sunsets)', 'Mykonos (nightlife)', 'Keep the original plan'] },
    'carlton-toronto-2026': { question: 'CN Tower dinner or rooftop bar?', options: ['CN Tower 360 Restaurant', 'Rooftop at The Drake', 'Both!'] },
    'carlton-event-super-bowl': { question: 'Tailgate setup — what food?', options: ['BBQ ribs & brisket', 'Seafood boil', "Cajun crawfish (it's NOLA!)"] },
    'carlton-event-art-basel': { question: 'Which gallery day?', options: ['Thursday (preview)', 'Friday (opening)', 'Saturday (public)'] },
    'carlton-event-cannes': { question: 'Client dinner — which restaurant?', options: ['Mantel (Michelin)', 'Le Park 45 (terrace)', 'La Pizza Cresci (casual)'] },
  };
  return polls[trip.id] || null;
}

function getLinks(trip: TripDef): { url: string; title: string; description: string; category: string }[] {
  const linksMap: Record<string, ReturnType<typeof getLinks>> = {
    'carlton-iceland-2026': [
      { url: 'https://hotelranga.is', title: 'Hotel Rangá', description: 'Our base for the Northern Lights trip', category: 'accommodation' },
      { url: 'https://guidetoiceland.is/book-holiday-trips/golden-circle', title: 'Golden Circle Tour', description: 'Full day guided tour', category: 'activity' },
    ],
    'carlton-tokyo-2025': [
      { url: 'https://www.hyatt.com/park-hyatt/tyoph-park-hyatt-tokyo', title: 'Park Hyatt Tokyo', description: 'Lost in Translation hotel — our base', category: 'accommodation' },
      { url: 'https://www.teamlab.art/e/borderless-azabudai/', title: 'TeamLab Borderless', description: 'Immersive digital art — book tickets in advance', category: 'activity' },
    ],
    'carlton-ibiza-2026': [
      { url: 'https://www.cafedelmarmusic.com', title: 'Café del Mar', description: 'The legendary sunset spot', category: 'nightlife' },
      { url: 'https://www.pacha.com/ibiza', title: 'Pacha Ibiza', description: 'Birthday night — table reserved', category: 'nightlife' },
    ],
    'carlton-event-cannes': [
      { url: 'https://www.festival-cannes.com', title: 'Cannes Film Festival Official', description: 'Schedule and screening info', category: 'event' },
      { url: 'https://www.hotel-martinez.com', title: 'Hôtel Martinez', description: 'Our base on La Croisette', category: 'accommodation' },
    ],
    'carlton-event-monaco-gp': [
      { url: 'https://www.formula1.com/en/racing/2026/Monaco', title: 'Monaco GP Official', description: 'Race schedule and circuit info', category: 'event' },
      { url: 'https://www.hoteldeparismontecarlo.com', title: 'Hôtel de Paris', description: 'Casino Square luxury', category: 'accommodation' },
    ],
  };

  return linksMap[trip.id] || [
    { url: `https://maps.google.com/?q=${encodeURIComponent(trip.destination)}`, title: `${trip.destination} Map`, description: `Google Maps — ${trip.destination}`, category: 'navigation' },
    { url: `https://www.google.com/search?q=${encodeURIComponent(trip.basecamp_name)}`, title: trip.basecamp_name, description: 'Our accommodation', category: 'accommodation' },
  ];
}

// ─── AI Concierge with Rich Cards ────────────────────────────────────────────

interface AiQuery {
  query: string;
  response: string;
  rich_cards?: Record<string, unknown>[];
}

function getAiQueries(trip: TripDef): AiQuery[] {
  const queriesMap: Record<string, AiQuery[]> = {
    // HIGHLIGHT #1: Tokyo — AI builds night plan
    'carlton-tokyo-2025': [
      {
        query: 'Can you build us a great first night food plan near Shibuya?',
        response: "Here's your perfect first-night food crawl starting from Shibuya:\n\n**Stop 1 (6:30pm):** Uobei Shibuya — fun conveyor belt sushi to kick things off. Great energy, tablet ordering.\n\n**Stop 2 (8pm):** Walk 8 min to Nonbei Yokocho (Drunkard's Alley) — tiny standing-only izakayas, yakitori and cold beer. This is the real Tokyo.\n\n**Stop 3 (9:30pm):** Ichiran Shibuya for late-night tonkotsu ramen in individual booths. Open 24 hours so no rush.\n\nAll three are within a 15-minute walking radius. The route flows naturally downhill from Shibuya Station.",
        rich_cards: [
          { type: 'restaurant', title: 'Uobei Shibuya', rating: 4.3, cuisine: 'Conveyor Belt Sushi', price_range: '$$', maps_url: 'https://maps.google.com/?q=Uobei+Shibuya', description: 'Fun tablet-ordering sushi with great energy' },
          { type: 'restaurant', title: 'Nonbei Yokocho', rating: 4.6, cuisine: 'Izakaya / Yakitori', price_range: '$', maps_url: 'https://maps.google.com/?q=Nonbei+Yokocho+Shibuya', description: 'Tiny standing bars in Drunkard\'s Alley' },
          { type: 'restaurant', title: 'Ichiran Shibuya', rating: 4.5, cuisine: 'Tonkotsu Ramen', price_range: '$$', maps_url: 'https://maps.google.com/?q=Ichiran+Shibuya', description: 'Solo booth ramen experience, open 24hrs' },
        ],
      },
      {
        query: 'Late night ramen spots in Tokyo?',
        response: "Tokyo's best late-night ramen: 1) Ichiran Shibuya — open 24 hours, individual booth experience, perfect tonkotsu. 2) Fuunji near Shinjuku Station — tsukemen (dipping ramen), closes at midnight. 3) Afuri in Ebisu — yuzu shio ramen, open until 4am on weekends. Based on your Park Hyatt location in Shinjuku, Fuunji is the closest at a 5-minute walk.",
      },
    ],
    // HIGHLIGHT #2: Ibiza — Decision flow
    'carlton-ibiza-2026': [
      {
        query: 'Can you help decide Friday dinner, sunset drinks, and Saturday boat options?',
        response: "Let's lock this down:\n\n**Friday Dinner (3 options):**\n1. Cala Bonita — beachfront, relaxed, great seafood (your reservation is for 10)\n2. La Paloma — garden dining, Mediterranean, more intimate\n3. Sa Capella — converted chapel, dramatic setting, upscale\n\n**Sunset Drinks:** Café del Mar is already on your list and it's the move. Arrive by 6pm for the best seats.\n\n**Saturday Boat:** Your charter from San Antonio Marina departs 11am. Route: Cala Comte → Es Vedrà → optional Formentera. BBQ and snorkeling gear included.\n\nWant me to create a poll for Friday dinner? I can also create tasks for the boat booking deposit and guest count.",
        rich_cards: [
          { type: 'restaurant', title: 'Cala Bonita', rating: 4.7, cuisine: 'Mediterranean Seafood', price_range: '$$$', maps_url: 'https://maps.google.com/?q=Cala+Bonita+Ibiza' },
          { type: 'restaurant', title: 'La Paloma Ibiza', rating: 4.8, cuisine: 'Mediterranean', price_range: '$$$$', maps_url: 'https://maps.google.com/?q=La+Paloma+Ibiza' },
          { type: 'restaurant', title: 'Sa Capella', rating: 4.5, cuisine: 'Fine Dining', price_range: '$$$$', maps_url: 'https://maps.google.com/?q=Sa+Capella+Ibiza' },
          { type: 'poll_creation', title: 'Dinner Friday night?', options: ['Cala Bonita', 'La Paloma', 'Sa Capella'] },
          { type: 'task_creation', title: 'Book boat charter deposit', description: 'Confirm Saturday charter and pay deposit' },
        ],
      },
      {
        query: 'Best beach clubs in Ibiza for a birthday celebration?',
        response: "For your March birthday weekend: 1) Nikki Beach — upscale, great DJ lineup, can do bottle service for groups. 2) Beachouse — more relaxed vibe, right on Playa d'en Bossa. 3) Blue Marlin — the classic, but pricier. Since you're staying in Can Furnet (east side), Nikki Beach and Cala Bonita are both within 15 minutes.",
      },
    ],
    // HIGHLIGHT #3: Amalfi — Reservation card
    'carlton-amalfi-2026': [
      {
        query: 'Find us a special dinner for Saturday with a view',
        response: "For a Saturday dinner with a view in Positano, my top pick:\n\n**Zass at Il San Pietro** — Michelin-starred, cliff-side terrace 300m above the sea. The tasting menu is extraordinary, and the sunset from this terrace is arguably the best dining view on the entire Amalfi Coast.\n\nAlternatives: La Sponda at your hotel (Le Sirenuse) has 400 candles lit nightly — stunning but you can do that any evening. Ristorante Max has a panoramic terrace if you want something less formal.\n\nWant me to add Zass to the trip calendar for Saturday at 8pm?",
        rich_cards: [
          { type: 'reservation', title: 'Zass at Il San Pietro', rating: 4.9, cuisine: 'Michelin-starred Italian', price_range: '$$$$', date: 'Saturday 8:00 PM', party_size: 6, maps_url: 'https://maps.google.com/?q=Il+San+Pietro+Positano', website: 'https://www.ilsanpietro.it' },
          { type: 'restaurant', title: 'La Sponda (Le Sirenuse)', rating: 4.8, cuisine: 'Italian Fine Dining', price_range: '$$$$', description: '400 candles lit nightly at your hotel' },
        ],
      },
      {
        query: 'How to get from Positano to Capri?',
        response: "Positano to Capri options: 1) Public ferry — 3x daily in June, 50 min, ~€20. 2) Private boat charter — your rental is booked for Day 4, and Capri's Blue Grotto is on the route. Arrive before 11am to avoid the rush. On Capri, take the funicular to Anacapri for the best views.",
      },
    ],
    // HIGHLIGHT #4: Toronto — Add to calendar
    'carlton-toronto-2026': [
      {
        query: 'What are the best live music spots near downtown Friday night?',
        response: "Toronto's best live music Friday night:\n\n**Top Pick: The Horseshoe Tavern** — legendary venue on Queen West, hosting a great indie rock lineup this Friday. Walking distance from The Drake Hotel.\n\nAlternatives: Lee's Palace (The Annex) for heavier stuff, or Jazz Bistro for a more refined evening.\n\nI'd go Horseshoe — it's 4 blocks from your hotel and the vibe is perfect for a group. Want me to create a calendar hold for Friday 9pm?",
        rich_cards: [
          { type: 'place', title: 'The Horseshoe Tavern', rating: 4.5, category: 'Live Music Venue', maps_url: 'https://maps.google.com/?q=The+Horseshoe+Tavern+Toronto', description: 'Legendary Queen West venue, 4 blocks from hotel' },
          { type: 'place', title: "Lee's Palace", rating: 4.3, category: 'Live Music Venue', maps_url: 'https://maps.google.com/?q=Lees+Palace+Toronto' },
        ],
      },
    ],
    // HIGHLIGHT #5: Chappelle Chicago — Pro logistics
    'carlton-chappelle-chicago': [
      {
        query: 'Summarize tomorrow\'s Chicago logistics and turn anything urgent into tasks',
        response: "**Tomorrow's Chicago Logistics:**\n\n📍 **Venue:** Chicago Theatre, 175 N State St\n🏨 **Hotel:** Chicago Athletic Association (5 min walk)\n\n**Timeline:**\n- 10:00 AM — Load-in at loading dock (crew)\n- 12:00 PM — Stage setup complete\n- 4:00 PM — Soundcheck (moved from 3pm per Dave's request)\n- 5:30 PM — Doors open\n- 6:30 PM — Opening act\n- 8:00 PM — Dave Chappelle\n- 11:00 PM — Post-show at Gibson's Steakhouse\n\n**Urgent items I can create as tasks:**\n1. ✅ Confirm ground transport (hotel → venue)\n2. ✅ Merch inventory check before doors\n3. ✅ Green room guest list finalization\n\n**Draft broadcast:** \"Lobby call is 3:30pm. Wheels up 4:00pm.\"",
        rich_cards: [
          { type: 'task_creation', title: 'Confirm ground transport', description: 'Hotel → Chicago Theatre, need 2 vans' },
          { type: 'task_creation', title: 'Merch inventory check', description: 'Count all merch before doors at 5:30pm' },
          { type: 'task_creation', title: 'Green room guest list', description: 'Finalize and print by 4pm' },
        ],
      },
      {
        query: 'Best late night food near the Chicago Theatre?',
        response: "Near the Chicago Theatre: 1) Portillo's (5 min walk) — Chicago-style hot dogs and Italian beef, open until midnight. 2) Au Cheval (10 min) — best burger in Chicago, open until 1am weekends. Your reservation at Gibson's is at 11pm.",
      },
    ],
    // HIGHLIGHT #6: NBA Media — Flight card
    'carlton-nba-media-vegas': [
      {
        query: 'Best flight options for arriving before media availability Thursday?',
        response: "Media availability starts at 2pm Thursday at Thomas & Mack Center. You need to land by noon.\n\n**Best options:**\n\n1. **Delta DL1247** — LAX→LAS, departs 9:15am, arrives 10:20am. Nonstop, $289. ✅ Best fit — 3.5hrs buffer.\n2. **United UA5521** — SFO→LAS, departs 7:30am, arrives 9:15am. Nonstop, $342.\n3. **Southwest WN2891** — LAX→LAS, departs 10:30am, arrives 11:35am. $198 but tight.\n\nI'd book option 1 — lowest friction and gets you in with time to check into The Venetian before media day.",
        rich_cards: [
          { type: 'flight', title: 'Delta DL1247', airline: 'Delta', departure: '9:15 AM', arrival: '10:20 AM', route: 'LAX → LAS', price: '$289', stops: 'Nonstop', recommended: true },
          { type: 'flight', title: 'United UA5521', airline: 'United', departure: '7:30 AM', arrival: '9:15 AM', route: 'SFO → LAS', price: '$342', stops: 'Nonstop' },
          { type: 'flight', title: 'Southwest WN2891', airline: 'Southwest', departure: '10:30 AM', arrival: '11:35 AM', route: 'LAX → LAS', price: '$198', stops: 'Nonstop' },
        ],
      },
      {
        query: 'Production equipment rental in Chicago?',
        response: 'For backup production equipment: 1) Chicago Grip & Electric (West Loop) — full lighting and rigging. 2) Helix Camera (River North) — camera and audio. Your main equipment arrives Thursday morning per the logistics schedule.',
      },
    ],
    // HIGHLIGHT #7: DJ Tour Berlin — Chaos containment
    'carlton-dj-tour-berlin': [
      {
        query: 'Can you organize the important logistics from this thread?',
        response: "I've parsed the recent thread. Here's what needs action:\n\n**Resolved:**\n- 🏨 Hotel check-in: 3pm at Hotel Zoo Berlin\n- 🍽️ Dinner: still unresolved — need a reservation\n\n**Needs Action:**\n1. **Load-in time** — venue hasn't confirmed. I'll create a task to follow up.\n2. **Dinner reservation** — want me to find options near Kurfürstendamm?\n3. **Studio session at Funkhaus** — confirmed 2-6pm, no issues.\n\n**Unresolved question:** Nobody confirmed who's handling the after-party guest list.\n\nWant me to create a poll for dinner options?",
        rich_cards: [
          { type: 'task_creation', title: 'Confirm load-in time with venue', description: 'Follow up with Tresor production manager' },
          { type: 'task_creation', title: 'Book dinner reservation', description: 'Group dinner near Kurfürstendamm, 8 people' },
        ],
      },
    ],
    // HIGHLIGHT #8: Miami F1 Event — VIP curation
    'carlton-event-miami-f1': [
      {
        query: 'Plan us a strong F1 Saturday: brunch, paddock timing, dinner, nightlife',
        response: "**Your F1 Saturday Blueprint:**\n\n🍳 **11am — Brunch** at Cecconi's Miami Beach. Great outdoor terrace, 20 min from the track. Reserve for the group.\n\n🏎️ **2pm — Paddock Access** at Miami International Autodrome. Qualifying starts at 4pm. Get there early for pit lane walks.\n\n🍽️ **8:30pm — Dinner** at Zuma Miami (Brickell). Your group reservation is confirmed. Japanese izakaya, incredible cocktails.\n\n🎉 **11pm — LIV at Fontainebleau**. Race weekend is the biggest night of the year there. Table confirmed.\n\nTransport note: Use the F1 shuttle from the track to Brickell — faster than rideshare on race weekend.",
        rich_cards: [
          { type: 'restaurant', title: "Cecconi's Miami Beach", rating: 4.4, cuisine: 'Italian Brunch', price_range: '$$$', maps_url: 'https://maps.google.com/?q=Cecconis+Miami+Beach' },
          { type: 'place', title: 'Miami International Autodrome', category: 'Race Circuit', description: 'Paddock access from 2pm, qualifying at 4pm' },
          { type: 'restaurant', title: 'Zuma Miami', rating: 4.6, cuisine: 'Japanese Izakaya', price_range: '$$$$', maps_url: 'https://maps.google.com/?q=Zuma+Miami' },
          { type: 'place', title: 'LIV Nightclub', category: 'Nightlife', description: 'Table confirmed, biggest night of race weekend' },
        ],
      },
    ],
    // HIGHLIGHT #9: Cannes — Context-aware
    'carlton-event-cannes': [
      {
        query: 'Best place for a client dinner near the Palais that won\'t feel too touristy?',
        response: "For a refined client dinner near the Palais:\n\n**My Pick: Mantel** — 5 min walk from the Palais. Michelin-starred, seasonal Provençal cuisine. Intimate enough for business, impressive enough for clients. Book the garden terrace.\n\n**Runner-up: Le Park 45** at the Grand Hotel — 3 min walk, beautiful terrace, more classic French. Better if the client prefers traditional.\n\n**Avoid:** La Pizza Cresci (too casual) and anything directly on La Croisette (tourist trap pricing).\n\nWant me to create a shortlist poll for the team?",
        rich_cards: [
          { type: 'restaurant', title: 'Mantel', rating: 4.7, cuisine: 'Michelin Provençal', price_range: '$$$$', maps_url: 'https://maps.google.com/?q=Restaurant+Mantel+Cannes', description: 'Garden terrace, 5 min from Palais' },
          { type: 'restaurant', title: 'Le Park 45', rating: 4.5, cuisine: 'Classic French', price_range: '$$$$', maps_url: 'https://maps.google.com/?q=Le+Park+45+Cannes', description: 'Grand Hotel terrace dining' },
          { type: 'poll_creation', title: 'Client dinner location?', options: ['Mantel (Michelin)', 'Le Park 45 (terrace)', 'La Pizza Cresci (casual)'] },
        ],
      },
      {
        query: 'Transportation from Nice airport to Cannes?',
        response: "Nice to Cannes: 1) Helicopter — 7 min, ~€160pp. 2) Private car — 40-50 min, ~€80-120. 3) Express Bus 210 — 45 min, €22. 4) Train — 30 min, €8 but requires taxi to station. I'd recommend a private car via the hotel concierge.",
      },
    ],
    // HIGHLIGHT #10: Super Bowl — Group coordination
    'carlton-event-super-bowl': [
      {
        query: 'We need hotel, game-day transport, and one Saturday night group dinner locked',
        response: "Let me break this down:\n\n**🏨 Hotel:**\nYour group is at The Roosevelt New Orleans — great location on Canal Street. Walking distance to the French Quarter and Bourbon Street.\n\n**🚐 Game-Day Transport:**\nCaesars Superdome is 10 min from The Roosevelt. Options:\n- Private shuttle (recommended for groups) — ~$50/person round trip\n- Rideshare surge will be 4-5x on game day\nI'll create a task to book the shuttle.\n\n**🍽️ Saturday Dinner (3 options):**\n1. Commander's Palace — classic NOLA fine dining, garden district\n2. Cochon — modern Cajun, Warehouse District, 15 min walk\n3. GW Fins — best seafood in the city, French Quarter\n\nWant me to create a poll for dinner and tasks for transport + hotel confirmation?",
        rich_cards: [
          { type: 'hotel', title: 'The Roosevelt New Orleans', rating: 4.7, price_range: '$$$$', description: 'Canal Street, walking distance to French Quarter' },
          { type: 'restaurant', title: "Commander's Palace", rating: 4.8, cuisine: 'Classic Creole', price_range: '$$$$', maps_url: 'https://maps.google.com/?q=Commanders+Palace+NOLA' },
          { type: 'restaurant', title: 'Cochon', rating: 4.6, cuisine: 'Modern Cajun', price_range: '$$$', maps_url: 'https://maps.google.com/?q=Cochon+New+Orleans' },
          { type: 'restaurant', title: 'GW Fins', rating: 4.7, cuisine: 'Seafood', price_range: '$$$$', maps_url: 'https://maps.google.com/?q=GW+Fins+New+Orleans' },
          { type: 'poll_creation', title: 'Saturday dinner spot?', options: ["Commander's Palace", 'Cochon', 'GW Fins'] },
          { type: 'task_creation', title: 'Book game-day shuttle', description: 'Private shuttle Roosevelt → Superdome, round trip for group' },
          { type: 'task_creation', title: 'Confirm hotel block', description: 'Verify all rooms at The Roosevelt are confirmed' },
        ],
      },
    ],
    // Non-highlight trips with standard queries
    'carlton-iceland-2026': [
      { query: 'Best time to see the Northern Lights near Reykjavik?', response: "The best viewing conditions are typically between 10pm-2am, away from city light pollution. Based on your trip dates (Jan 8-14), you're in prime aurora season. I'd recommend the area around Thingvellir National Park or driving 30 minutes north of Reykjavik for the clearest skies." },
      { query: 'What should I wear for the ice cave tour?', response: 'For the Vatnajökull ice cave tour, layer up: thermal base layer, fleece mid-layer, waterproof outer shell. Waterproof hiking boots with good ankle support are essential. The cave stays around -5°C to 0°C.' },
    ],
    'carlton-miami-f1-consumer': [
      { query: 'Best restaurants near Hard Rock Stadium for F1 weekend?', response: 'Near the circuit: 1) Bourbon Steak at Turnberry (15 min) — premium steakhouse. 2) Komodo in Brickell (25 min) — Asian fusion. 3) Zuma downtown (20 min) — your Saturday dinner is booked here.' },
      { query: 'VIP nightlife during Miami F1 weekend?', response: 'F1 weekend nightlife: 1) LIV at Fontainebleau — THE spot. Your Sunday table is confirmed. 2) E11EVEN — 24-hour ultra club. 3) Basement at The Edition — bowling, skating, and a club.' },
    ],
    'carlton-nola-jazz-2025': [
      { query: 'Best live jazz clubs on Frenchmen Street?', response: 'Frenchmen Street picks: 1) The Spotted Cat — no cover, incredible local bands. Go early (8pm). 2) d.b.a. — curated bookings, great cocktails. 3) The Maison — three floors of different music, open until 4am.' },
      { query: 'Cajun food recommendations beyond the French Quarter?', response: "Beyond tourist spots: 1) Parkway Bakery (Mid-City) — legendary po'boys. 2) Dooky Chase (Tremé) — Leah Chase's legendary Creole. 3) Cochon Butcher (Warehouse District) — modern Cajun." },
    ],
    'carlton-event-monaco-gp': [
      { query: 'Where to watch the Monaco GP from a yacht?', response: 'Your yacht viewing is confirmed at Turn 1 — Sainte Dévote, one of the most dramatic corners. Boarding starts at 10am race day. Champagne and catering included.' },
      { query: 'Best casino experience in Monte Carlo?', response: 'Casino Monte-Carlo: 1) Main gaming rooms open at 2pm — bring your passport. 2) Salons Privés for higher stakes. Your hotel (Hôtel de Paris) is directly across Casino Square.' },
    ],
  };

  return queriesMap[trip.id] || [
    { query: `Best restaurants near ${trip.basecamp_name}?`, response: `I found several highly-rated restaurants within walking distance of ${trip.basecamp_name} in ${trip.destination}. Based on your group's dining preferences, I'd recommend checking the links tab for options shared by the group.` },
    { query: `Transportation tips for ${trip.destination}?`, response: `For getting around ${trip.destination}, ride-sharing apps work well for small groups, while private car services are more cost-effective for 4+ people. Check the Places tab for saved locations and travel times.` },
  ];
}

// ─── Main Handler ────────────────────────────────────────────────────────────

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );

    const results: Record<string, number> = {};

    // ── Phase 1: Update Demo User Profile ────────────────────────────────
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        display_name: 'Carlton Gold',
        first_name: 'Carlton',
        last_name: 'Gold',
        bio: 'Creator, touring professional, and frequent traveler. I use Chravel for everything — personal trips, professional tours, events, and AI travel planning. Life is too short for bad logistics.',
      })
      .eq('user_id', DEMO_USER_ID);

    if (profileError) throw new Error(`Profile update failed: ${profileError.message}`);
    results.profile = 1;

    // ── Phase 2: Clean up previous seeds ─────────────────────────────────
    const tripIds = ALL_TRIPS.map(t => t.id);

    for (const table of [
      'trip_chat_messages',
      'trip_events',
      'trip_tasks',
      'trip_payment_messages',
      'trip_polls',
      'trip_links',
      'ai_queries',
      'broadcasts',
    ]) {
      await supabaseAdmin.from(table).delete().in('trip_id', tripIds);
    }
    await supabaseAdmin.from('trip_members').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trip_privacy_configs').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trip_admins').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trips').delete().in('id', tripIds);

    // Clean mock user profiles
    await supabaseAdmin.from('profiles').delete().in('user_id', MOCK_USER_IDS);

    // ── Phase 2.5: Insert Mock User Profiles ─────────────────────────────
    const mockProfileRows = MOCK_USERS.map(u => ({
      user_id: u.id,
      display_name: u.display_name,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      avatar_url: u.avatar_url,
    }));
    const { error: mockProfileError } = await supabaseAdmin.from('profiles').insert(mockProfileRows);
    if (mockProfileError) throw new Error(`Mock profiles insert failed: ${mockProfileError.message}`);
    results.mock_profiles = mockProfileRows.length;

    // ── Phase 3: Create Trips ────────────────────────────────────────────
    const tripRows = ALL_TRIPS.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      destination: t.destination,
      trip_type: t.trip_type,
      start_date: t.start_date,
      end_date: t.end_date,
      basecamp_name: t.basecamp_name,
      basecamp_address: t.basecamp_address,
      created_by: DEMO_USER_ID,
      categories: t.categories || [],
      chat_mode: t.chat_mode || 'broadcasts',
    }));

    const { error: tripsError } = await supabaseAdmin.from('trips').insert(tripRows);
    if (tripsError) throw new Error(`Trips insert failed: ${tripsError.message}`);
    results.trips = tripRows.length;

    // ── Phase 4: Trip Members (Carlton auto-added by trigger) ────────────
    // Phase 4.5: Add mock users as trip members
    const memberRows: Record<string, unknown>[] = [];
    for (let i = 0; i < ALL_TRIPS.length; i++) {
      const trip = ALL_TRIPS[i];
      const members = getTripMembers(i);
      for (const member of members) {
        memberRows.push({
          trip_id: trip.id,
          user_id: member.id,
          role: 'member',
        });
      }
    }

    // Insert in batches
    for (let i = 0; i < memberRows.length; i += 50) {
      const batch = memberRows.slice(i, i + 50);
      const { error } = await supabaseAdmin.from('trip_members').insert(batch);
      if (error) throw new Error(`Members batch ${i} failed: ${error.message}`);
    }
    results.members = memberRows.length + ALL_TRIPS.length; // + Carlton from trigger

    // ── Phase 5: Chat Messages (Multiplayer) ─────────────────────────────
    const messageRows: Record<string, unknown>[] = [];
    const broadcastRows: Record<string, unknown>[] = [];

    for (let tripIdx = 0; tripIdx < ALL_TRIPS.length; tripIdx++) {
      const trip = ALL_TRIPS[tripIdx];
      const members = getTripMembers(tripIdx);
      const msgs = getChatMessages(trip, members);
      const baseTime = new Date(trip.start_date).getTime();

      for (const msg of msgs) {
        const timestamp = new Date(baseTime + msg.offset_hours * 3600000).toISOString();

        // Extract broadcasts to the broadcasts table
        if (msg.message_type === 'broadcast') {
          broadcastRows.push({
            trip_id: trip.id,
            message: msg.content,
            priority: msg.content.includes('URGENT') ? 'urgent' : 'normal',
            created_by: msg.sender !== null ? members[msg.sender % members.length].id : DEMO_USER_ID,
            is_sent: true,
            created_at: timestamp,
            updated_at: timestamp,
          });
          // Also add as a chat message for timeline visibility
        }

        // Resolve sender
        const senderId = msg.sender !== null ? members[msg.sender % members.length].id : DEMO_USER_ID;
        const senderName = msg.sender !== null ? members[msg.sender % members.length].display_name : 'Carlton Gold';

        const row: Record<string, unknown> = {
          trip_id: trip.id,
          content: msg.content,
          author_name: senderName,
          user_id: senderId,
          created_at: timestamp,
          updated_at: timestamp,
        };

        if (msg.message_type === 'system') {
          row.message_type = 'system';
          row.system_event_type = msg.system_event_type || 'trip_updated';
        } else if (msg.message_type === 'broadcast') {
          row.message_type = 'broadcast';
        }

        if (msg.reactions) {
          const reactionPayload: Record<string, string[]> = {};
          for (const [emoji, senderIndices] of Object.entries(msg.reactions)) {
            reactionPayload[emoji] = senderIndices.map(si => members[si % members.length].id);
          }
          row.payload = JSON.stringify({ reactions: reactionPayload });
        }

        messageRows.push(row);
      }
    }

    // Insert messages in batches
    for (let i = 0; i < messageRows.length; i += 50) {
      const batch = messageRows.slice(i, i + 50);
      const { error } = await supabaseAdmin.from('trip_chat_messages').insert(batch);
      if (error) throw new Error(`Messages batch ${i} failed: ${error.message}`);
    }
    results.messages = messageRows.length;
    results.system_messages = messageRows.filter(m => m.message_type === 'system').length;

    // ── Phase 5.5: Broadcasts ────────────────────────────────────────────
    if (broadcastRows.length > 0) {
      const { error: broadcastError } = await supabaseAdmin.from('broadcasts').insert(broadcastRows);
      if (broadcastError) throw new Error(`Broadcasts insert failed: ${broadcastError.message}`);
    }
    results.broadcasts = broadcastRows.length;

    // ── Phase 6: Events ──────────────────────────────────────────────────
    const eventRows: Record<string, unknown>[] = [];
    for (const trip of ALL_TRIPS) {
      const events = getEvents(trip);
      const baseTime = new Date(trip.start_date).getTime();
      for (const evt of events) {
        const startTime = new Date(baseTime + evt.offset_hours * 3600000);
        eventRows.push({
          trip_id: trip.id,
          title: evt.title,
          description: evt.description,
          location: evt.location,
          start_time: startTime.toISOString(),
          end_time: new Date(startTime.getTime() + evt.duration_hours * 3600000).toISOString(),
          event_category: evt.category,
          created_by: DEMO_USER_ID,
          source_type: 'manual',
        });
      }
    }

    const { error: eventsError } = await supabaseAdmin.from('trip_events').insert(eventRows);
    if (eventsError) throw new Error(`Events insert failed: ${eventsError.message}`);
    results.events = eventRows.length;

    // ── Phase 7: Tasks ───────────────────────────────────────────────────
    const taskRows: Record<string, unknown>[] = [];
    for (const trip of ALL_TRIPS) {
      const tasks = getTasks(trip);
      const baseTime = new Date(trip.start_date).getTime();
      for (const task of tasks) {
        taskRows.push({
          trip_id: trip.id,
          creator_id: DEMO_USER_ID,
          title: task.title,
          description: task.description,
          is_poll: false,
          due_at: new Date(baseTime + task.offset_hours * 3600000).toISOString(),
        });
      }
    }

    const { error: tasksError } = await supabaseAdmin.from('trip_tasks').insert(taskRows);
    if (tasksError) throw new Error(`Tasks insert failed: ${tasksError.message}`);
    results.tasks = taskRows.length;

    // ── Phase 8: Payments ────────────────────────────────────────────────
    const paymentRows: Record<string, unknown>[] = [];
    for (let tripIdx = 0; tripIdx < ALL_TRIPS.length; tripIdx++) {
      const trip = ALL_TRIPS[tripIdx];
      const payments = getPayments(trip);
      const members = getTripMembers(tripIdx);
      const participantIds = [DEMO_USER_ID, ...members.slice(0, 3).map(m => m.id)];
      for (const pmt of payments) {
        paymentRows.push({
          trip_id: trip.id,
          amount: pmt.amount,
          currency: pmt.currency,
          description: pmt.description,
          split_count: participantIds.length,
          split_participants: JSON.stringify(participantIds),
          payment_methods: JSON.stringify(['venmo', 'zelle']),
          created_by: DEMO_USER_ID,
        });
      }
    }

    const { error: paymentsError } = await supabaseAdmin.from('trip_payment_messages').insert(paymentRows);
    if (paymentsError) throw new Error(`Payments insert failed: ${paymentsError.message}`);
    results.payments = paymentRows.length;

    // ── Phase 9: Polls ───────────────────────────────────────────────────
    const pollRows: Record<string, unknown>[] = [];
    for (const trip of ALL_TRIPS) {
      const poll = getPoll(trip);
      if (poll) {
        pollRows.push({
          trip_id: trip.id,
          question: poll.question,
          options: JSON.stringify(poll.options.map(opt => ({ text: opt, votes: 0 }))),
          total_votes: 0,
          status: 'active',
          created_by: DEMO_USER_ID,
        });
      }
    }

    const { error: pollsError } = await supabaseAdmin.from('trip_polls').insert(pollRows);
    if (pollsError) throw new Error(`Polls insert failed: ${pollsError.message}`);
    results.polls = pollRows.length;

    // ── Phase 10: Links ──────────────────────────────────────────────────
    const linkRows: Record<string, unknown>[] = [];
    for (const trip of ALL_TRIPS) {
      const links = getLinks(trip);
      for (const link of links) {
        linkRows.push({
          trip_id: trip.id,
          url: link.url,
          title: link.title,
          description: link.description,
          category: link.category,
          votes: 0,
          added_by: DEMO_USER_ID,
        });
      }
    }

    const { error: linksError } = await supabaseAdmin.from('trip_links').insert(linkRows);
    if (linksError) throw new Error(`Links insert failed: ${linksError.message}`);
    results.links = linkRows.length;

    // ── Phase 11: AI Concierge Queries (with Rich Cards) ─────────────────
    const aiRows: Record<string, unknown>[] = [];
    for (const trip of ALL_TRIPS) {
      const queries = getAiQueries(trip);
      const baseTime = new Date(trip.start_date).getTime();
      for (let i = 0; i < queries.length; i++) {
        const metadata: Record<string, unknown> = {
          model: 'gemini-2.0-flash',
          context_sources: ['chat', 'calendar', 'places'],
        };
        if (queries[i].rich_cards) {
          metadata.rich_cards = queries[i].rich_cards;
        }
        aiRows.push({
          trip_id: trip.id,
          user_id: DEMO_USER_ID,
          query_text: queries[i].query,
          response_text: queries[i].response,
          source_count: 3,
          created_at: new Date(baseTime - (i + 1) * 86400000).toISOString(),
          metadata: JSON.stringify(metadata),
        });
      }
    }

    const { error: aiError } = await supabaseAdmin.from('ai_queries').insert(aiRows);
    if (aiError) throw new Error(`AI queries insert failed: ${aiError.message}`);
    results.ai_queries = aiRows.length;
    results.rich_card_queries = aiRows.filter(r => {
      const m = JSON.parse(r.metadata as string);
      return m.rich_cards && m.rich_cards.length > 0;
    }).length;

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
