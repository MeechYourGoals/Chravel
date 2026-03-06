import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { corsHeaders } from '../_shared/cors.ts';

const DEMO_USER_ID = '11ba817d-f0c8-411d-9a75-b1bde6c4df4a';

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
  // ── Past ──
  {
    id: 'carlton-iceland-2026',
    name: 'Iceland Northern Lights Trip',
    description:
      'Chasing auroras across the Golden Circle with the crew. Ice caves, hot springs, and midnight skies.',
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
    description:
      'Gallery openings, street art tours, mezcal tastings, and the best tacos al pastor on the planet.',
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
    description:
      'Panels, parties, and premiere screenings. Networking on 6th Street and tacos on every corner.',
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
  // ── Current ──
  {
    id: 'carlton-ibiza-2026',
    name: 'Ibiza Birthday Weekend',
    description:
      'Turning 32 in style. Beach clubs, sunset DJs at Café del Mar, and a villa with a view.',
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
    description:
      'Race weekend with the boys. Paddock passes, rooftop watch parties, and South Beach nightlife.',
    destination: 'Miami, FL',
    trip_type: 'consumer',
    start_date: '2026-05-01T00:00:00Z',
    end_date: '2026-05-05T00:00:00Z',
    basecamp_name: 'Faena Hotel Miami Beach',
    basecamp_address: '3201 Collins Ave, Miami Beach, FL 33140',
  },
  // ── Future ──
  {
    id: 'carlton-amalfi-2026',
    name: 'Amalfi Coast Escape',
    description:
      'Positano sunsets, Ravello gardens, limoncello on the cliffs. Pure Italian summer.',
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
    description:
      'Morning surf sessions, rice terrace hikes, temple visits, and sunset yoga in Uluwatu.',
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
    description:
      'Santorini to Mykonos to Paros. Cliff-side dinners, catamaran sailing, and ouzo sunsets.',
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
    description:
      'Production coordination for the Chicago stop. Load-in, soundcheck, greenroom setup, and show night.',
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
    description:
      'Press credentials, courtside content capture, player interviews, and podcast recordings.',
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
    description:
      'Live podcast recordings, creator meetups, and brand partnership meetings at the summit.',
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
    description:
      'Three-day shoot for a brand campaign. Scouting locations, crew coordination, and post-production review.',
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
    description:
      'Front row at Jacquemus, backstage at Louis Vuitton, and content shoots at the Palais de Tokyo.',
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
    description:
      'Contract negotiations, client dinners at Prime 112, and a Heat game at Kaseya Center.',
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
    description:
      'Stage management, artist logistics, sound engineering coordination for a two-day festival.',
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
    description:
      'Three days of fireside chats, pitch sessions, and networking with top-tier VCs at the lake.',
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
    description:
      'The ultimate race weekend experience. Paddock access, fan zones, and celebrity after-parties.',
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
    description:
      'Red carpet premieres, yacht parties, and networking with filmmakers on the Croisette.',
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
    description:
      'Gallery previews, installations in Wynwood, and collector dinners in the Design District.',
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
    description:
      'Music showcases, interactive panels, film premieres, and the legendary 6th Street crawl.',
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
    description:
      'The crown jewel of motorsport. Yacht viewing, Casino Square, and the Monte Carlo circuit.',
    destination: 'Monte Carlo, Monaco',
    trip_type: 'event',
    start_date: '2026-05-22T00:00:00Z',
    end_date: '2026-05-26T00:00:00Z',
    basecamp_name: 'Hôtel de Paris Monte-Carlo',
    basecamp_address: 'Place du Casino, 98000 Monaco',
  },
];

const ALL_TRIPS = [...CONSUMER_TRIPS, ...PRO_TRIPS, ...EVENT_TRIPS];

// ─── Chat Messages per Trip ─────────────────────────────────────────────────

function getChatMessages(trip: TripDef): { content: string; offset_hours: number }[] {
  const map: Record<string, { content: string; offset_hours: number }[]> = {
    'carlton-iceland-2026': [
      {
        content:
          'Just booked the Northern Lights jeep tour for the 10th — everyone needs to be ready by 8pm 🌌',
        offset_hours: -72,
      },
      {
        content: 'Pack thermal layers. It was -15°C last year when my friend went.',
        offset_hours: -48,
      },
      {
        content: "Hotel Rangá has a hot tub with direct aurora views. We're locked in.",
        offset_hours: -24,
      },
      {
        content:
          'Golden Circle day trip confirmed — Gullfoss, Geysir, Thingvellir. Driver picking us up at 9am.',
        offset_hours: 2,
      },
      {
        content: "THE LIGHTS WERE INSANE TONIGHT. Best I've ever seen. Check the group album.",
        offset_hours: 52,
      },
      {
        content: "Ice cave tour tomorrow at 11am. Don't forget waterproof boots.",
        offset_hours: 72,
      },
      {
        content: 'Last night dinner at Grillið was incredible. The lamb is a must.',
        offset_hours: 96,
      },
      {
        content: 'Already planning to come back next winter. This trip set the bar.',
        offset_hours: 140,
      },
    ],
    'carlton-mexico-city-2025': [
      { content: "Landing at MEX at 2pm Thursday. Who's arriving when?", offset_hours: -48 },
      {
        content: 'Found an incredible mezcal tasting in Roma Norte — Friday at 7pm?',
        offset_hours: -24,
      },
      {
        content: 'The gallery opening in Coyoacán is Saturday night. Dress code: creative casual.',
        offset_hours: 0,
      },
      {
        content: 'Tacos al pastor at El Vilsito at 2am was a religious experience. 10/10.',
        offset_hours: 24,
      },
      {
        content: 'Street art tour in Roma was amazing. The guide knew every artist personally.',
        offset_hours: 36,
      },
      { content: 'Churros y chocolate at El Moro before we fly out tomorrow ☕', offset_hours: 60 },
    ],
    'carlton-sxsw-2025': [
      {
        content: "Badge pickup is at the convention center. I'll grab everyone's.",
        offset_hours: -12,
      },
      { content: 'The AI panel at 2pm is a must-see — Sam Altman is on it.', offset_hours: 0 },
      { content: 'Free tacos at the Google activation on Rainey Street 🌮', offset_hours: 24 },
      {
        content: "Secret Kendrick show tonight at Stubb's. RSVP link in the group.",
        offset_hours: 48,
      },
      {
        content: 'Met some incredible founders at the mixer. Adding them to my network.',
        offset_hours: 72,
      },
      {
        content: 'Last day — catching the closing night film at the Paramount Theatre.',
        offset_hours: 168,
      },
      { content: 'SXSW never disappoints. Already registered for next year.', offset_hours: 192 },
    ],
    'carlton-nba-summer-2025': [
      {
        content: "Courtside seats locked for the first three games. Let's gooo 🏀",
        offset_hours: -24,
      },
      { content: "Pool party at Encore Beach Club after today's games.", offset_hours: 12 },
      {
        content: 'That rookie from Duke is going to be a problem. Mark my words.',
        offset_hours: 36,
      },
      { content: 'Dinner at STK tonight — reservation for 6 at 9pm.', offset_hours: 48 },
      { content: 'Last game today. Anyone want to hit the sportsbook after?', offset_hours: 72 },
      { content: 'Vegas Summer League is the best annual tradition we have.', offset_hours: 96 },
    ],
    'carlton-nola-jazz-2025': [
      {
        content: 'Landing in NOLA at noon. Going straight to Frenchmen Street. 🎷',
        offset_hours: -6,
      },
      { content: 'Beignets at Café du Monde first thing — non-negotiable.', offset_hours: 0 },
      {
        content: 'The Preservation Hall show was transcendent. Real jazz is alive.',
        offset_hours: 18,
      },
      {
        content: "Late night po'boys at Parkway Bakery. Turkey & gravy. Trust me.",
        offset_hours: 30,
      },
      { content: 'Swamp tour tomorrow morning — gators and all.', offset_hours: 36 },
      {
        content: 'NOLA will always be one of my favorite cities. The soul is unmatched.',
        offset_hours: 60,
      },
    ],
    'carlton-tokyo-2025': [
      {
        content: 'Narita Express to Shinjuku — meeting everyone at the hotel lobby at 6pm.',
        offset_hours: -2,
      },
      {
        content: 'Tsukiji outer market for breakfast tomorrow. Fresh sushi at 7am.',
        offset_hours: 6,
      },
      {
        content: 'Found a 6-seat omakase in Ginza with a 3-month waitlist. Got us in. 🍣',
        offset_hours: 24,
      },
      {
        content: 'Shibuya Crossing at night is something else. Filmed the whole thing.',
        offset_hours: 48,
      },
      {
        content: 'Ramen Ichiran at 1am — the solo booth experience is peak introvert dining.',
        offset_hours: 60,
      },
      { content: 'TeamLab Borderless was mind-blowing. Allow 3 hours minimum.', offset_hours: 72 },
      {
        content: 'Day trip to Hakone for hot springs and views of Fuji. Worth every minute.',
        offset_hours: 120,
      },
      {
        content: 'Last night in Roppongi. This trip changed how I think about food and culture.',
        offset_hours: 180,
      },
    ],
    'carlton-ibiza-2026': [
      {
        content: "Birthday trip is LOCKED. Villa booked, flights confirmed. Let's go! 🎉",
        offset_hours: -168,
      },
      {
        content: "Café del Mar sunset session Friday night — I'll put us on the list.",
        offset_hours: -72,
      },
      {
        content: 'Private boat charter on Saturday. Departure from San Antonio marina at 11am.',
        offset_hours: -24,
      },
      {
        content: "The villa has a pool, DJ setup, and views of Dalt Vila. We're set.",
        offset_hours: 0,
      },
      {
        content: 'Birthday dinner at Cala Bonita — reservation for 10 at 8:30pm.',
        offset_hours: 12,
      },
      {
        content: 'Pacha tonight. Table confirmed. This is what 32 looks like. 🕺',
        offset_hours: 36,
      },
      { content: "Best birthday I've ever had. Love this crew.", offset_hours: 72 },
      { content: 'Recovery day at the villa. Pool, music, zero plans.', offset_hours: 84 },
    ],
    'carlton-toronto-2026': [
      { content: 'Flying into YYZ Thursday night. Anyone arriving earlier?', offset_hours: -48 },
      {
        content:
          'Kensington Market food crawl Friday afternoon — empanadas, jerk chicken, and dim sum.',
        offset_hours: 0,
      },
      {
        content: 'CN Tower dinner is booked for Saturday at 7pm. Window table. 🗼',
        offset_hours: 24,
      },
      {
        content: "Drake's OVO store is a 5-minute walk from the hotel. Just saying.",
        offset_hours: 28,
      },
      {
        content: 'Found a crazy good ramen spot in Koreatown. Kinton Ramen — go immediately.',
        offset_hours: 48,
      },
      {
        content:
          'St. Lawrence Market on Sunday morning for peameal bacon sandwiches. Canadian staple.',
        offset_hours: 60,
      },
      { content: 'Toronto punches way above its weight. Underrated food city.', offset_hours: 84 },
    ],
    'carlton-miami-f1-consumer': [
      {
        content: 'Race weekend itinerary coming tomorrow. Paddock passes are confirmed! 🏎️',
        offset_hours: -120,
      },
      {
        content: 'Rooftop watch party at 1 Hotel on Friday — practice sessions and cocktails.',
        offset_hours: -24,
      },
      {
        content:
          'Qualifying is Saturday at 4pm. Meeting at the gate at 2pm for paddock walkthrough.',
        offset_hours: 0,
      },
      { content: 'Post-qualifying dinner at Zuma. Reservation for 8 at 9pm.', offset_hours: 6 },
      { content: "Race day! Let's get there early. Gates open at 11am.", offset_hours: 24 },
      {
        content: 'LIV on Sunday night. Table confirmed. The energy after the race is unreal.',
        offset_hours: 30,
      },
      {
        content: 'What a weekend. Miami F1 is becoming the best event on the calendar.',
        offset_hours: 72,
      },
      { content: "Need to do Monaco next month. Who's in?", offset_hours: 84 },
    ],
    'carlton-amalfi-2026': [
      {
        content: 'Flights booked! Rome → Naples → ferry to Positano. Arriving June 20th.',
        offset_hours: -336,
      },
      {
        content: "Le Sirenuse is one of the most beautiful hotels on the planet. Can't wait.",
        offset_hours: -240,
      },
      {
        content: 'Renting a boat for the day to hit Capri — Grotta Azzurra is a must.',
        offset_hours: -168,
      },
      {
        content: 'Need restaurant recommendations — Da Adolfo for beach lunch? Zass for dinner?',
        offset_hours: -120,
      },
      { content: "Packing light — it's all linen and sandals for a week.", offset_hours: -72 },
      {
        content: 'Limoncello tasting in Ravello on day 3. The gardens there are insane.',
        offset_hours: -48,
      },
    ],
    'carlton-bali-2026': [
      {
        content: 'Surf retreat is happening! August 5-14 in Canggu. Villa secured 🏄‍♂️',
        offset_hours: -504,
      },
      {
        content: 'Morning surf sessions at Echo Beach, afternoon yoga at The Practice. Balance.',
        offset_hours: -336,
      },
      { content: 'Tegallalang rice terraces day trip planned for day 3.', offset_hours: -240 },
      {
        content: 'Uluwatu temple sunset ceremony — supposed to be life-changing.',
        offset_hours: -168,
      },
      { content: 'La Brisa for sunset cocktails. Best beach club in Canggu.', offset_hours: -120 },
      {
        content: 'Anyone want to do the Mount Batur sunrise trek? 2am start but worth it.',
        offset_hours: -72,
      },
    ],
    'carlton-greek-islands-2026': [
      {
        content:
          'Island hopping route: Santorini (3 nights) → Mykonos (3 nights) → Paros (3 nights). Ferries booked.',
        offset_hours: -504,
      },
      {
        content: 'Sunset dinner at Ammoudi Bay in Oia — the seafood tavernas right on the water.',
        offset_hours: -336,
      },
      {
        content: 'Catamaran sailing day in Santorini — includes swimming stops and BBQ on board.',
        offset_hours: -240,
      },
      {
        content: 'Mykonos nightlife is legendary. Scorpios for sunset, then Little Venice.',
        offset_hours: -168,
      },
      {
        content: 'Paros is the hidden gem of the Cyclades. Less touristy, more authentic.',
        offset_hours: -120,
      },
      {
        content: 'Need to book that cliffside restaurant in Fira everyone keeps recommending.',
        offset_hours: -72,
      },
    ],
  };

  // Pro trips
  map['carlton-chappelle-chicago'] = [
    {
      content: 'Load-in at the Chicago Theatre starts at 10am. Crew meet at the loading dock.',
      offset_hours: -12,
    },
    {
      content: 'Soundcheck moved to 4pm — Dave wants extra time for the new material.',
      offset_hours: 0,
    },
    {
      content: 'Greenroom setup: sparkling water, fresh fruit, and NO peanuts. Allergy on crew.',
      offset_hours: 6,
    },
    {
      content: 'Show was INCREDIBLE. Standing ovation. Three encores. Chicago loves Dave.',
      offset_hours: 24,
    },
    { content: "Post-show dinner at Gibson's. The team earned it.", offset_hours: 26 },
    { content: 'Next stop is Detroit. Travel logistics coming tomorrow.', offset_hours: 48 },
  ];
  map['carlton-nba-media-vegas'] = [
    { content: 'Press credentials confirmed. Courtside media row, games 1-4.', offset_hours: -24 },
    {
      content: 'Interview with the #2 pick scheduled for 3pm at the Thomas & Mack Center.',
      offset_hours: 0,
    },
    {
      content: 'Content team: need B-roll of the crowd energy during the halftime dunk contest.',
      offset_hours: 12,
    },
    {
      content: 'Podcast recording at the hotel suite tonight — mics are set up.',
      offset_hours: 24,
    },
    {
      content: 'Got exclusive quotes from the Celtics coach. This episode is going to be fire 🔥',
      offset_hours: 36,
    },
    {
      content: 'Wrap on the Vegas media trip. Content calendar is loaded for the next month.',
      offset_hours: 72,
    },
  ];
  map['carlton-podcast-austin'] = [
    {
      content: 'Studio is booked at the hotel conference room. Bringing portable mics.',
      offset_hours: -12,
    },
    { content: "Panel on creator monetization at 2pm — I'm moderating.", offset_hours: 0 },
    {
      content: 'Live podcast recording tonight with 200+ in attendance. Sold out.',
      offset_hours: 18,
    },
    {
      content: 'Brand partnership meeting with Nike tomorrow at 10am. Big opportunity.',
      offset_hours: 24,
    },
    {
      content: "Austin's creator scene is growing fast. So many talented people here.",
      offset_hours: 48,
    },
    { content: 'Summit was a success. 3 new brand deals in the pipeline.', offset_hours: 60 },
  ];
  map['carlton-dj-tour-berlin'] = [
    {
      content: 'Equipment shipped to Berlin — arriving at the venue Thursday morning.',
      offset_hours: -48,
    },
    { content: 'Studio session with local producers at Funkhaus from 2-6pm.', offset_hours: 0 },
    {
      content: 'Tresor set is Saturday night 1-3am. Going to debut the new tracks.',
      offset_hours: 12,
    },
    { content: 'After-party location confirmed. Invite-only. 50 people max.', offset_hours: 24 },
    {
      content: 'The crowd at Tresor was something else. Berlin knows how to party.',
      offset_hours: 48,
    },
    {
      content: 'Berlin might be my favorite city for music. The culture here is unmatched.',
      offset_hours: 72,
    },
  ];
  map['carlton-film-vancouver'] = [
    {
      content:
        'Shot list finalized. Day 1: downtown locations. Day 2: Stanley Park. Day 3: studio.',
      offset_hours: -24,
    },
    {
      content: 'Crew call time is 6am at the Gastown location. Coffee will be there.',
      offset_hours: 0,
    },
    { content: 'Lost the light at 4pm but got incredible golden hour footage.', offset_hours: 10 },
    { content: 'Rain delay on Day 2 — switching to the studio scenes first.', offset_hours: 24 },
    { content: 'Wrap on principal photography! Dailies look amazing.', offset_hours: 72 },
    {
      content: 'Post-production meeting Monday. Editor is already cutting the first assembly.',
      offset_hours: 96,
    },
  ];
  map['carlton-fashion-paris'] = [
    {
      content: 'Schedule: Jacquemus Mon, Louis Vuitton Tue, Dior Wed, Chanel Thu.',
      offset_hours: -24,
    },
    {
      content: 'Backstage pass confirmed for the Louis Vuitton show. Content gold.',
      offset_hours: 0,
    },
    {
      content: 'Shot some incredible looks at the Palais de Tokyo installation.',
      offset_hours: 24,
    },
    { content: 'Dinner at Le Cinq tonight — Michelin 3-star. Dress to impress.', offset_hours: 36 },
    {
      content: "Paris Fashion Week is exhausting but the content is chef's kiss. 📸",
      offset_hours: 72,
    },
    { content: 'The croissants alone make this trip worth it.', offset_hours: 96 },
  ];
  map['carlton-sports-agent-miami'] = [
    {
      content: 'Client meeting at 10am at the Four Seasons. Bring the updated contract terms.',
      offset_hours: 0,
    },
    {
      content: 'Dinner at Prime 112 tonight — client wants to celebrate the deal.',
      offset_hours: 8,
    },
    { content: 'Heat game tomorrow night. Kaseya Center, Section 108, Row 2.', offset_hours: 18 },
    {
      content: 'Deal is signed. Three-year extension. Huge win for the team. 🤝',
      offset_hours: 36,
    },
    { content: 'Celebrating at LIV tonight. The client insisted.', offset_hours: 40 },
    { content: 'Back to LA tomorrow. What a productive Miami trip.', offset_hours: 60 },
  ];
  map['carlton-music-fest-la'] = [
    {
      content: 'Stage plot approved. Main stage, secondary stage, and acoustic tent.',
      offset_hours: -48,
    },
    { content: 'Artist check-in starts at noon. Headliner arriving at 4pm.', offset_hours: 0 },
    { content: 'Sound issue on Stage B — sending the tech team now.', offset_hours: 8 },
    { content: 'Day 1 attendance: 15,000. Exceeded projections by 20%.', offset_hours: 14 },
    {
      content: 'Headliner just killed it. The crowd was electric. Best set of the festival.',
      offset_hours: 26,
    },
    {
      content: 'Festival wrap. Zero incidents, great weather, incredible performances. We did it.',
      offset_hours: 48,
    },
  ];
  map['carlton-founder-tahoe'] = [
    {
      content:
        'Agenda: Day 1 = pitch sessions. Day 2 = fireside chats. Day 3 = outdoor activities.',
      offset_hours: -24,
    },
    {
      content: 'Met a VC from a16z at the welcome dinner. Very interested in the creator space.',
      offset_hours: 6,
    },
    {
      content: 'Morning kayaking on the lake before sessions start. This view is unreal.',
      offset_hours: 18,
    },
    {
      content: 'Great feedback on my pitch. Need to refine the go-to-market slide.',
      offset_hours: 30,
    },
    {
      content: 'Connected with 12 founders in similar spaces. The network here is incredible.',
      offset_hours: 54,
    },
    {
      content:
        "Lake Tahoe retreat is the best founder event I've attended. Already signed up for next year.",
      offset_hours: 72,
    },
  ];
  map['carlton-creator-conf-nyc'] = [
    {
      content: 'Keynote is Tuesday at 10am. Slides are done. Rehearsal at 8am.',
      offset_hours: -12,
    },
    {
      content: 'Panel on "Building a Creator Business" at 2pm — I\'m alongside MrBeast\'s team.',
      offset_hours: 0,
    },
    {
      content: 'After-party at The Standard rooftop. Views of the High Line at sunset.',
      offset_hours: 12,
    },
    { content: 'Three brand deal meetings today. Netflix, Nike, and Apple.', offset_hours: 24 },
    { content: "Keynote went perfectly. Standing ovation. Let's go! 🎤", offset_hours: 26 },
    {
      content: 'NYC energy is unmatched. This conference gets better every year.',
      offset_hours: 48,
    },
  ];

  // Event trips
  map['carlton-event-miami-f1'] = [
    {
      content: "VIP paddock wristbands distributed. Don't lose them — they're $5K each.",
      offset_hours: -24,
    },
    { content: 'Practice sessions today. Great chance to explore the fan zone.', offset_hours: 0 },
    { content: 'Qualifying was INSANE. Verstappen by 0.003 seconds.', offset_hours: 24 },
    { content: 'Race day! Meeting at Gate 5 at 10am. Bring sunscreen.', offset_hours: 48 },
    {
      content: 'Post-race concert by The Weeknd. This event is on another level.',
      offset_hours: 54,
    },
    { content: 'Best F1 weekend yet. Miami knows how to put on a show.', offset_hours: 72 },
  ];
  map['carlton-event-super-bowl'] = [
    {
      content: 'Tailgate setup starts at 10am. Bringing the grill and the good speakers.',
      offset_hours: -6,
    },
    {
      content: "Pre-game concert is Usher again? Apparently it's a different artist this year.",
      offset_hours: 0,
    },
    { content: 'Section 142, Row 8. We can see the 50-yard line perfectly.', offset_hours: 2 },
    { content: 'WHAT A GAME. Overtime! My voice is gone.', offset_hours: 6 },
    { content: 'After-party at The Roosevelt. Open bar until 2am.', offset_hours: 8 },
    {
      content: 'Super Bowl in NOLA is the perfect combination. Football + best food city.',
      offset_hours: 24,
    },
  ];
  map['carlton-event-cannes'] = [
    { content: 'Red carpet premiere tonight at 7pm. Black tie mandatory.', offset_hours: 0 },
    {
      content: 'Yacht party invitation from the producers — dock at Port Canto, 9pm.',
      offset_hours: 12,
    },
    {
      content: 'Screening of the new Nolan film. Speechless. Oscar contender for sure.',
      offset_hours: 24,
    },
    {
      content:
        "Lunch at La Colombe d'Or. The art collection on the walls is priceless — literally.",
      offset_hours: 48,
    },
    {
      content: 'Networking dinner with distributors. Four deal discussions in one evening.',
      offset_hours: 72,
    },
    {
      content: "Cannes is where art meets business. There's nothing else like it.",
      offset_hours: 120,
    },
  ];
  map['carlton-event-jfl-montreal'] = [
    { content: 'Gala taping tonight at Place des Arts. Seats in the 3rd row.', offset_hours: 0 },
    { content: 'Secret set at Comedyworks — only 80 seats. IYKYK.', offset_hours: 24 },
    {
      content: 'Old Montreal food tour today. Poutine, smoked meat, and maple everything.',
      offset_hours: 36,
    },
    {
      content: 'The new comedians this year are INCREDIBLE. Watch for that Brooklyn kid.',
      offset_hours: 48,
    },
    {
      content: 'Comedy is the best live art form. These shows prove it every year.',
      offset_hours: 96,
    },
    { content: "Already planning to come back. JFL Montreal is a can't-miss.", offset_hours: 108 },
  ];
  map['carlton-event-art-basel'] = [
    { content: 'Preview day access confirmed. Getting in before the public.', offset_hours: -12 },
    { content: 'The Wynwood Walls installation this year is jaw-dropping.', offset_hours: 0 },
    {
      content:
        'Collector dinner in the Design District tonight. Seated next to the curator from MoMA.',
      offset_hours: 18,
    },
    {
      content: 'Bought a piece from an emerging artist. Supporting new talent is the move.',
      offset_hours: 36,
    },
    {
      content: 'Art Basel is where you see what culture will look like in 5 years.',
      offset_hours: 72,
    },
    {
      content: 'Miami in December > Miami in August. Perfect weather for art walks.',
      offset_hours: 84,
    },
  ];
  map['carlton-event-sundance'] = [
    {
      content: 'Premiere tickets for 3 films secured. First screening at 10am tomorrow.',
      offset_hours: -12,
    },
    {
      content: 'The documentary about AI art just won the audience award. Mind-blowing.',
      offset_hours: 24,
    },
    {
      content: 'Après-ski at Deer Valley with the cast of the opening night film. Surreal.',
      offset_hours: 36,
    },
    {
      content: 'Park City is magical in winter. The snow, the movies, the hot chocolate.',
      offset_hours: 48,
    },
    { content: "Discovered 4 films I'll be watching for at the Oscars.", offset_hours: 96 },
    {
      content: 'Sundance reminds me why I love storytelling. See you next January.',
      offset_hours: 120,
    },
  ];
  map['carlton-event-sxsw'] = [
    {
      content: 'Interactive badge confirmed. Keynote schedule is stacked this year.',
      offset_hours: -24,
    },
    {
      content: 'The AI + Music panel was the best session so far. Wild implications.',
      offset_hours: 24,
    },
    { content: "Last year's SXSW was good but this year is on another level.", offset_hours: 48 },
    {
      content: 'Secret show at Mohawk tonight — indie band from London. Trust me.',
      offset_hours: 72,
    },
    {
      content: 'Austin keeps growing but 6th Street still hits different during SXSW.',
      offset_hours: 120,
    },
    { content: 'Wrapped SXSW 2026. Already counting down to next year.', offset_hours: 192 },
  ];
  map['carlton-event-monaco-gp'] = [
    {
      content: 'Yacht viewing confirmed. Deck access at Turn 1 — the best angle on the circuit.',
      offset_hours: -24,
    },
    { content: 'Casino Square at night is pure James Bond energy.', offset_hours: 0 },
    {
      content: 'Practice laps echoing through the streets. The sound is visceral.',
      offset_hours: 12,
    },
    {
      content: "Dinner at Le Louis XV tonight. Alain Ducasse's 3-Michelin-star masterpiece.",
      offset_hours: 24,
    },
    {
      content: 'Race day. The most iconic circuit in motorsport. Champagne on the yacht.',
      offset_hours: 48,
    },
    { content: "Monaco is not a place. It's a feeling. Until next year. 🇲🇨", offset_hours: 60 },
  ];

  return (
    map[trip.id] || [
      { content: `Excited about ${trip.name}! Planning is underway.`, offset_hours: -48 },
      { content: `${trip.destination} — here we come! ✈️`, offset_hours: -24 },
      {
        content: 'Logistics are coming together nicely. All details in the calendar.',
        offset_hours: 0,
      },
      { content: 'Having an amazing time. This trip is one for the books.', offset_hours: 24 },
      {
        content: "Can't believe it's almost over. Time flies when you're living your best life.",
        offset_hours: 48,
      },
      { content: "Back home. Already miss it. Who's down for the next one?", offset_hours: 72 },
    ]
  );
}

// ─── Events per Trip ─────────────────────────────────────────────────────────

function getEvents(trip: TripDef): {
  title: string;
  description: string;
  location: string;
  offset_hours: number;
  duration_hours: number;
  category: string;
}[] {
  const eventsMap: Record<string, ReturnType<typeof getEvents>> = {
    'carlton-iceland-2026': [
      {
        title: 'Northern Lights Jeep Tour',
        description: 'Guided aurora hunting expedition with professional photographer',
        location: 'Thingvellir National Park',
        offset_hours: 48,
        duration_hours: 4,
        category: 'activity',
      },
      {
        title: 'Golden Circle Day Trip',
        description: 'Gullfoss, Geysir, and Thingvellir',
        location: 'Golden Circle Route',
        offset_hours: 24,
        duration_hours: 10,
        category: 'excursion',
      },
      {
        title: 'Ice Cave Exploration',
        description: 'Guided tour of crystal ice caves in Vatnajökull',
        location: 'Vatnajökull Glacier',
        offset_hours: 72,
        duration_hours: 6,
        category: 'activity',
      },
    ],
    'carlton-ibiza-2026': [
      {
        title: 'Birthday Dinner at Cala Bonita',
        description: 'Private dinner for 10 on the beach',
        location: 'Cala Bonita, Santa Eulalia',
        offset_hours: 12,
        duration_hours: 3,
        category: 'dining',
      },
      {
        title: 'Café del Mar Sunset Session',
        description: 'Live DJ set at the iconic sunset spot',
        location: 'Café del Mar, San Antonio',
        offset_hours: -12,
        duration_hours: 4,
        category: 'nightlife',
      },
      {
        title: 'Private Boat Charter',
        description: 'Full day sailing around Ibiza and Formentera',
        location: 'San Antonio Marina',
        offset_hours: 24,
        duration_hours: 8,
        category: 'activity',
      },
    ],
    'carlton-tokyo-2025': [
      {
        title: 'Omakase at Ginza Sushi Counter',
        description: '12-course omakase at Michelin 2-star counter',
        location: 'Ginza, Tokyo',
        offset_hours: 24,
        duration_hours: 2,
        category: 'dining',
      },
      {
        title: 'TeamLab Borderless',
        description: 'Immersive digital art museum experience',
        location: 'Azabudai Hills, Tokyo',
        offset_hours: 72,
        duration_hours: 3,
        category: 'activity',
      },
      {
        title: 'Hakone Day Trip',
        description: 'Hot springs and Mt. Fuji views',
        location: 'Hakone, Kanagawa',
        offset_hours: 120,
        duration_hours: 12,
        category: 'excursion',
      },
    ],
    'carlton-chappelle-chicago': [
      {
        title: 'Load-In & Setup',
        description: 'Equipment unload and stage setup at Chicago Theatre',
        location: 'Chicago Theatre',
        offset_hours: -12,
        duration_hours: 6,
        category: 'production',
      },
      {
        title: 'Soundcheck',
        description: 'Full soundcheck with Dave and opening act',
        location: 'Chicago Theatre',
        offset_hours: 0,
        duration_hours: 2,
        category: 'production',
      },
      {
        title: 'Show Time',
        description: 'Dave Chappelle live — Chicago stop',
        location: 'Chicago Theatre',
        offset_hours: 6,
        duration_hours: 3,
        category: 'performance',
      },
    ],
    'carlton-event-cannes': [
      {
        title: 'Red Carpet Premiere',
        description: 'Opening night film premiere at Palais des Festivals',
        location: 'Palais des Festivals',
        offset_hours: 0,
        duration_hours: 4,
        category: 'premiere',
      },
      {
        title: 'Yacht Party',
        description: 'Hosted by independent film producers at Port Canto',
        location: 'Port Canto',
        offset_hours: 12,
        duration_hours: 5,
        category: 'networking',
      },
      {
        title: 'Director Q&A',
        description: 'Post-screening conversation with Christopher Nolan',
        location: 'Salle Debussy',
        offset_hours: 48,
        duration_hours: 2,
        category: 'screening',
      },
    ],
    'carlton-event-miami-f1': [
      {
        title: 'Practice Sessions',
        description: 'Free practice 1 & 2 with paddock access',
        location: 'Miami International Autodrome',
        offset_hours: 0,
        duration_hours: 6,
        category: 'race',
      },
      {
        title: 'Qualifying',
        description: 'Saturday qualifying session with VIP viewing',
        location: 'Miami International Autodrome',
        offset_hours: 24,
        duration_hours: 4,
        category: 'race',
      },
      {
        title: 'Race Day',
        description: 'Main race event with post-race concert',
        location: 'Miami International Autodrome',
        offset_hours: 48,
        duration_hours: 8,
        category: 'race',
      },
    ],
  };

  return (
    eventsMap[trip.id] || [
      {
        title: `Welcome Gathering`,
        description: `Kick-off for ${trip.name}`,
        location: trip.basecamp_name,
        offset_hours: 2,
        duration_hours: 2,
        category: 'social',
      },
      {
        title: `Group Dinner`,
        description: `Team dinner at a local favorite`,
        location: trip.destination,
        offset_hours: 30,
        duration_hours: 3,
        category: 'dining',
      },
    ]
  );
}

// ─── Tasks per Trip ──────────────────────────────────────────────────────────

function getTasks(trip: TripDef): { title: string; description: string; offset_hours: number }[] {
  if (trip.trip_type === 'pro') {
    return [
      {
        title: 'Confirm venue logistics',
        description: `Finalize load-in time, parking, and access for ${trip.destination}`,
        offset_hours: -168,
      },
      {
        title: 'Equipment checklist',
        description: 'Verify all production gear is packed and shipped',
        offset_hours: -120,
      },
      {
        title: 'Book team travel',
        description: 'Flights and ground transportation for the crew',
        offset_hours: -240,
      },
    ];
  }
  if (trip.trip_type === 'event') {
    return [
      {
        title: 'Distribute event credentials',
        description: 'VIP badges, wristbands, and access passes',
        offset_hours: -48,
      },
      {
        title: 'Confirm transportation',
        description: `Airport transfers and local transport in ${trip.destination}`,
        offset_hours: -120,
      },
    ];
  }
  return [
    {
      title: 'Book flights',
      description: `Flights to ${trip.destination} — check group chat for dates`,
      offset_hours: -336,
    },
    {
      title: 'Confirm restaurant reservations',
      description: 'Finalize dinner reservations for the group',
      offset_hours: -168,
    },
  ];
}

// ─── Payments per Trip ───────────────────────────────────────────────────────

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
    { description: `Group dinner split`, amount: 340, currency: 'USD' },
    { description: `Accommodation — ${trip.basecamp_name}`, amount: 1500, currency: 'USD' },
  ];
}

// ─── Polls per Trip ──────────────────────────────────────────────────────────

function getPoll(trip: TripDef): { question: string; options: string[] } | null {
  const polls: Record<string, { question: string; options: string[] }> = {
    'carlton-iceland-2026': {
      question: 'Which day for the Northern Lights tour?',
      options: ['January 10', 'January 11', 'January 12'],
    },
    'carlton-ibiza-2026': {
      question: 'Birthday dinner location?',
      options: ['Cala Bonita', 'Amante Ibiza', 'Es Torrent'],
    },
    'carlton-tokyo-2025': {
      question: 'Sushi vs ramen for the first night?',
      options: ['Omakase sushi', 'Ichiran Ramen', 'Both (sushi then ramen)'],
    },
    'carlton-miami-f1-consumer': {
      question: 'Post-race dinner spot?',
      options: ['Zuma', 'Komodo', 'Carbone'],
    },
    'carlton-amalfi-2026': {
      question: 'Day trip to Capri or Ravello?',
      options: ['Capri boat trip', 'Ravello gardens', 'Both — split days'],
    },
    'carlton-greek-islands-2026': {
      question: 'Extra night in Santorini or Mykonos?',
      options: ['Santorini (sunsets)', 'Mykonos (nightlife)', 'Keep the original plan'],
    },
    'carlton-toronto-2026': {
      question: 'CN Tower dinner or rooftop bar?',
      options: ['CN Tower 360 Restaurant', 'Rooftop at The Drake', 'Both!'],
    },
    'carlton-event-super-bowl': {
      question: 'Tailgate setup — what food?',
      options: ['BBQ ribs & brisket', 'Seafood boil', "Cajun crawfish (it's NOLA!)"],
    },
    'carlton-event-art-basel': {
      question: 'Which gallery day?',
      options: ['Thursday (preview)', 'Friday (opening)', 'Saturday (public)'],
    },
    'carlton-event-cannes': {
      question: 'Yacht party or rooftop party?',
      options: ['Yacht at Port Canto', 'Rooftop at Martinez', 'Why not both'],
    },
  };
  return polls[trip.id] || null;
}

// ─── Links per Trip ──────────────────────────────────────────────────────────

function getLinks(
  trip: TripDef,
): { url: string; title: string; description: string; category: string }[] {
  const linksMap: Record<string, ReturnType<typeof getLinks>> = {
    'carlton-iceland-2026': [
      {
        url: 'https://hotelranga.is',
        title: 'Hotel Rangá',
        description: 'Our base for the Northern Lights trip',
        category: 'accommodation',
      },
      {
        url: 'https://guidetoiceland.is/book-holiday-trips/golden-circle',
        title: 'Golden Circle Tour',
        description: 'Full day guided tour',
        category: 'activity',
      },
    ],
    'carlton-tokyo-2025': [
      {
        url: 'https://www.hyatt.com/park-hyatt/tyoph-park-hyatt-tokyo',
        title: 'Park Hyatt Tokyo',
        description: 'Lost in Translation hotel — our base',
        category: 'accommodation',
      },
      {
        url: 'https://www.teamlab.art/e/borderless-azabudai/',
        title: 'TeamLab Borderless',
        description: 'Immersive digital art — book tickets in advance',
        category: 'activity',
      },
    ],
    'carlton-ibiza-2026': [
      {
        url: 'https://www.cafedelmarmusic.com',
        title: 'Café del Mar',
        description: 'The legendary sunset spot',
        category: 'nightlife',
      },
      {
        url: 'https://www.pacha.com/ibiza',
        title: 'Pacha Ibiza',
        description: 'Birthday night — table reserved',
        category: 'nightlife',
      },
    ],
    'carlton-event-cannes': [
      {
        url: 'https://www.festival-cannes.com',
        title: 'Cannes Film Festival Official',
        description: 'Schedule and screening info',
        category: 'event',
      },
      {
        url: 'https://www.hotel-martinez.com',
        title: 'Hôtel Martinez',
        description: 'Our base on La Croisette',
        category: 'accommodation',
      },
    ],
    'carlton-event-monaco-gp': [
      {
        url: 'https://www.formula1.com/en/racing/2026/Monaco',
        title: 'Monaco GP Official',
        description: 'Race schedule and circuit info',
        category: 'event',
      },
      {
        url: 'https://www.hoteldeparismontecarlo.com',
        title: 'Hôtel de Paris',
        description: 'Casino Square luxury',
        category: 'accommodation',
      },
    ],
  };

  return (
    linksMap[trip.id] || [
      {
        url: `https://maps.google.com/?q=${encodeURIComponent(trip.destination)}`,
        title: `${trip.destination} Map`,
        description: `Google Maps — ${trip.destination}`,
        category: 'navigation',
      },
      {
        url: `https://www.google.com/search?q=${encodeURIComponent(trip.basecamp_name)}`,
        title: trip.basecamp_name,
        description: 'Our accommodation',
        category: 'accommodation',
      },
    ]
  );
}

// ─── AI Concierge Queries ────────────────────────────────────────────────────

function getAiQueries(trip: TripDef): { query: string; response: string }[] {
  const queriesMap: Record<string, ReturnType<typeof getAiQueries>> = {
    'carlton-iceland-2026': [
      {
        query: 'Best time to see the Northern Lights near Reykjavik?',
        response:
          "The best viewing conditions are typically between 10pm-2am, away from city light pollution. Based on your trip dates (Jan 8-14), you're in prime aurora season. I'd recommend the area around Thingvellir National Park or driving 30 minutes north of Reykjavik for the clearest skies.",
      },
      {
        query: 'What should I wear for the ice cave tour?',
        response:
          'For the Vatnajökull ice cave tour, layer up: thermal base layer, fleece mid-layer, waterproof outer shell. Waterproof hiking boots with good ankle support are essential. The cave stays around -5°C to 0°C. Your tour operator (listed in your calendar) provides helmets and crampons.',
      },
    ],
    'carlton-tokyo-2025': [
      {
        query: 'Best sushi near Shibuya Crossing?',
        response:
          "Within walking distance of Shibuya Crossing, I'd recommend: 1) Sushi no Midori (Shibuya Mark City, 4F) — great quality/value with a conveyor belt option. 2) Uobei — budget-friendly with tablet ordering. For a splurge, Sushi Saito in Roppongi (20 min by train) is a 3-Michelin-star omakase, but requires advance reservation. Your trip already has a Ginza omakase booked for the 22nd.",
      },
      {
        query: 'Late night ramen spots in Tokyo?',
        response:
          "Tokyo's best late-night ramen: 1) Ichiran Shibuya — open 24 hours, individual booth experience, perfect tonkotsu. 2) Fuunji near Shinjuku Station — tsukemen (dipping ramen), closes at midnight. 3) Afuri in Ebisu — yuzu shio ramen, open until 4am on weekends. Based on your Park Hyatt location in Shinjuku, Fuunji is the closest option at a 5-minute walk.",
      },
    ],
    'carlton-ibiza-2026': [
      {
        query: 'Best beach clubs in Ibiza for a birthday celebration?',
        response:
          "For your March birthday weekend: 1) Nikki Beach — upscale, great DJ lineup, can do bottle service for groups. 2) Beachouse — more relaxed vibe, right on Playa d'en Bossa. 3) Blue Marlin — the classic, but pricier. Since you're staying in Can Furnet (east side), Nikki Beach and Cala Bonita (where your dinner is booked) are both within 15 minutes.",
      },
      {
        query: 'Sunset boat tour recommendations around Ibiza?',
        response:
          'For your Saturday boat charter from San Antonio Marina: 1) Route suggestion: San Antonio → Cala Comte (swim stop) → Es Vedrà (sunset views) → Formentera (if time allows). 2) Duration: 6-8 hours is ideal. 3) Your charter includes snorkeling gear and a BBQ on board. Pro tip: Es Vedrà at sunset is the most magical spot on the island. Pack a light jacket — it gets breezy.',
      },
    ],
    'carlton-event-cannes': [
      {
        query: 'Restaurants near Palais des Festivals?',
        response:
          'Walking distance from the Palais: 1) La Pizza Cresci (2 min) — best quick lunch between screenings. 2) Le Park 45 at the Grand Hotel (3 min) — upscale French, terrace dining. 3) Mantel (5 min) — Michelin-starred, seasonal Provençal cuisine. For your dinner plans, Le Cinq at the Four Seasons in nearby Saint-Tropez is worth the 1-hour drive for a special occasion.',
      },
      {
        query: 'Transportation from Nice airport to Cannes?',
        response:
          "Nice Côte d'Azur to Cannes options: 1) Helicopter transfer — 7 minutes, ~€160 pp (most baller option). 2) Private car — 40-50 min, ~€80-120. 3) Express Bus 210 — 45 min, €22. 4) Train from Nice-Ville — 30 min, €8 (but requires taxi to station). Given your Hôtel Martinez stay, I'd recommend a private car arranged through the hotel concierge for seamless arrival.",
      },
    ],
    'carlton-miami-f1-consumer': [
      {
        query: 'Best restaurants near Hard Rock Stadium for F1 weekend?',
        response:
          'Near the circuit in Miami Gardens: 1) Bourbon Steak at the JW Marriott Turnberry (15 min) — premium steakhouse. 2) Komodo in Brickell (25 min) — Asian fusion, celebrity scene. 3) Zuma in downtown (20 min) — Japanese izakaya, your group dinner is already booked here for Saturday at 9pm. For quick bites at the circuit, the F1 Paddock Club has catered dining included with your passes.',
      },
      {
        query: 'VIP nightlife during Miami F1 weekend?',
        response:
          'F1 weekend nightlife is next level: 1) LIV at Fontainebleau — THE spot race weekend. Your table is confirmed for Sunday. 2) E11EVEN — 24-hour ultra club, expect long lines but worth it. 3) Basement at The Edition — bowling, skating, and a club. Pro tip: After the race, head straight to LIV. The drivers and celebs show up around midnight.',
      },
    ],
    'carlton-amalfi-2026': [
      {
        query: 'Best restaurants in Positano with a view?',
        response:
          "Positano restaurants with stunning views: 1) Da Adolfo — accessible only by boat, beach-level seafood. Perfect for your Day 2 boat day. 2) Ristorante Max — panoramic terrace above the town. 3) Zass at Il San Pietro — Michelin-starred, cliff-side terrace 300m above the sea. Since you're at Le Sirenuse, their own restaurant La Sponda has 400 candles lit nightly — don't miss dinner there your first night.",
      },
      {
        query: 'How to get from Positano to Capri?',
        response:
          "Positano to Capri options: 1) Public ferry — runs 3x daily in June, 50 min, ~€20. 2) Private boat charter — your rental is already booked for Day 4, and Capri's Blue Grotto (Grotta Azzurra) is on the route. Arrive at the grotto before 11am to avoid the tourist rush. 3) On Capri, take the funicular to Anacapri for the best views and fewer crowds.",
      },
    ],
    'carlton-chappelle-chicago': [
      {
        query: 'Best late night food near the Chicago Theatre?',
        response:
          "Near the Chicago Theatre (downtown Loop): 1) Portillo's (5 min walk) — Chicago-style hot dogs and Italian beef, open until midnight. 2) Au Cheval (10 min) — best burger in Chicago, open until 1am on weekends. 3) Xoco by Rick Bayless (7 min) — tortas and churros. For the post-show crew dinner, Gibson's Steakhouse in Gold Coast (10 min drive) is a Chicago institution — your reservation is at 11pm.",
      },
      {
        query: 'Production equipment rental in Chicago?',
        response:
          'For backup production equipment in Chicago: 1) Chicago Grip & Electric (West Loop) — full lighting and rigging rental. 2) Helix Camera & Video (River North) — camera gear and audio equipment. 3) TC Furlong (Countryside) — pro audio and PA systems. Your main equipment was shipped to the venue and arrives Thursday morning per the logistics schedule. Contact the venue production manager (info in the Tasks tab) if anything is missing.',
      },
    ],
    'carlton-nola-jazz-2025': [
      {
        query: 'Best live jazz clubs on Frenchmen Street?',
        response:
          'Frenchmen Street jazz picks: 1) The Spotted Cat — no cover, small venue, incredible local bands. Go early (8pm) to get a spot. 2) d.b.a. — more curated bookings, great cocktails. 3) The Maison — three floors of different music, open until 4am. Pro tip: Walk the street first and listen through the doors. The best music changes nightly. Your hotel (Ace) is a 10-minute walk away.',
      },
      {
        query: 'Cajun food recommendations beyond the French Quarter?',
        response:
          "Beyond the tourist spots: 1) Parkway Bakery & Tavern (Mid-City) — legendary po'boys, especially the turkey & gravy. Your chat already mentioned this! 2) Dooky Chase (Tremé) — Leah Chase's legendary Creole restaurant. 3) Cochon Butcher (Warehouse District) — modern Cajun, incredible boudin and pork belly. For the full experience, take the streetcar to Mid-City for Parkway — it's a 20-min scenic ride from the hotel.",
      },
    ],
    'carlton-event-monaco-gp': [
      {
        query: 'Where to watch the Monaco GP from a yacht?',
        response:
          'Your yacht viewing is confirmed at Turn 1 — the chicane at Sainte Dévote, one of the most dramatic corners on the circuit. The yacht dock at Port Hercule gives you direct views of the harbor section. Boarding starts at 10am on race day. Champagne and catering are included. For the best photos, position yourself on the upper deck during the start — the cars accelerate from the grid right past your position.',
      },
      {
        query: 'Best casino experience in Monte Carlo?',
        response:
          'Casino Monte-Carlo is THE experience: 1) Main gaming rooms open at 2pm — bring your passport (required). 2) Salons Privés for higher stakes (minimum €100 bets). 3) The terrace bar has stunning views over the Mediterranean. Dress code: smart casual minimum, jacket recommended for Salons Privés. Your hotel (Hôtel de Paris) is directly across Casino Square — a 30-second walk. For a more relaxed vibe, try the Sun Casino at the Fairmont, which is more modern and less formal.',
      },
    ],
  };

  return (
    queriesMap[trip.id] || [
      {
        query: `Best restaurants near ${trip.basecamp_name}?`,
        response: `I found several highly-rated restaurants within walking distance of ${trip.basecamp_name} in ${trip.destination}. Based on your group\'s dining preferences, I\'d recommend checking the links tab for specific restaurant options that have been shared by the group.`,
      },
      {
        query: `Transportation tips for ${trip.destination}?`,
        response: `For getting around ${trip.destination}, the most convenient options depend on your group size. Ride-sharing apps work well for small groups, while private car services are more cost-effective for 4+ people. Check the Places tab for saved locations and estimated travel times between your planned stops.`,
      },
    ]
  );
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

    // ── Phase 1: Update Profile ──────────────────────────────────────────
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
    // Delete trips created by demo user (cascading handles members/messages for FK-linked tables)
    const tripIds = ALL_TRIPS.map(t => t.id);

    // Clean non-FK tables first
    for (const table of [
      'trip_chat_messages',
      'trip_events',
      'trip_tasks',
      'trip_payment_messages',
      'trip_polls',
      'trip_links',
      'ai_queries',
    ]) {
      await supabaseAdmin.from(table).delete().in('trip_id', tripIds);
    }
    await supabaseAdmin.from('trip_members').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trip_privacy_configs').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trip_admins').delete().in('trip_id', tripIds);
    await supabaseAdmin.from('trips').delete().in('id', tripIds);

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

    // ── Phase 4: Trip Members (handled by ensure_creator_is_member trigger) ──
    results.members = ALL_TRIPS.length;

    // ── Phase 5: Chat Messages ───────────────────────────────────────────
    const messageRows: Record<string, unknown>[] = [];
    for (const trip of ALL_TRIPS) {
      const msgs = getChatMessages(trip);
      const baseTime = new Date(trip.start_date).getTime();
      for (const msg of msgs) {
        messageRows.push({
          trip_id: trip.id,
          content: msg.content,
          author_name: 'Carlton Gold',
          user_id: DEMO_USER_ID,
          created_at: new Date(baseTime + msg.offset_hours * 3600000).toISOString(),
          updated_at: new Date(baseTime + msg.offset_hours * 3600000).toISOString(),
        });
      }
    }

    // Insert in batches of 50
    for (let i = 0; i < messageRows.length; i += 50) {
      const batch = messageRows.slice(i, i + 50);
      const { error } = await supabaseAdmin.from('trip_chat_messages').insert(batch);
      if (error) throw new Error(`Messages batch ${i} failed: ${error.message}`);
    }
    results.messages = messageRows.length;

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
    for (const trip of ALL_TRIPS) {
      const payments = getPayments(trip);
      for (const pmt of payments) {
        paymentRows.push({
          trip_id: trip.id,
          amount: pmt.amount,
          currency: pmt.currency,
          description: pmt.description,
          split_count: 4,
          split_participants: JSON.stringify([DEMO_USER_ID]),
          payment_methods: JSON.stringify(['venmo', 'zelle']),
          created_by: DEMO_USER_ID,
        });
      }
    }

    const { error: paymentsError } = await supabaseAdmin
      .from('trip_payment_messages')
      .insert(paymentRows);
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

    // ── Phase 11: AI Concierge Queries ───────────────────────────────────
    const aiRows: Record<string, unknown>[] = [];
    for (const trip of ALL_TRIPS) {
      const queries = getAiQueries(trip);
      const baseTime = new Date(trip.start_date).getTime();
      for (let i = 0; i < queries.length; i++) {
        aiRows.push({
          trip_id: trip.id,
          user_id: DEMO_USER_ID,
          query_text: queries[i].query,
          response_text: queries[i].response,
          source_count: 3,
          created_at: new Date(baseTime - (i + 1) * 86400000).toISOString(),
          metadata: JSON.stringify({
            model: 'gemini-2.0-flash',
            context_sources: ['chat', 'calendar', 'places'],
          }),
        });
      }
    }

    const { error: aiError } = await supabaseAdmin.from('ai_queries').insert(aiRows);
    if (aiError) throw new Error(`AI queries insert failed: ${aiError.message}`);
    results.ai_queries = aiRows.length;

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
