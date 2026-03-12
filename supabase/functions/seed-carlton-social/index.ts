import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CARLTON_ID = '11ba817d-f0c8-411d-9a75-b1bde6c4df4a';
const SEED_VERSION = 'carlton-social-v1';

// Deterministic UUIDs for mock users (c0000000-demo-0000-0000-00000000000X)
const MOCK_USERS = [
  {
    id: 'c0000000-demo-0000-0000-000000000001',
    first: 'Sarah',
    last: 'Chen',
    display: 'Sarah Chen',
    email: 'sarah.chen@mock.chravel.app',
  },
  {
    id: 'c0000000-demo-0000-0000-000000000002',
    first: 'Jordan',
    last: 'Alvarez',
    display: 'Jordan Alvarez',
    email: 'jordan.alvarez@mock.chravel.app',
  },
  {
    id: 'c0000000-demo-0000-0000-000000000003',
    first: 'Maya',
    last: 'Patel',
    display: 'Maya Patel',
    email: 'maya.patel@mock.chravel.app',
  },
  {
    id: 'c0000000-demo-0000-0000-000000000004',
    first: 'Marcus',
    last: 'Lee',
    display: 'Marcus Lee',
    email: 'marcus.lee@mock.chravel.app',
  },
  {
    id: 'c0000000-demo-0000-0000-000000000005',
    first: 'Nina',
    last: 'Brooks',
    display: 'Nina Brooks',
    email: 'nina.brooks@mock.chravel.app',
  },
  {
    id: 'c0000000-demo-0000-0000-000000000006',
    first: 'Priya',
    last: 'Shah',
    display: 'Priya Shah',
    email: 'priya.shah@mock.chravel.app',
  },
  {
    id: 'c0000000-demo-0000-0000-000000000007',
    first: 'Ethan',
    last: 'Walker',
    display: 'Ethan Walker',
    email: 'ethan.walker@mock.chravel.app',
  },
  {
    id: 'c0000000-demo-0000-0000-000000000008',
    first: 'Olivia',
    last: 'Carter',
    display: 'Olivia Carter',
    email: 'olivia.carter@mock.chravel.app',
  },
];

// Author index: -1 = Carlton, 0-7 = MOCK_USERS index
type Msg = { a: number; c: string; d: number; t?: string; se?: string };
type TaskDef = { title: string; creator: number; done?: boolean };
type PollDef = { question: string; options: string[]; creator: number };
type PayDef = {
  amount: number;
  desc: string;
  creator: number;
  currency?: string;
  participants: number[];
};

interface TripConfig {
  collaborators: number[];
  messages: Msg[];
  tasks?: TaskDef[];
  polls?: PollDef[];
  payments?: PayDef[];
}

// ─── PER-TRIP CONFIGURATIONS ─────────────────────────────────────────────────
const TRIP_CONFIGS: Record<string, TripConfig> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CONSUMER TRIPS
  // ═══════════════════════════════════════════════════════════════════════════
  'carlton-iceland-2026': {
    collaborators: [0, 1, 2], // Sarah, Jordan, Maya
    messages: [
      {
        a: -1,
        c: 'Trip is BOOKED. Iceland, Jan 8-14. Northern lights, hot springs, the works 🇮🇸',
        d: -21,
      },
      { a: 0, c: "YESSS finally!! I've been wanting to do this for years", d: -21 },
      { a: 1, c: 'Do we need special gear? I literally own zero cold weather stuff', d: -20 },
      { a: 2, c: "Thermals, waterproof jacket, good boots. I'll send a packing list", d: -20 },
      {
        a: -1,
        c: 'Hotel Rangá confirmed — they have a hot tub with direct aurora views 🌌',
        d: -18,
      },
      { a: 0, c: 'joined the trip', d: -17, t: 'system', se: 'member_joined' },
      { a: 1, c: 'joined the trip', d: -17, t: 'system', se: 'member_joined' },
      { a: 2, c: 'joined the trip', d: -17, t: 'system', se: 'member_joined' },
      { a: 0, c: 'I booked Icelandair, landing at KEF around 6am on the 8th', d: -15 },
      { a: 1, c: 'Same flight! We can split the rental car from the airport', d: -15 },
      {
        a: -1,
        c: 'Golden Circle day trip confirmed — Gullfoss, Geysir, Thingvellir. Driver picks us up 9am',
        d: -12,
      },
      { a: 2, c: 'Can we add the Silfra snorkeling? The tectonic plate rift is insane', d: -12 },
      { a: -1, c: 'Added it! Jan 9th morning slot', d: -12 },
      {
        a: -1,
        c: 'created a poll: "Ice cave tour — morning or afternoon?"',
        d: -10,
        t: 'system',
        se: 'poll_created',
      },
      { a: 0, c: 'Morning for sure, the light is better for photos', d: -10 },
      {
        a: 2,
        c: "updated the Trip's Basecamp to Hotel Rangá",
        d: -9,
        t: 'system',
        se: 'trip_base_camp_updated',
      },
      { a: 1, c: "Just bought crampons and hand warmers. I'm ready for -15°C", d: -8 },
      {
        a: 2,
        c: 'Don\'t forget to download the aurora forecast app — "My Aurora Forecast"',
        d: -7,
      },
      {
        a: -1,
        c: 'Jeep tour for Northern Lights booked for the 10th. Everyone ready by 8pm',
        d: -5,
      },
      { a: 0, c: "What's the restaurant situation? I want to try hákarl (fermented shark)", d: -4 },
      {
        a: 2,
        c: 'Grillið is supposed to be amazing for Icelandic lamb. Reserving for the 12th',
        d: -4,
      },
      { a: -1, c: "THE LIGHTS WERE INSANE TONIGHT. Best I've ever seen 🤯", d: 2, t: 'text' },
      { a: 1, c: "I can't stop staring at the sky. This is unreal", d: 2 },
      { a: 0, c: 'Check the group album — got some incredible timelapses', d: 2 },
      { a: 2, c: 'The Blue Lagoon tomorrow is going to be the perfect recovery day', d: 3 },
      { a: -1, c: 'Ice cave tour was otherworldly. The blue light inside is insane', d: 3 },
      { a: 1, c: 'Grillið dinner was 10/10. That lamb melted', d: 4 },
      { a: -1, c: 'Already planning to come back next winter. This trip set the bar 🇮🇸', d: 5 },
      { a: 0, c: "Best group trip we've done. Period.", d: 5 },
    ],
    tasks: [
      { title: 'Book rental car from KEF airport', creator: 1, done: true },
      { title: 'Download aurora forecast app', creator: 2, done: true },
      { title: 'Reserve dinner at Grillið', creator: 2, done: true },
      { title: 'Pack thermal layers and waterproof boots', creator: 0 },
    ],
    polls: [
      {
        question: 'Ice cave tour — morning or afternoon?',
        options: ['Morning (better light)', 'Afternoon (sleep in)'],
        creator: -1,
      },
    ],
    payments: [
      { amount: 320, desc: 'Rental car split (4 days)', creator: 1, participants: [-1, 0, 1, 2] },
      { amount: 180, desc: 'Northern Lights jeep tour', creator: -1, participants: [-1, 0, 1, 2] },
      { amount: 95, desc: 'Dinner at Grillið', creator: 2, participants: [-1, 0, 1, 2] },
    ],
  },

  'carlton-ibiza-2026': {
    collaborators: [1, 4, 6, 2], // Jordan, Nina, Ethan, Maya
    messages: [
      { a: -1, c: 'Turning 32 in Ibiza. Villa booked in Can Furnet, March 13-17 🎂🏝️', d: -28 },
      { a: 4, c: "BIRTHDAY TRIP!! I'm so in. What's the villa like?", d: -28 },
      { a: 6, c: 'Ibiza in March is perfect. Not too crowded, weather is ideal', d: -27 },
      { a: 1, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 4, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 2, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 1, c: "What's the dress code for the birthday dinner?", d: -22 },
      { a: 4, c: 'Smart casual? We should do Sublimotion or Lio for the big night', d: -22 },
      {
        a: -1,
        c: 'Lio Ibiza for the birthday dinner. Cabaret + dinner + party all in one',
        d: -20,
      },
      { a: 2, c: "Café del Mar sunset on the 14th? It's supposed to be magical", d: -18 },
      { a: 6, c: "Absolutely. I'll bring a portable speaker for the pre-game", d: -18 },
      {
        a: -1,
        c: 'created a poll: "Beach club day — Nikki Beach or Blue Marlin?"',
        d: -15,
        t: 'system',
        se: 'poll_created',
      },
      { a: 4, c: 'Blue Marlin every time. The vibes are unmatched', d: -15 },
      { a: 1, c: 'Nikki Beach has better food though', d: -14 },
      { a: -1, c: 'Villa has a private pool and views of Formentera. Wait til you see it', d: -12 },
      {
        a: 2,
        c: "I'm bringing a birthday cake from Can Caus bakery. Any dietary restrictions?",
        d: -10,
      },
      { a: 6, c: "Just make sure there's enough for seconds 🎂", d: -10 },
      {
        a: -1,
        c: 'added a payment: Villa Can Furnet (4 nights)',
        d: -8,
        t: 'system',
        se: 'payment_recorded',
      },
      { a: 4, c: 'Everyone bring white for the birthday dinner. Trust me on this', d: -5 },
      { a: 1, c: 'Landed in Ibiza! Villa is even better than the photos 🔥', d: 0 },
      { a: -1, c: 'Best birthday ever. Café del Mar sunset was everything', d: 1 },
      { a: 2, c: 'The paella at Es Boldadó was incredible. That cliffside view 😍', d: 2 },
      { a: 6, c: "Last night was legendary. That's all I'll say 😂", d: 3 },
      { a: 4, c: 'Happy birthday Carlton!! This trip was perfection ✨', d: 3 },
    ],
    tasks: [
      { title: 'Reserve birthday dinner at Lio Ibiza', creator: -1, done: true },
      { title: 'Arrange airport transfers', creator: 1 },
      { title: 'Buy birthday cake from Can Caus', creator: 2, done: true },
    ],
    polls: [
      {
        question: 'Beach club day — Nikki Beach or Blue Marlin?',
        options: ['Nikki Beach', 'Blue Marlin Ibiza'],
        creator: -1,
      },
    ],
    payments: [
      {
        amount: 2400,
        desc: 'Villa Can Furnet (4 nights)',
        creator: -1,
        participants: [-1, 1, 4, 6, 2],
      },
      { amount: 340, desc: 'Birthday dinner at Lio', creator: 4, participants: [-1, 1, 4, 6, 2] },
      {
        amount: 85,
        desc: 'Café del Mar drinks & snacks',
        creator: 6,
        participants: [-1, 1, 4, 6, 2],
      },
    ],
  },

  'carlton-tokyo-2025': {
    collaborators: [2, 0, 1], // Maya, Sarah, Jordan
    messages: [
      { a: -1, c: 'Tokyo Street Food Crawl is happening Aug 20-28! 🍜🇯🇵', d: -30 },
      { a: 2, c: 'OMG yes. Tsukiji outer market on day one is non-negotiable', d: -30 },
      { a: 0, c: 'joined the trip', d: -28, t: 'system', se: 'member_joined' },
      { a: 0, c: 'I need to hit every ramen spot in Shinjuku', d: -27 },
      { a: 1, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 1, c: "Are we doing the 7am tuna auction? I'm down to wake up early for that", d: -25 },
      { a: 2, c: 'Already made a spreadsheet of the top 40 food spots. Sharing in Files', d: -22 },
      { a: -1, c: 'Park Hyatt Tokyo confirmed. Lost in Translation vibes 🥃', d: -20 },
      { a: 0, c: 'The New York Bar at Park Hyatt for cocktails is a MUST', d: -20 },
      {
        a: -1,
        c: 'created a poll: "Shibuya Crossing vs Akihabara for first afternoon?"',
        d: -18,
        t: 'system',
        se: 'poll_created',
      },
      { a: 2, c: 'Shibuya first — we need the iconic crossing photo at sunset', d: -18 },
      { a: 1, c: 'Then izakaya hopping in Golden Gai that night 🍶', d: -17 },
      {
        a: -1,
        c: "updated the Trip's Basecamp",
        d: -15,
        t: 'system',
        se: 'trip_base_camp_updated',
      },
      {
        a: 2,
        c: 'Day 3 plan: Teamlab Borderless in the morning, then Harajuku street food',
        d: -12,
      },
      { a: 0, c: 'Can we squeeze in a day trip to Hakone for onsens?', d: -10 },
      { a: -1, c: 'Added Hakone to Day 5. The open-air hot springs overlooking Fuji 🗻', d: -10 },
      { a: 1, c: 'Just tried to learn chopstick etiquette on YouTube. Wish me luck', d: -5 },
      { a: 2, c: "Pro tip: don't stick chopsticks upright in rice. It's a funeral thing", d: -5 },
      { a: -1, c: 'Landed in Tokyo. The energy here is unmatched', d: 0 },
      { a: 0, c: 'First ramen at Fuunji in Shinjuku — the tsukemen is INSANE', d: 0 },
      { a: 2, c: 'Tsukiji was everything. That tamagoyaki still haunts me', d: 1 },
      { a: 1, c: 'Golden Gai last night was wild. Found a bar that seats 6 people total', d: 2 },
      { a: -1, c: 'Best sushi of my life at Sukiyabashi Jiro. Not even close', d: 4 },
      { a: 2, c: 'Hakone was perfection. Private onsen with Mt Fuji views 😭', d: 5 },
      { a: 0, c: 'I never want to leave. Can we extend?', d: 7 },
    ],
    tasks: [
      { title: 'Book Teamlab Borderless tickets', creator: 2, done: true },
      { title: 'Reserve Hakone onsen day trip', creator: 0, done: true },
      { title: 'Download Google Translate for Japanese', creator: 1 },
      { title: 'Get Suica transit cards at airport', creator: -1, done: true },
    ],
    polls: [
      {
        question: 'First afternoon — Shibuya or Akihabara?',
        options: ['Shibuya Crossing', 'Akihabara', 'Harajuku'],
        creator: -1,
      },
    ],
    payments: [
      {
        amount: 120,
        desc: 'Suica transit cards (4 loaded)',
        creator: -1,
        participants: [-1, 2, 0, 1],
      },
      {
        amount: 280,
        desc: 'Hakone day trip + private onsen',
        creator: 0,
        participants: [-1, 2, 0, 1],
      },
      { amount: 65, desc: 'Golden Gai bar crawl', creator: 1, participants: [-1, 2, 0, 1] },
    ],
  },

  'carlton-amalfi-2026': {
    collaborators: [0, 4, 2], // Sarah, Nina, Maya
    messages: [
      {
        a: -1,
        c: 'Amalfi Coast, June 20-27. Positano, Ravello, limoncello on the cliffs 🍋🇮🇹',
        d: -25,
      },
      { a: 4, c: "I've been DREAMING about Positano. The colors, the water, everything", d: -25 },
      { a: 0, c: 'joined the trip', d: -24, t: 'system', se: 'member_joined' },
      { a: 0, c: "Hotel Le Sirenuse?? That's the most iconic hotel on the coast", d: -24 },
      { a: 2, c: 'joined the trip', d: -23, t: 'system', se: 'member_joined' },
      { a: 4, c: 'joined the trip', d: -23, t: 'system', se: 'member_joined' },
      { a: 2, c: 'I need to eat my weight in pasta and gelato. No regrets', d: -22 },
      { a: -1, c: 'Private boat day along the coast confirmed for June 22nd ⛵', d: -18 },
      { a: 4, c: 'Can the boat stop at the grotto? Li Galli islands?', d: -18 },
      { a: 0, c: 'Yes! And we need to swim at Fiordo di Furore', d: -17 },
      {
        a: -1,
        c: 'created a poll: "Ravello concert — classical or jazz night?"',
        d: -15,
        t: 'system',
        se: 'poll_created',
      },
      { a: 2, c: 'Classical at Villa Rufolo. The sunset over the stage is iconic', d: -15 },
      {
        a: 4,
        c: 'Adding Da Adolfo beach restaurant to the list. You take a boat there 🚤',
        d: -12,
      },
      { a: 0, c: 'Dinner at La Sponda in Positano — 400 candles light the restaurant', d: -10 },
      { a: -1, c: 'Booked it. June 24th, 8pm', d: -10 },
      {
        a: 2,
        c: "I'm going to learn to make limoncello from a local. Anyone want to join?",
        d: -8,
      },
      { a: 4, c: "Obviously yes. That's going to be the best souvenir", d: -8 },
      { a: -1, c: "The water in Positano is the bluest I've ever seen", d: 1 },
      { a: 0, c: 'Boat day was magical. We found a hidden cove near Praiano', d: 2 },
      { a: 2, c: 'La Sponda dinner was a fever dream. Those candles everywhere 🕯️', d: 4 },
      { a: 4, c: 'The Path of the Gods hike today — views were absolutely insane', d: 5 },
      { a: -1, c: 'Italy never misses. This coast is pure magic ✨', d: 6 },
    ],
    tasks: [
      { title: 'Book private boat charter for coast tour', creator: -1, done: true },
      { title: 'Reserve dinner at La Sponda', creator: 0, done: true },
      { title: 'Arrange limoncello making class', creator: 2 },
    ],
    polls: [
      {
        question: 'Ravello concert — classical or jazz night?',
        options: ['Classical at Villa Rufolo', 'Jazz evening'],
        creator: -1,
      },
    ],
    payments: [
      {
        amount: 480,
        desc: 'Private boat charter (full day)',
        creator: -1,
        participants: [-1, 0, 4, 2],
      },
      { amount: 220, desc: 'La Sponda dinner', creator: 0, participants: [-1, 0, 4, 2] },
    ],
  },

  'carlton-bali-2026': {
    collaborators: [1, 2, 6], // Jordan, Maya, Ethan
    messages: [
      { a: -1, c: 'Bali Surf Retreat locked in. Aug 5-14 🏄‍♂️🌴', d: -30 },
      { a: 1, c: "FINALLY. I've been watching Canggu surf videos for months", d: -30 },
      { a: 6, c: 'joined the trip', d: -28, t: 'system', se: 'member_joined' },
      { a: 6, c: 'Is COMO Uma Canggu the spot? That place looks insane', d: -28 },
      { a: 2, c: 'joined the trip', d: -27, t: 'system', se: 'member_joined' },
      { a: 1, c: 'joined the trip', d: -27, t: 'system', se: 'member_joined' },
      { a: 2, c: 'I want to do sunrise yoga at Uluwatu temple', d: -25 },
      { a: -1, c: 'Surf lessons booked for day 2 at Echo Beach. Beginner-friendly', d: -20 },
      { a: 1, c: 'Beginner? Speak for yourself 😂 I want the big waves', d: -20 },
      { a: 6, c: 'What about a rice terrace hike? Tegalalang is like 45 min from Canggu', d: -18 },
      {
        a: -1,
        c: 'created a poll: "Day trip — Ubud monkey forest or Nusa Penida island?"',
        d: -15,
        t: 'system',
        se: 'poll_created',
      },
      { a: 2, c: 'Nusa Penida! Kelingking Beach is the most photogenic spot on earth', d: -15 },
      { a: 1, c: 'Monkey forest. I need that video content 🐒', d: -14 },
      { a: -1, c: 'We can do both honestly. Ubud on day 4, Nusa Penida on day 6', d: -14 },
      {
        a: 6,
        c: 'Found an amazing villa with a private pool in Canggu for overflow nights',
        d: -12,
      },
      { a: 2, c: 'Spa day at Fivelements is supposed to be life-changing', d: -10 },
      { a: -1, c: 'Scooter rentals for the week — only $5/day each', d: -8 },
      { a: 1, c: 'Landed in Bali. The humidity hit me like a wall 😅', d: 0 },
      { a: -1, c: "First surf session was humbling. Echo Beach doesn't play around", d: 1 },
      { a: 2, c: 'Ubud was magical. The rice terraces at golden hour 🌾', d: 4 },
      { a: 6, c: 'Sunset at Uluwatu Temple with the kecak fire dance was surreal', d: 5 },
      { a: 1, c: 'Nusa Penida day trip was worth every second of that bumpy boat ride', d: 6 },
      { a: -1, c: 'This trip changed something in me. Bali hits different 🙏', d: 8 },
    ],
    tasks: [
      { title: 'Book surf lessons at Echo Beach', creator: -1, done: true },
      { title: 'Arrange Nusa Penida boat transfer', creator: 1 },
      { title: 'Reserve spa day at Fivelements', creator: 2, done: true },
    ],
    polls: [
      {
        question: 'Day trip — Ubud monkey forest or Nusa Penida?',
        options: ['Ubud Monkey Forest', 'Nusa Penida Island', 'Both!'],
        creator: -1,
      },
    ],
    payments: [
      { amount: 200, desc: 'Surf lessons (3 sessions)', creator: -1, participants: [-1, 1, 2, 6] },
      { amount: 60, desc: 'Scooter rentals for the week', creator: 1, participants: [-1, 1, 2, 6] },
      { amount: 150, desc: 'Nusa Penida boat + guide', creator: 1, participants: [-1, 1, 2, 6] },
    ],
  },

  'carlton-greek-islands-2026': {
    collaborators: [0, 1, 4, 2], // Sarah, Jordan, Nina, Maya
    messages: [
      { a: -1, c: 'Greek Island Hopper is go! Santorini → Mykonos → Paros, Sep 10-20 🇬🇷', d: -25 },
      { a: 0, c: "Three islands in 10 days? That's the dream", d: -25 },
      { a: 4, c: 'joined the trip', d: -24, t: 'system', se: 'member_joined' },
      { a: 4, c: 'Santorini sunsets are about to break Instagram', d: -24 },
      { a: 1, c: 'joined the trip', d: -23, t: 'system', se: 'member_joined' },
      { a: 2, c: 'joined the trip', d: -23, t: 'system', se: 'member_joined' },
      { a: 0, c: 'joined the trip', d: -23, t: 'system', se: 'member_joined' },
      { a: 2, c: "Fresh seafood on every island. I'm already drooling", d: -22 },
      {
        a: -1,
        c: 'Canaves Oia Suites in Santorini is locked. Cave suite with caldera views',
        d: -20,
      },
      { a: 1, c: 'What about Mykonos accommodations?', d: -19 },
      { a: 4, c: 'I found a villa near Psarou Beach. Pool + ocean views', d: -18 },
      {
        a: -1,
        c: 'created a poll: "Catamaran sunset cruise — Santorini or Mykonos?"',
        d: -16,
        t: 'system',
        se: 'poll_created',
      },
      { a: 0, c: 'Santorini catamaran with the caldera backdrop. No question', d: -16 },
      {
        a: 2,
        c: 'Paros is supposed to be the food island. Naoussa village is all seafood tavernas',
        d: -14,
      },
      { a: 1, c: "Ferry schedule between islands is tight. I'll book SeaJets", d: -12 },
      { a: -1, c: 'Oia sunset was even better in person. That famous blue dome church 🔵', d: 1 },
      { a: 4, c: 'Mykonos windmills at golden hour — unreal photos', d: 4 },
      {
        a: 2,
        c: "The octopus at that taverna in Naoussa was the best thing I've eaten all year",
        d: 7,
      },
      { a: 1, c: 'Paros was the sleeper hit. Way less touristy, way more authentic', d: 8 },
      { a: 0, c: 'This trip made me want to move to Greece permanently', d: 9 },
    ],
    tasks: [
      { title: 'Book inter-island ferry tickets', creator: 1, done: true },
      { title: 'Reserve catamaran sunset cruise', creator: -1, done: true },
      { title: 'Research Paros restaurant guide', creator: 2 },
    ],
    polls: [
      {
        question: 'Catamaran sunset cruise — Santorini or Mykonos?',
        options: ['Santorini (caldera views)', 'Mykonos (party vibes)'],
        creator: -1,
      },
    ],
    payments: [
      {
        amount: 360,
        desc: 'Inter-island ferry tickets (3 ferries)',
        creator: 1,
        participants: [-1, 0, 1, 4, 2],
      },
      { amount: 450, desc: 'Catamaran sunset cruise', creator: -1, participants: [-1, 0, 1, 4, 2] },
    ],
  },

  'carlton-mexico-city-2025': {
    collaborators: [2, 1, 6], // Maya, Jordan, Ethan
    messages: [
      {
        a: -1,
        c: 'CDMX Art Weekend, Nov 14-17. Gallery openings, street art, tacos al pastor 🇲🇽',
        d: -20,
      },
      { a: 2, c: "Mexico City food scene is top 3 in the world. I'm SO ready", d: -20 },
      { a: 1, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 2, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 6, c: 'Mezcal tastings in Roma Norte are a must', d: -17 },
      { a: 1, c: 'Is Pujol still impossible to get into?', d: -16 },
      { a: 2, c: 'Got a res at Contramar instead. The tostadas de atún are legendary', d: -15 },
      { a: -1, c: 'Casa Habita in Roma Norte confirmed. Walking distance to everything', d: -14 },
      { a: -1, c: 'Wynwood-style street art tour in Coyoacán arranged for Day 2', d: -10 },
      { a: 6, c: "Can we hit a lucha libre match? It's peak CDMX culture", d: -8 },
      { a: 1, c: 'Arena México on Friday night. I already checked, tickets are cheap', d: -8 },
      { a: 2, c: 'Frida Kahlo museum is a must. Book ahead — it sells out', d: -6 },
      { a: -1, c: 'Best tacos al pastor of my life at El Huequito', d: 0 },
      { a: 2, c: 'Contramar lived up to the hype. That red/green snapper 🐟', d: 1 },
      { a: 6, c: 'The mezcal bar in Roma Norte — I lost count after the third flight', d: 2 },
      { a: 1, c: "Lucha libre was CHAOS. Best $10 I've ever spent", d: 2 },
      { a: -1, c: 'The art scene here is world class. Galleries everywhere in Condesa', d: 3 },
    ],
    tasks: [
      { title: 'Book Frida Kahlo museum tickets', creator: 2, done: true },
      { title: 'Get lucha libre tickets at Arena México', creator: 1, done: true },
    ],
    payments: [
      { amount: 45, desc: 'Mezcal tasting flight', creator: 6, participants: [-1, 2, 1, 6] },
      { amount: 85, desc: 'Contramar dinner', creator: 2, participants: [-1, 2, 1, 6] },
    ],
  },

  'carlton-miami-f1-consumer': {
    collaborators: [3, 1, 6], // Marcus, Jordan, Ethan
    messages: [
      { a: -1, c: 'Miami F1 Grand Prix with the boys! May 1-5 🏎️🔥', d: -30 },
      { a: 3, c: 'Paddock passes secured? Please say yes', d: -30 },
      { a: 1, c: 'joined the trip', d: -28, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -28, t: 'system', se: 'member_joined' },
      { a: 3, c: 'joined the trip', d: -28, t: 'system', se: 'member_joined' },
      { a: 1, c: "Faena Hotel?? That's the most baller move possible", d: -27 },
      { a: 6, c: 'Are we doing the rooftop watch party at E11EVEN?', d: -25 },
      { a: -1, c: "Paddock passes confirmed for Sunday. We're IN", d: -22 },
      { a: 3, c: 'I want to see the McLaren garage up close. Lando energy only', d: -20 },
      {
        a: -1,
        c: 'created a poll: "Friday night — LIV or E11EVEN?"',
        d: -18,
        t: 'system',
        se: 'poll_created',
      },
      { a: 1, c: 'LIV is the classic move. Table service?', d: -18 },
      { a: 6, c: "E11EVEN never closes. That's the play", d: -17 },
      { a: 3, c: 'Pre-race party on Saturday at the Hard Rock pool. Free with our passes', d: -12 },
      { a: -1, c: 'The grid walk was surreal. Stood 10 feet from the starting line', d: 1 },
      { a: 3, c: 'The sound of those engines in person is completely different from TV', d: 1 },
      { a: 1, c: 'South Beach nightlife after race day was elite', d: 2 },
      { a: 6, c: "Best weekend of the year. We're doing this every year", d: 3 },
      { a: -1, c: 'Already looking at Monaco GP tickets for next month 👀', d: 3 },
    ],
    tasks: [
      { title: 'Secure paddock passes for Sunday', creator: -1, done: true },
      { title: 'Book dinner reservation at Carbone', creator: 3 },
    ],
    polls: [
      {
        question: 'Friday night — LIV or E11EVEN?',
        options: ['LIV Miami', 'E11EVEN', "Both (we don't sleep)"],
        creator: -1,
      },
    ],
    payments: [
      { amount: 1200, desc: 'Paddock passes (4x)', creator: -1, participants: [-1, 3, 1, 6] },
      { amount: 280, desc: 'LIV table service split', creator: 1, participants: [-1, 3, 1, 6] },
    ],
  },

  'carlton-nola-jazz-2025': {
    collaborators: [6, 2, 1], // Ethan, Maya, Jordan
    messages: [
      {
        a: -1,
        c: 'New Orleans Jazz Weekend Oct 17-20. Frenchmen St, beignets, live jazz 🎺',
        d: -22,
      },
      { a: 6, c: "NOLA is the music capital. I'm bringing my portable recording rig", d: -22 },
      { a: 2, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 1, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 2, c: "I need a po'boy from Domilise's and a muffuletta from Central Grocery", d: -18 },
      { a: 1, c: "Is Preservation Hall still doing shows? That's bucket list stuff", d: -16 },
      { a: -1, c: 'Ace Hotel in the Warehouse District confirmed. Great location', d: -14 },
      {
        a: 6,
        c: 'Spotted Cat on Frenchmen St is where the real jazz happens. No cover, just vibes',
        d: -12,
      },
      {
        a: -1,
        c: 'created a poll: "Swamp tour or cemetery tour?"',
        d: -10,
        t: 'system',
        se: 'poll_created',
      },
      { a: 2, c: 'Cemetery tour at St. Louis #1 — the history is incredible', d: -10 },
      { a: -1, c: "Café du Monde beignets at midnight. That's the move", d: 0 },
      { a: 6, c: 'Frenchmen St last night was magic. Sat in on a jam session at DBA', d: 1 },
      { a: 2, c: "The gumbo at Dooky Chase's was transcendent", d: 2 },
      { a: 1, c: "Late night po'boys are the best part of NOLA. Fight me", d: 2 },
      { a: -1, c: 'This city has soul like nowhere else 🎷', d: 3 },
    ],
    tasks: [
      { title: 'Book Preservation Hall show tickets', creator: 6, done: true },
      { title: 'Reserve swamp tour for Saturday', creator: 1 },
    ],
    payments: [
      { amount: 60, desc: 'Preservation Hall tickets', creator: 6, participants: [-1, 6, 2, 1] },
      { amount: 45, desc: 'Swamp tour', creator: 1, participants: [-1, 6, 2, 1] },
    ],
  },

  'carlton-nba-summer-2025': {
    collaborators: [3, 1], // Marcus, Jordan
    messages: [
      {
        a: -1,
        c: 'NBA Summer League Vegas Jul 11-15. Scouting rookies and pool parties 🏀',
        d: -20,
      },
      { a: 3, c: "Cooper Flagg in person! I've been waiting for this", d: -20 },
      { a: 1, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 3, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 1, c: 'Encore at Wynn is perfect. Right on the strip', d: -17 },
      { a: 3, c: 'Courtside seats for the first game?', d: -15 },
      { a: -1, c: 'Got courtside for 3 games. The rest we can watch from the suite', d: -14 },
      { a: 1, c: 'Pool party at Encore Beach Club between games is the play', d: -12 },
      { a: -1, c: 'The rookie class this year is stacked. At least 5 guys worth watching', d: -8 },
      { a: 3, c: "Don't forget the sneaker convention at the Convention Center", d: -6 },
      { a: -1, c: 'Flagg is the real deal. The kid is special', d: 0 },
      { a: 3, c: "Best Summer League crowd I've seen. Electric atmosphere", d: 1 },
      { a: 1, c: 'The pool party to game pipeline is undefeated', d: 2 },
      { a: -1, c: 'This is the best sports weekend of the summer. No debate', d: 3 },
    ],
    tasks: [
      { title: 'Buy courtside tickets for opening games', creator: -1, done: true },
      { title: 'Book Encore Beach Club cabana', creator: 1 },
    ],
    payments: [
      { amount: 450, desc: 'Courtside seats (3 games)', creator: -1, participants: [-1, 3, 1] },
      { amount: 180, desc: 'Encore Beach Club cabana', creator: 1, participants: [-1, 3, 1] },
    ],
  },

  'carlton-sxsw-2025': {
    collaborators: [5, 6, 1], // Priya, Ethan, Jordan
    messages: [
      { a: -1, c: "SXSW Austin 2025, Mar 7-15. Panels, parties, 6th Street. Let's go 🤘", d: -25 },
      { a: 5, c: "I'm on two panels this year! AI in creator tools + monetization", d: -25 },
      { a: 6, c: 'joined the trip', d: -23, t: 'system', se: 'member_joined' },
      { a: 1, c: 'joined the trip', d: -23, t: 'system', se: 'member_joined' },
      { a: 5, c: 'joined the trip', d: -23, t: 'system', se: 'member_joined' },
      { a: 6, c: 'The music showcases are the best part. Secret shows everywhere', d: -22 },
      { a: 1, c: 'Driskill Hotel is the move. Historic and right on 6th', d: -20 },
      { a: -1, c: 'Film premieres on Day 1 — any must-watches?', d: -18 },
      { a: 5, c: 'The AI documentary looks incredible. Already RSVPed', d: -17 },
      { a: 6, c: "Franklin BBQ line at 7am. Who's with me?", d: -12 },
      { a: 1, c: "I'll camp out. That brisket is worth any wait", d: -12 },
      { a: -1, c: 'Day 2 — the panels on creator economy were fire. So many connections', d: 1 },
      { a: 5, c: 'My panel went amazing. Full room, great Q&A after', d: 2 },
      { a: 6, c: 'Secret Flume set at the Mohawk last night. Tiny venue, massive energy', d: 3 },
      { a: 1, c: 'Franklin BBQ lived up to the hype. 4 hour wait, zero regrets', d: 4 },
      { a: -1, c: 'SXSW never disappoints. Austin is special', d: 7 },
    ],
    tasks: [
      { title: 'RSVP for AI documentary premiere', creator: 5, done: true },
      { title: 'Get Franklin BBQ early morning slot', creator: 6 },
    ],
    payments: [
      { amount: 85, desc: 'SXSW badge upgrade', creator: -1, participants: [-1, 5, 6, 1] },
      { amount: 42, desc: 'Franklin BBQ feast', creator: 6, participants: [-1, 5, 6, 1] },
    ],
  },

  'carlton-toronto-2026': {
    collaborators: [2, 6, 1], // Maya, Ethan, Jordan
    messages: [
      {
        a: -1,
        c: 'Toronto Food & Music Weekend Apr 10-14. Kensington Market, CN Tower, OVO Fest vibes 🇨🇦',
        d: -20,
      },
      { a: 2, c: "Toronto's food scene is so underrated. St. Lawrence Market is elite", d: -20 },
      { a: 6, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 1, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 2, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 6, c: "Drake's hometown. We need to hit all the OVO spots", d: -17 },
      { a: 1, c: "CN Tower dinner — EdgeWalk is insane if anyone's brave enough", d: -15 },
      { a: -1, c: 'Drake Hotel in Queen West confirmed. Perfect for exploring the city', d: -14 },
      {
        a: 2,
        c: 'Kensington Market food crawl is happening Day 1. Jerk chicken, empanadas, everything',
        d: -12,
      },
      { a: 6, c: "There's a jazz club in the Distillery District that's incredible", d: -10 },
      {
        a: -1,
        c: 'created a poll: "Raptors game or Blue Jays game?"',
        d: -8,
        t: 'system',
        se: 'poll_created',
      },
      { a: 1, c: 'Raptors 100%. Scotiabank Arena atmosphere is electric', d: -8 },
      { a: 2, c: "Patty from Randy's is the best $3 you'll spend in Toronto", d: 0 },
      { a: 6, c: 'Distillery District vibes are immaculate. The cobblestone, the galleries', d: 1 },
      { a: 1, c: "CN Tower EdgeWalk was the most terrifying thing I've ever done", d: 2 },
      { a: -1, c: "Toronto surprised me. Such a vibrant city. We'll be back", d: 3 },
    ],
    tasks: [
      { title: 'Book CN Tower dinner reservation', creator: 1, done: true },
      { title: 'Get Raptors game tickets', creator: -1 },
    ],
    polls: [
      {
        question: 'Raptors game or Blue Jays game?',
        options: ['Raptors (basketball)', 'Blue Jays (baseball)'],
        creator: -1,
      },
    ],
    payments: [
      { amount: 120, desc: 'Raptors game tickets', creator: -1, participants: [-1, 2, 6, 1] },
      { amount: 65, desc: 'CN Tower dinner', creator: 1, participants: [-1, 2, 6, 1] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRO TRIPS
  // ═══════════════════════════════════════════════════════════════════════════
  'carlton-chappelle-chicago': {
    collaborators: [7, 3, 6], // Olivia, Marcus, Ethan
    messages: [
      {
        a: -1,
        c: 'Chappelle Chicago stop confirmed. Sep 18-21. Load-in, soundcheck, show night 🎤',
        d: -18,
      },
      { a: 7, c: "I'll handle the production schedule. What venue?", d: -18 },
      { a: 3, c: 'joined the trip', d: -16, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -16, t: 'system', se: 'member_joined' },
      { a: 7, c: 'joined the trip', d: -16, t: 'system', se: 'member_joined' },
      { a: 3, c: 'Chicago Athletic Association for the hotel. Right on Michigan Ave', d: -15 },
      { a: 7, c: 'Load-in starts at 10am Thursday. All crew report to loading dock', d: -12 },
      { a: 6, c: 'Sound check moved to 2:30pm due to venue scheduling', d: -10 },
      { a: -1, c: 'Green room requirements sent to venue. They confirmed everything', d: -8 },
      { a: 7, c: "updated the Trip's Basecamp", d: -7, t: 'system', se: 'trip_base_camp_updated' },
      { a: 3, c: 'Security briefing at 4pm. All access badges distributed at the door', d: -5 },
      { a: -1, c: 'Show sold out. 3,200 seats. The energy is going to be insane', d: -3 },
      { a: 7, c: 'Run of show finalized. Opening act at 7, Dave at 8:15', d: -2 },
      { a: 6, c: "Sound levels perfect after rehearsal. We're locked", d: -1 },
      { a: -1, c: 'Show was INCREDIBLE. Dave did 90 minutes. Standing ovation', d: 0 },
      { a: 3, c: 'Settlement meeting with venue at 11pm post-show', d: 0 },
      { a: 7, c: 'Clean wrap. No incidents. Great show, team 👏', d: 1 },
    ],
    tasks: [
      { title: 'Finalize production run of show', creator: 7, done: true },
      { title: 'Distribute all-access badges', creator: 3, done: true },
      { title: 'Confirm green room requirements with venue', creator: -1, done: true },
    ],
    payments: [
      { amount: 850, desc: 'Crew hotel block (3 rooms)', creator: -1, participants: [-1, 7, 3, 6] },
      { amount: 120, desc: 'Crew dinner post-show', creator: 3, participants: [-1, 7, 3, 6] },
    ],
  },

  'carlton-creator-conf-nyc': {
    collaborators: [5, 4, 0], // Priya, Nina, Sarah
    messages: [
      {
        a: -1,
        c: 'Creator Economy Conference NYC, Aug 20-23. Keynote, brand workshops, after-party 📱',
        d: -22,
      },
      { a: 5, c: "I'm moderating the AI panel! So excited for this", d: -22 },
      { a: 4, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 0, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 5, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 4, c: 'The Standard High Line for hotel? That rooftop is everything', d: -19 },
      { a: 0, c: "I'll coordinate the brand meeting schedule. How many partner meetings?", d: -17 },
      { a: -1, c: "Six confirmed meetings. I'll share the deck in Files", d: -17 },
      { a: 5, c: 'Panel prep call on Tuesday? I want to run through talking points', d: -14 },
      { a: -1, c: 'Keynote slides are 80% done. The monetization data is 🔥', d: -10 },
      { a: 4, c: "What's the dress code for the after-party at The Standard?", d: -8 },
      { a: 0, c: 'Smart casual for panels, dress up for the rooftop party', d: -8 },
      {
        a: -1,
        c: 'created a poll: "After-party DJ — house or hip-hop set?"',
        d: -6,
        t: 'system',
        se: 'poll_created',
      },
      { a: 5, c: "House music. It's a networking event, not a club", d: -6 },
      { a: -1, c: 'Keynote went perfectly. Standing room only. The Q&A ran 20 min over', d: 0 },
      { a: 5, c: 'AI panel was incredible. So many follow-up conversations happening', d: 1 },
      { a: 4, c: 'The brand workshops generated 3 new partnership leads', d: 2 },
      { a: 0, c: 'After-party on the rooftop was the highlight. Such a great crowd', d: 2 },
    ],
    tasks: [
      { title: 'Finalize keynote presentation slides', creator: -1, done: true },
      { title: 'Schedule brand partner meetings', creator: 0, done: true },
      { title: 'Prep AI panel talking points', creator: 5, done: true },
    ],
    payments: [
      { amount: 320, desc: 'Conference VIP passes (4x)', creator: -1, participants: [-1, 5, 4, 0] },
      {
        amount: 180,
        desc: 'After-party venue contribution',
        creator: 4,
        participants: [-1, 5, 4, 0],
      },
    ],
  },

  'carlton-dj-tour-berlin': {
    collaborators: [6, 4, 3], // Ethan, Nina, Marcus
    messages: [
      { a: -1, c: 'Berlin DJ Tour Stop Feb 12-16. Berghain, Tresor, studio sessions 🎧🇩🇪', d: -20 },
      { a: 6, c: 'Berghain. Tresor. In the same week. This is a dream lineup', d: -20 },
      { a: 4, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 3, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 4, c: 'Hotel Zoo Berlin is perfect. Kurfürstendamm location', d: -17 },
      { a: 6, c: 'Studio session with the Berlin producers is Thursday afternoon', d: -14 },
      { a: -1, c: 'Tresor set is confirmed for Friday night. 1am-3am slot', d: -12 },
      { a: 3, c: "I'll handle the guest list and VIP coordination", d: -10 },
      { a: 6, c: "Berghain afterparty slot confirmed for Saturday. We're on at 4am", d: -8 },
      {
        a: 4,
        c: 'Content crew arriving Thursday. Need backstage access for all three venues',
        d: -6,
      },
      { a: -1, c: "updated the Trip's Basecamp", d: -5, t: 'system', se: 'trip_base_camp_updated' },
      { a: -1, c: 'Tresor set was FIRE. The crowd energy at 2am was insane', d: 1 },
      { a: 6, c: 'Studio session produced two tracks. Both potential singles', d: 2 },
      { a: 3, c: 'Berghain was everything. 6 hours straight. No phones, pure music', d: 3 },
      { a: 4, c: 'The content from all three nights is incredible. Editing now', d: 3 },
    ],
    tasks: [
      { title: 'Confirm Tresor set time and requirements', creator: -1, done: true },
      { title: 'Arrange backstage access for content crew', creator: 4 },
      { title: 'Schedule studio session with local producers', creator: 6, done: true },
    ],
    payments: [
      {
        amount: 400,
        desc: 'Studio session booking (6 hrs)',
        creator: 6,
        participants: [-1, 6, 4, 3],
      },
      {
        amount: 150,
        desc: 'Guest list coordination + VIP',
        creator: 3,
        participants: [-1, 6, 4, 3],
      },
    ],
  },

  'carlton-fashion-paris': {
    collaborators: [4, 2, 7], // Nina, Maya, Olivia
    messages: [
      {
        a: -1,
        c: 'Paris Fashion Week Coverage Jun 28 - Jul 3. Jacquemus, LV backstage, Palais de Tokyo 🇫🇷',
        d: -22,
      },
      { a: 4, c: 'Jacquemus front row?? I literally cannot breathe', d: -22 },
      { a: 2, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 7, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 4, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 7, c: "I'll coordinate the video crew. How many shows are we covering?", d: -19 },
      { a: -1, c: 'Five shows total. Jacquemus, LV, Dior, Valentino, and Off-White', d: -18 },
      { a: 4, c: 'Le Marais hotel is perfect. Walking distance to showrooms', d: -16 },
      {
        a: 2,
        c: 'Content shoot locations scouted — Palais de Tokyo and Tuileries Gardens',
        d: -14,
      },
      { a: -1, c: 'Backstage access confirmed for LV and Jacquemus', d: -12 },
      { a: 7, c: 'Camera gear arriving Tuesday. Two photographers, one videographer', d: -10 },
      { a: 4, c: "Outfits planned for each show. I'll share the mood board", d: -8 },
      { a: -1, c: 'Jacquemus was a masterpiece. The set design was out of this world', d: 0 },
      { a: 4, c: 'LV backstage was surreal. Got photos with the creative director', d: 1 },
      { a: 2, c: "Palais de Tokyo content shoot — the lighting was *chef's kiss*", d: 2 },
      { a: 7, c: 'All five shows covered. 400+ photos, 12 video pieces. We crushed it', d: 4 },
    ],
    tasks: [
      { title: 'Confirm backstage access credentials', creator: -1, done: true },
      { title: 'Scout content shoot locations', creator: 2, done: true },
      { title: 'Coordinate camera crew schedule', creator: 7, done: true },
    ],
    payments: [
      { amount: 600, desc: 'Camera crew (3 days)', creator: 7, participants: [-1, 4, 2, 7] },
      { amount: 200, desc: 'Show access passes', creator: -1, participants: [-1, 4, 2, 7] },
    ],
  },

  'carlton-film-vancouver': {
    collaborators: [7, 3, 0], // Olivia, Marcus, Sarah
    messages: [
      {
        a: -1,
        c: 'Vancouver film shoot Apr 22-27. Scouting, crew coordination, post-production 🎬',
        d: -20,
      },
      { a: 7, c: "I'll run the production schedule. What's the brief?", d: -20 },
      { a: 3, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 0, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 7, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 3, c: 'Fairmont Hotel Vancouver is locked. Great for the client meetings', d: -17 },
      { a: 0, c: "Location scouting day is Tuesday. I'll prep the shot list", d: -15 },
      { a: 7, c: 'Crew call sheet sent. 14 people, 3 days of principal photography', d: -12 },
      { a: -1, c: 'Gastown and Stanley Park are our primary locations', d: -10 },
      { a: 0, c: "Permits secured for both locations. We're clear for all 3 days", d: -8 },
      { a: 7, c: "updated the Trip's Basecamp", d: -7, t: 'system', se: 'trip_base_camp_updated' },
      { a: 3, c: 'Equipment rental confirmed. Arri Alexa + full grip package', d: -5 },
      { a: -1, c: 'Day 1 wrap. Gastown footage looks incredible. Magic hour was perfect', d: 0 },
      { a: 7, c: 'On schedule. Day 2 is Stanley Park. Sunrise call at 5am', d: 0 },
      { a: 0, c: 'Stanley Park shots exceeded expectations. The forest scenes are stunning', d: 1 },
      { a: -1, c: "That's a wrap! Post-production review on the flight home", d: 3 },
      { a: 7, c: 'Clean shoot. Under budget, on schedule. Great work everyone 🎬', d: 3 },
    ],
    tasks: [
      { title: 'Secure filming permits for Gastown & Stanley Park', creator: 0, done: true },
      { title: 'Finalize crew call sheet', creator: 7, done: true },
      { title: 'Arrange equipment rental', creator: 3, done: true },
    ],
    payments: [
      {
        amount: 1200,
        desc: 'Equipment rental (Arri Alexa + grip)',
        creator: 3,
        participants: [-1, 7, 3, 0],
      },
      { amount: 350, desc: 'Location permits', creator: 0, participants: [-1, 7, 3, 0] },
    ],
  },

  'carlton-founder-tahoe': {
    collaborators: [5, 3, 0], // Priya, Marcus, Sarah
    messages: [
      {
        a: -1,
        c: 'Venture Founder Retreat at Lake Tahoe Jul 10-14. Fireside chats, pitch sessions, networking 🏔️',
        d: -25,
      },
      {
        a: 5,
        c: 'The VC lineup is incredible this year. Three Sequoia partners confirmed',
        d: -25,
      },
      { a: 3, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 0, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 5, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 0, c: 'Ritz-Carlton Lake Tahoe is the perfect venue for this', d: -21 },
      { a: 3, c: "Who's pitching? I want to see the deck lineup", d: -18 },
      { a: -1, c: '12 founders pitching, 8 VC firms attending. Intimate and high-signal', d: -18 },
      {
        a: 5,
        c: "I'm workshopping my Series A pitch. Can someone give feedback Thursday night?",
        d: -15,
      },
      { a: 0, c: "Absolutely. Let's do a fireside pitch review at 8pm", d: -15 },
      {
        a: -1,
        c: 'created a poll: "Keynote topic — AI moats or marketplace dynamics?"',
        d: -12,
        t: 'system',
        se: 'poll_created',
      },
      { a: 3, c: "AI moats. That's what every founder is thinking about right now", d: -12 },
      { a: -1, c: 'Keynote on AI moats went great. 45 min talk, 30 min Q&A', d: 0 },
      { a: 5, c: 'Got a follow-up meeting with Sequoia! The pitch workshop paid off', d: 1 },
      { a: 3, c: 'The networking at the lake was incredible. Deals happen on boats', d: 2 },
      {
        a: 0,
        c: 'Three warm intros made. This retreat is the highest ROI event of the year',
        d: 3,
      },
    ],
    tasks: [
      { title: 'Prepare keynote slides on AI moats', creator: -1, done: true },
      { title: 'Organize fireside pitch review session', creator: 0, done: true },
      { title: 'Coordinate VC meeting schedule', creator: 5, done: true },
    ],
    payments: [
      {
        amount: 800,
        desc: 'Retreat registration (4 passes)',
        creator: -1,
        participants: [-1, 5, 3, 0],
      },
      {
        amount: 240,
        desc: 'Boat rental for networking session',
        creator: 3,
        participants: [-1, 5, 3, 0],
      },
    ],
  },

  'carlton-music-fest-la': {
    collaborators: [6, 3, 7], // Ethan, Marcus, Olivia
    messages: [
      {
        a: -1,
        c: 'LA Music Festival Production May 15-19. Stage management, sound, artist logistics 🎵',
        d: -20,
      },
      { a: 6, c: 'Two-day festival. How many stages?', d: -20 },
      { a: 3, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 7, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: -1, c: 'Three stages. Main, secondary, and an acoustic tent', d: -17 },
      { a: 6, c: 'Sound engineering specs for main stage sent to the vendor', d: -14 },
      { a: 7, c: 'Artist logistics — 18 acts over 2 days. Schedule is tight', d: -12 },
      { a: 3, c: 'VIP area setup and security coordination done', d: -10 },
      { a: -1, c: 'Load-in starts Wednesday at 6am. All crew on site', d: -5 },
      {
        a: 6,
        c: "updated the Trip's Basecamp to THE LINE LA",
        d: -4,
        t: 'system',
        se: 'trip_base_camp_updated',
      },
      { a: 7, c: 'Final walk-through complete. Everything looks incredible', d: -2 },
      { a: -1, c: 'Day 1 was flawless. 12,000 attendees, zero sound issues', d: 0 },
      { a: 6, c: "Main stage acoustics were perfect. Best mix we've done", d: 0 },
      { a: 3, c: 'VIP section ran smooth. All sponsors happy', d: 1 },
      { a: 7, c: 'Festival wrap! Under budget, ahead of schedule. Team killed it 🎸', d: 1 },
    ],
    tasks: [
      { title: 'Finalize sound engineering specs', creator: 6, done: true },
      { title: 'Complete artist logistics schedule', creator: 7, done: true },
      { title: 'Setup VIP area and security plan', creator: 3, done: true },
    ],
    payments: [
      {
        amount: 950,
        desc: 'Crew accommodations (4 rooms, 3 nights)',
        creator: -1,
        participants: [-1, 6, 3, 7],
      },
      { amount: 200, desc: 'Production meals & catering', creator: 7, participants: [-1, 6, 3, 7] },
    ],
  },

  'carlton-nba-media-vegas': {
    collaborators: [3, 1, 5], // Marcus, Jordan, Priya
    messages: [
      {
        a: -1,
        c: 'NBA Summer League Media Trip Jul 12-16. Press credentials, courtside, interviews 📸🏀',
        d: -20,
      },
      { a: 3, c: "Press credentials confirmed for all 4 days. We're fully credentialed", d: -20 },
      { a: 1, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 5, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 3, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 5, c: 'Podcast recording setup at the Venetian. Need a quiet room', d: -15 },
      { a: 1, c: 'Player interview list — 6 rookies confirmed, 2 vets', d: -12 },
      { a: 3, c: 'Courtside content capture plan — 3 cameras, 1 roaming', d: -10 },
      { a: -1, c: 'Interview schedule is locked. First one at 10am Thursday', d: -8 },
      { a: 5, c: 'Podcast studio booked at the Venetian business center', d: -6 },
      { a: -1, c: 'Flagg interview was gold. 20 minutes of pure insight', d: 0 },
      { a: 3, c: "Courtside footage is incredible. The 4K slow-mo is chef's kiss", d: 1 },
      { a: 1, c: 'Got surprise access to the Rockets practice. Exclusive content 🔥', d: 2 },
      { a: 5, c: 'Podcast episode recorded. Two guests, amazing conversation', d: 3 },
      { a: -1, c: 'Best media trip yet. Content for weeks', d: 3 },
    ],
    tasks: [
      { title: 'Confirm press credentials for all staff', creator: 3, done: true },
      { title: 'Book podcast recording studio', creator: 5, done: true },
      { title: 'Finalize player interview schedule', creator: -1, done: true },
    ],
    payments: [
      { amount: 380, desc: 'Camera equipment rental', creator: 3, participants: [-1, 3, 1, 5] },
      { amount: 150, desc: 'Podcast studio rental', creator: 5, participants: [-1, 3, 1, 5] },
    ],
  },

  'carlton-podcast-austin': {
    collaborators: [5, 6, 0], // Priya, Ethan, Sarah
    messages: [
      {
        a: -1,
        c: 'Podcast Creator Summit Austin Oct 3-6. Live recordings, meetups, brand deals 🎙️',
        d: -22,
      },
      { a: 5, c: 'Three live recordings scheduled! This is going to be huge', d: -22 },
      { a: 6, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 0, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 5, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      {
        a: 0,
        c: 'South Congress Hotel is perfect. That lobby is great for impromptu meetings',
        d: -19,
      },
      { a: 6, c: 'Sound equipment — should we bring our own or rent locally?', d: -16 },
      { a: -1, c: 'Renting locally. I found a studio on South Congress with full setup', d: -16 },
      { a: 5, c: "Brand partnership meetings — 4 confirmed. I'll share the schedule", d: -12 },
      { a: 0, c: 'Creator meetup venue booked for Saturday. Capacity 200', d: -10 },
      { a: -1, c: 'Live recording #1 was incredible. 150 people in the audience', d: 0 },
      { a: 5, c: 'Two new brand deals signed at the summit. ROI already positive', d: 1 },
      { a: 6, c: 'The sound quality from the Austin studio was top tier', d: 2 },
      { a: 0, c: 'Creator meetup had 180 people. Standing room only!', d: 2 },
      { a: -1, c: 'Austin always delivers. See you next year, SoCo 🤙', d: 3 },
    ],
    tasks: [
      { title: 'Book recording studio on South Congress', creator: -1, done: true },
      { title: 'Coordinate brand partnership meetings', creator: 5, done: true },
      { title: 'Arrange creator meetup venue', creator: 0, done: true },
    ],
    payments: [
      { amount: 280, desc: 'Studio rental (3 sessions)', creator: -1, participants: [-1, 5, 6, 0] },
      { amount: 120, desc: 'Creator meetup venue', creator: 0, participants: [-1, 5, 6, 0] },
    ],
  },

  'carlton-sports-agent-miami': {
    collaborators: [3, 0, 1], // Marcus, Sarah, Jordan
    messages: [
      {
        a: -1,
        c: 'Sports Agent Client Meeting Miami Jan 22-25. Contract negotiations, dinners, Heat game 🏀💼',
        d: -18,
      },
      { a: 3, c: 'Four Seasons Surf Club is the right vibe for client meetings', d: -18 },
      { a: 0, c: 'joined the trip', d: -16, t: 'system', se: 'member_joined' },
      { a: 1, c: 'joined the trip', d: -16, t: 'system', se: 'member_joined' },
      { a: 3, c: 'joined the trip', d: -16, t: 'system', se: 'member_joined' },
      { a: 0, c: "I'll prep the contract documents. How many clients?", d: -15 },
      { a: -1, c: 'Three clients. Two renewals, one new signing', d: -14 },
      { a: 3, c: 'Prime 112 dinner reserved for Thursday. Client #1 loves their steaks', d: -12 },
      { a: 1, c: 'Heat game tickets — courtside. Kaseya Center is electric right now', d: -10 },
      { a: 0, c: 'Contract review completed. Sending marked-up versions tonight', d: -8 },
      { a: -1, c: 'Client dinner at Prime 112 went great. Negotiations moving forward', d: 0 },
      { a: 3, c: 'New signing is 95% done. Just waiting on final term sheet', d: 1 },
      { a: 1, c: 'Heat game was incredible. Client loved the courtside experience', d: 2 },
      { a: 0, c: 'All contracts signed. Three for three. Great trip!', d: 3 },
      { a: -1, c: "Best client trip we've done. The Heat game sealed the deal 🔥", d: 3 },
    ],
    tasks: [
      { title: 'Prepare contract documents for all clients', creator: 0, done: true },
      { title: 'Reserve Prime 112 for client dinner', creator: 3, done: true },
      { title: 'Get courtside Heat tickets', creator: 1, done: true },
    ],
    payments: [
      { amount: 650, desc: 'Prime 112 client dinner', creator: 3, participants: [-1, 3, 0, 1] },
      { amount: 800, desc: 'Courtside Heat tickets (4x)', creator: 1, participants: [-1, 3, 0, 1] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT TRIPS
  // ═══════════════════════════════════════════════════════════════════════════
  'carlton-event-art-basel': {
    collaborators: [4, 2, 5], // Nina, Maya, Priya
    messages: [
      {
        a: -1,
        c: 'Art Basel Miami Dec 3-7. Gallery previews, Wynwood installations, collector dinners 🎨',
        d: -22,
      },
      { a: 4, c: 'Art Basel is THE event. Wynwood is going to be incredible this year', d: -22 },
      { a: 2, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 5, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 4, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 2, c: "Design District collector dinner is the one. Who's going?", d: -18 },
      { a: 5, c: 'I want to check out the digital art installations. NFT meets physical', d: -16 },
      { a: -1, c: 'The Setai for hotel. Steps from the convention center', d: -15 },
      { a: 4, c: 'VIP preview Thursday evening. Early access to the best pieces', d: -12 },
      {
        a: -1,
        c: 'created a poll: "Gallery crawl route — Wynwood or Design District first?"',
        d: -10,
        t: 'system',
        se: 'poll_created',
      },
      { a: 2, c: 'Wynwood first. The murals + galleries together are unbeatable', d: -10 },
      { a: -1, c: 'VIP preview was mind-blowing. Two pieces already sold for 7 figures', d: 0 },
      { a: 4, c: 'Wynwood installations this year are next level. The immersive rooms 🤯', d: 1 },
      { a: 2, c: 'Collector dinner was extraordinary. Met three emerging artists', d: 2 },
      { a: 5, c: 'The digital art pavilion is the future. Incredible technology', d: 3 },
    ],
    tasks: [
      { title: 'Secure VIP preview passes', creator: -1, done: true },
      { title: 'RSVP for collector dinner', creator: 2, done: true },
    ],
    polls: [
      {
        question: 'Gallery crawl route — Wynwood or Design District first?',
        options: ['Wynwood (murals + galleries)', 'Design District (high-end)'],
        creator: -1,
      },
    ],
    payments: [
      { amount: 400, desc: 'Art Basel VIP passes (4x)', creator: -1, participants: [-1, 4, 2, 5] },
      { amount: 180, desc: 'Collector dinner tickets', creator: 2, participants: [-1, 4, 2, 5] },
    ],
  },

  'carlton-event-cannes': {
    collaborators: [7, 4, 3], // Olivia, Nina, Marcus
    messages: [
      {
        a: -1,
        c: 'Cannes Film Festival May 19-25. Red carpets, yacht parties, filmmaker networking 🎬🇫🇷',
        d: -25,
      },
      { a: 7, c: 'Cannes is the ultimate film event. Who are we meeting with?', d: -25 },
      { a: 4, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 3, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 7, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 4, c: 'Hôtel Martinez is iconic for Cannes. Right on La Croisette', d: -21 },
      { a: 3, c: "Yacht party invites — I've got us on three lists", d: -18 },
      { a: 7, c: 'Screening schedule — 5 premieres we need to see', d: -15 },
      { a: -1, c: 'Red carpet outfit sorted. Custom suit from Paris atelier', d: -12 },
      { a: 4, c: 'The Croisette is going to be insane. Paparazzi everywhere', d: -8 },
      { a: -1, c: 'Opening night premiere was electric. Standing ovation for 12 minutes', d: 0 },
      { a: 7, c: "Got a one-on-one with a Palme d'Or nominated director. Career highlight", d: 2 },
      { a: 3, c: 'Yacht party was next level. The sunset over the Mediterranean...', d: 3 },
      { a: 4, c: 'La Croisette at golden hour is the most glamorous place on earth', d: 4 },
      { a: -1, c: 'Cannes never disappoints. Every year it raises the bar', d: 5 },
    ],
    tasks: [
      { title: 'Secure premiere screening tickets', creator: 7, done: true },
      { title: 'Confirm yacht party guest list spots', creator: 3, done: true },
    ],
    polls: [
      {
        question: 'Which premiere to prioritize?',
        options: ['Opening night gala', "Palme d'Or contender", 'Independent film showcase'],
        creator: 7,
      },
    ],
    payments: [
      { amount: 500, desc: 'Festival passes (4x)', creator: -1, participants: [-1, 7, 4, 3] },
      { amount: 300, desc: 'Yacht party access', creator: 3, participants: [-1, 7, 4, 3] },
    ],
  },

  'carlton-event-jfl-montreal': {
    collaborators: [7, 6, 1], // Olivia, Ethan, Jordan
    messages: [
      {
        a: -1,
        c: 'Just For Laughs Montreal Jul 15-20. Comedy showcases, gala tapings, late-night sets 😂🇨🇦',
        d: -20,
      },
      { a: 7, c: 'JFL is the comedy Super Bowl. The lineup this year is stacked', d: -20 },
      { a: 6, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 1, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      { a: 7, c: 'joined the trip', d: -18, t: 'system', se: 'member_joined' },
      {
        a: 1,
        c: 'Hotel Nelligan in Old Montreal. Cobblestone streets, amazing restaurants',
        d: -17,
      },
      { a: 6, c: 'Secret late-night sets are the best part. Comics try new material', d: -15 },
      { a: 7, c: 'Gala taping tickets secured. Two galas, front section', d: -12 },
      { a: -1, c: 'Meeting with three management teams about potential signings', d: -10 },
      { a: 1, c: 'Old Montreal restaurant scene is underrated. Reserving at Joe Beef', d: -8 },
      { a: -1, c: 'Gala was incredible. Three comedians absolutely killed', d: 0 },
      {
        a: 7,
        c: 'Late-night showcase at Club Soda was the highlight. Raw, unfiltered comedy',
        d: 1,
      },
      { a: 6, c: 'Joe Beef dinner was insane. Lobster spaghetti is life-changing', d: 2 },
      { a: 1, c: 'Old Montreal at night with all the comedy energy is magical', d: 3 },
      { a: -1, c: 'Three potential signings from this trip. JFL always delivers business', d: 4 },
    ],
    tasks: [
      { title: 'Book gala taping tickets', creator: 7, done: true },
      { title: 'Schedule management meetings', creator: -1 },
    ],
    payments: [
      {
        amount: 320,
        desc: 'Festival all-access passes (4x)',
        creator: -1,
        participants: [-1, 7, 6, 1],
      },
      { amount: 140, desc: 'Joe Beef dinner', creator: 1, participants: [-1, 7, 6, 1] },
    ],
  },

  'carlton-event-miami-f1': {
    collaborators: [3, 5, 6], // Marcus, Priya, Ethan
    messages: [
      {
        a: -1,
        c: 'Miami F1 Grand Prix Event May 1-4. Paddock access, fan zones, after-parties 🏎️',
        d: -22,
      },
      { a: 3, c: 'Hard Rock Stadium setup is incredible. The fake marina is wild', d: -22 },
      { a: 5, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 3, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 5, c: 'VIP hospitality suite coordination — sponsor meetings all weekend', d: -18 },
      { a: 6, c: 'After-party DJ lineup is insane. Calvin Harris on Saturday', d: -15 },
      {
        a: -1,
        c: 'Fan zone activation plan finalized. Interactive F1 sim, merch, photo ops',
        d: -12,
      },
      { a: 3, c: 'Celebrity meet-and-greet schedule confirmed', d: -10 },
      { a: 5, c: 'Sponsor deliverables all on track. Banners, digital, experiential', d: -8 },
      { a: -1, c: 'Race day was unbelievable. The atmosphere at Hard Rock is electric', d: 0 },
      { a: 3, c: 'Fan zone had 20K visitors over the weekend. Exceeded all targets', d: 1 },
      { a: 6, c: 'Calvin Harris set was incredible. Best after-party of race weekend', d: 1 },
      { a: 5, c: "All sponsor KPIs exceeded. They're already signed for next year", d: 2 },
    ],
    tasks: [
      { title: 'Finalize fan zone activation plan', creator: -1, done: true },
      { title: 'Coordinate sponsor deliverables', creator: 5, done: true },
    ],
    payments: [
      { amount: 600, desc: 'Event crew accommodations', creator: -1, participants: [-1, 3, 5, 6] },
      { amount: 200, desc: 'After-party VIP access', creator: 6, participants: [-1, 3, 5, 6] },
    ],
  },

  'carlton-event-monaco-gp': {
    collaborators: [3, 4, 1], // Marcus, Nina, Jordan
    messages: [
      {
        a: -1,
        c: 'Monaco Grand Prix May 22-26. Yacht viewing, Casino Square, the circuit 🏎️🇲🇨',
        d: -25,
      },
      {
        a: 4,
        c: "Monaco is the most glamorous weekend in motorsport. I'm already planning outfits",
        d: -25,
      },
      { a: 3, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 1, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 4, c: 'joined the trip', d: -22, t: 'system', se: 'member_joined' },
      { a: 3, c: 'Hôtel de Paris Monte-Carlo. Steps from Casino Square', d: -21 },
      { a: 1, c: 'Yacht viewing spot confirmed for Sunday. Harbor view of the hairpin', d: -18 },
      { a: 4, c: 'Casino night on Friday? Monte Carlo Casino is legendary', d: -15 },
      { a: -1, c: 'Qualifying was insane. Cars inches from the barriers through the tunnel', d: 1 },
      { a: 3, c: 'Yacht viewing was surreal. Champagne, sun, F1 cars screaming past', d: 2 },
      { a: 4, c: 'Casino Square at night with the F1 barriers still up. So cinematic', d: 3 },
      { a: 1, c: 'Monaco is a different planet. This is peak luxury motorsport', d: 3 },
      { a: -1, c: 'The crown jewel of the calendar. Nothing compares to Monaco GP', d: 4 },
    ],
    tasks: [
      { title: 'Secure yacht viewing passes', creator: 1, done: true },
      { title: 'Reserve Casino Monte Carlo table', creator: 3 },
    ],
    polls: [
      {
        question: 'Friday evening — Casino night or harbor dinner?',
        options: ['Monte Carlo Casino', 'Harbor-side dinner', 'Both!'],
        creator: -1,
      },
    ],
    payments: [
      { amount: 1500, desc: 'Yacht viewing passes (4x)', creator: 1, participants: [-1, 3, 4, 1] },
      { amount: 350, desc: 'Casino table buy-in', creator: 3, participants: [-1, 3, 4, 1] },
    ],
  },

  'carlton-event-sundance': {
    collaborators: [7, 5, 0], // Olivia, Priya, Sarah
    messages: [
      {
        a: -1,
        c: 'Sundance Film Festival Jan 22-28. Indie premieres, Q&As, après-ski 🎬🏔️',
        d: -22,
      },
      { a: 7, c: 'Sundance is where careers are made. The indie lineup looks incredible', d: -22 },
      { a: 5, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 0, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 7, c: 'joined the trip', d: -20, t: 'system', se: 'member_joined' },
      { a: 0, c: 'Stein Eriksen Lodge is perfect. Ski in, ski out between screenings', d: -19 },
      { a: 5, c: 'Any tech/AI documentaries in the lineup? I saw two in the catalog', d: -16 },
      { a: 7, c: "Screening schedule — I've marked 8 must-sees", d: -14 },
      { a: -1, c: 'Q&A passes secured for 3 filmmaker sessions', d: -12 },
      { a: 0, c: 'Après-ski at the lodge bar is the best networking spot', d: -10 },
      {
        a: -1,
        c: 'created a poll: "Which premiere on opening night?"',
        d: -8,
        t: 'system',
        se: 'poll_created',
      },
      { a: 7, c: 'Opening night premiere was stunning. Director Q&A had everyone in tears', d: 0 },
      { a: 5, c: "The AI documentary was brilliant. So relevant to what we're building", d: 2 },
      { a: 0, c: 'Après-ski networking led to 3 amazing conversations about distribution', d: 3 },
      { a: -1, c: 'Sundance + Deer Valley skiing is the ultimate winter combo 🏔️🎬', d: 5 },
    ],
    tasks: [
      { title: 'Book premiere screening tickets', creator: 7, done: true },
      { title: 'Schedule filmmaker Q&A sessions', creator: -1, done: true },
    ],
    polls: [
      {
        question: 'Opening night premiere — drama or documentary?',
        options: ['Drama premiere', 'Documentary premiere', 'Split up and compare notes'],
        creator: -1,
      },
    ],
    payments: [
      { amount: 450, desc: 'Festival passes (4x)', creator: -1, participants: [-1, 7, 5, 0] },
      {
        amount: 180,
        desc: 'Ski passes for off-screening days',
        creator: 0,
        participants: [-1, 7, 5, 0],
      },
    ],
  },

  'carlton-event-super-bowl': {
    collaborators: [3, 1, 6], // Marcus, Jordan, Ethan
    messages: [
      {
        a: -1,
        c: 'Super Bowl 2027 in New Orleans! Feb 12-15. Tailgate, concerts, best seats in the house 🏈',
        d: -30,
      },
      { a: 3, c: 'THE BIG GAME. Super Bowl in NOLA is going to be INSANE', d: -30 },
      { a: 1, c: 'joined the trip', d: -28, t: 'system', se: 'member_joined' },
      { a: 6, c: 'joined the trip', d: -28, t: 'system', se: 'member_joined' },
      { a: 3, c: 'joined the trip', d: -28, t: 'system', se: 'member_joined' },
      { a: 1, c: 'The Roosevelt New Orleans. Historic, right in the French Quarter', d: -27 },
      {
        a: 6,
        c: 'Pre-game concerts on Bourbon Street all week. The city is going to be electric',
        d: -25,
      },
      { a: 3, c: "Tickets confirmed. 50 yard line, lower bowl. LET'S GO", d: -20 },
      {
        a: -1,
        c: 'Tailgate party organized for Sunday morning. BBQ and cocktails before the game',
        d: -15,
      },
      {
        a: -1,
        c: 'created a poll: "Tailgate food — BBQ or seafood boil?"',
        d: -12,
        t: 'system',
        se: 'poll_created',
      },
      { a: 1, c: "Seafood boil in NOLA for the Super Bowl? That's too perfect", d: -12 },
      { a: 3, c: "Player after-party list — I've got us on two", d: -8 },
      { a: 6, c: 'Bourbon Street on Super Bowl week is a different universe', d: 0 },
      { a: -1, c: 'GAME DAY. The atmosphere in the Superdome is unreal', d: 1 },
      { a: 3, c: 'That 4th quarter comeback!! I lost my voice', d: 1 },
      { a: 1, c: 'After-party was legendary. Met 4 players', d: 2 },
      { a: -1, c: 'Best Super Bowl experience of my life. NOLA + football = perfection 🏆', d: 2 },
    ],
    tasks: [
      { title: 'Secure game day tickets (50 yard line)', creator: 3, done: true },
      { title: 'Organize tailgate party setup', creator: -1 },
    ],
    polls: [
      {
        question: 'Tailgate food — BBQ or seafood boil?',
        options: ['Classic BBQ spread', 'NOLA seafood boil', 'Both!'],
        creator: -1,
      },
    ],
    payments: [
      {
        amount: 2800,
        desc: 'Super Bowl tickets (4x, lower bowl)',
        creator: 3,
        participants: [-1, 3, 1, 6],
      },
      { amount: 250, desc: 'Tailgate setup + food', creator: -1, participants: [-1, 3, 1, 6] },
    ],
  },

  'carlton-event-sxsw': {
    collaborators: [5, 6, 7, 0], // Priya, Ethan, Olivia, Sarah
    messages: [
      {
        a: -1,
        c: 'SXSW Austin 2026 Mar 6-15. The full experience — music, interactive, film 🤘🎬',
        d: -28,
      },
      { a: 5, c: 'Interactive track has amazing AI panels this year', d: -28 },
      { a: 6, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 7, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 0, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 5, c: 'joined the trip', d: -26, t: 'system', se: 'member_joined' },
      { a: 7, c: 'Film premieres are stacked. Five must-sees on the first weekend', d: -24 },
      { a: 0, c: 'Austin Proper Hotel booked. Perfect central location', d: -22 },
      { a: 6, c: "Music showcases — I'm tracking 15 artists across 3 venues per night", d: -20 },
      { a: -1, c: "We're doing all three tracks. Divide and conquer strategy", d: -18 },
      { a: 5, c: 'Panel schedule shared. Three AI talks + one blockchain session', d: -15 },
      { a: 7, c: 'Film premiere tickets secured for opening night', d: -12 },
      { a: 0, c: 'Networking dinner arranged for Wednesday. 12 founders confirmed', d: -10 },
      {
        a: -1,
        c: 'created a poll: "Late night — 6th Street or Rainey Street?"',
        d: -8,
        t: 'system',
        se: 'poll_created',
      },
      { a: 6, c: '6th Street for the chaos. Rainey for the vibes', d: -8 },
      { a: -1, c: 'Day 1 was incredible. The interactive keynote on AI ethics was powerful', d: 0 },
      { a: 5, c: "AI panel blew my mind. Three insights I'm implementing immediately", d: 1 },
      { a: 7, c: 'Opening night film was extraordinary. Oscar contender for sure', d: 2 },
      { a: 6, c: 'Secret show at the Mohawk — tiny venue, massive energy. Best night', d: 3 },
      { a: 0, c: 'Networking dinner generated 5 follow-up meetings. SXSW delivers', d: 4 },
      { a: -1, c: 'This was the best SXSW yet. Austin is the creative capital 🤙', d: 8 },
    ],
    tasks: [
      { title: 'Secure film premiere tickets', creator: 7, done: true },
      { title: 'Organize networking dinner', creator: 0, done: true },
      { title: 'Create panel attendance schedule', creator: 5, done: true },
    ],
    payments: [
      {
        amount: 500,
        desc: 'SXSW Platinum passes (5x)',
        creator: -1,
        participants: [-1, 5, 6, 7, 0],
      },
      { amount: 150, desc: 'Networking dinner venue', creator: 0, participants: [-1, 5, 6, 7, 0] },
    ],
  },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getAuthorName(authorIdx: number): string {
  if (authorIdx === -1) return 'Carlton Gold';
  return MOCK_USERS[authorIdx]?.display ?? 'Unknown';
}

function getUserId(authorIdx: number): string | null {
  // Chat messages have FK to auth.users on user_id — only Carlton has a real auth user
  // Mock users get null user_id and rely on author_name for display
  if (authorIdx === -1) return CARLTON_ID;
  return null;
}

function getMockUserId(authorIdx: number): string {
  if (authorIdx === -1) return CARLTON_ID;
  return MOCK_USERS[authorIdx]?.id ?? CARLTON_ID;
}

function deterministicUuid(seed: string): string {
  // Create a deterministic UUID v5-like hash from a seed string
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `d0000000-seed-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${seed.length.toString(16).padStart(12, '0')}`;
}

// ─── PURGE ───────────────────────────────────────────────────────────────────
async function purgeExistingData(supabase: any): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  // 1. Delete payment_splits for carlton trips
  const { data: paymentIds } = await supabase
    .from('trip_payment_messages')
    .select('id')
    .like('trip_id', 'carlton-%');

  if (paymentIds?.length) {
    const ids = paymentIds.map((p: any) => p.id);
    const { count } = await supabase
      .from('payment_splits')
      .delete({ count: 'exact' })
      .in('payment_message_id', ids);
    counts.payment_splits_deleted = count ?? 0;
  }

  // 2. Delete payment messages
  const { count: pmCount } = await supabase
    .from('trip_payment_messages')
    .delete({ count: 'exact' })
    .like('trip_id', 'carlton-%');
  counts.payment_messages_deleted = pmCount ?? 0;

  // 3. Delete chat messages
  const { count: chatCount } = await supabase
    .from('trip_chat_messages')
    .delete({ count: 'exact' })
    .like('trip_id', 'carlton-%');
  counts.chat_messages_deleted = chatCount ?? 0;

  // 4. Delete tasks
  const { count: taskCount } = await supabase
    .from('trip_tasks')
    .delete({ count: 'exact' })
    .like('trip_id', 'carlton-%');
  counts.tasks_deleted = taskCount ?? 0;

  // 5. Delete polls
  const { count: pollCount } = await supabase
    .from('trip_polls')
    .delete({ count: 'exact' })
    .like('trip_id', 'carlton-%');
  counts.polls_deleted = pollCount ?? 0;

  // 6. Delete mock members (keep Carlton)
  const { count: memberCount } = await supabase
    .from('trip_members')
    .delete({ count: 'exact' })
    .like('trip_id', 'carlton-%')
    .neq('user_id', CARLTON_ID);
  counts.mock_members_deleted = memberCount ?? 0;

  return counts;
}

// ─── SEED PROFILES ───────────────────────────────────────────────────────────
async function seedMockProfiles(supabase: any): Promise<number> {
  let created = 0;
  for (const user of MOCK_USERS) {
    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: user.id,
        email: user.email,
        display_name: user.display,
        first_name: user.first,
        last_name: user.last,
        bio: `Demo collaborator for Carlton Gold trips`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (!error) created++;
  }
  return created;
}

// ─── SEED MEMBERS ────────────────────────────────────────────────────────────
async function seedMembers(supabase: any): Promise<number> {
  const members: any[] = [];
  for (const [tripId, config] of Object.entries(TRIP_CONFIGS)) {
    for (const idx of config.collaborators) {
      members.push({
        trip_id: tripId,
        user_id: MOCK_USERS[idx].id,
        role: 'member',
      });
    }
  }

  // Batch insert with ON CONFLICT DO NOTHING behavior
  let inserted = 0;
  // Insert in batches of 50
  for (let i = 0; i < members.length; i += 50) {
    const batch = members.slice(i, i + 50);
    const { error, count } = await supabase
      .from('trip_members')
      .upsert(batch, { onConflict: 'trip_id,user_id', count: 'exact' });
    if (!error) inserted += count ?? batch.length;
  }
  return inserted;
}

// ─── SEED MESSAGES ───────────────────────────────────────────────────────────
async function seedMessages(supabase: any, trips: any[]): Promise<number> {
  const allMessages: any[] = [];

  for (const trip of trips) {
    const config = TRIP_CONFIGS[trip.id];
    if (!config) continue;

    const tripStart = new Date(trip.start_date);

    for (let i = 0; i < config.messages.length; i++) {
      const msg = config.messages[i];
      const msgDate = new Date(tripStart);
      msgDate.setDate(msgDate.getDate() + msg.d);
      // Add some hours variation for realism
      msgDate.setHours(8 + (i % 14), (i * 17) % 60, 0, 0);

      const authorName = getAuthorName(msg.a);
      const isSystem = msg.t === 'system';

      allMessages.push({
        trip_id: trip.id,
        content: isSystem ? `${authorName} ${msg.c}` : msg.c,
        author_name: authorName,
        user_id: getUserId(msg.a),
        message_type: msg.t ?? 'text',
        system_event_type: msg.se ?? null,
        payload: msg.se
          ? JSON.stringify({ actorName: authorName, seed_version: SEED_VERSION })
          : null,
        created_at: msgDate.toISOString(),
        updated_at: msgDate.toISOString(),
      });
    }
  }

  let inserted = 0;
  for (let i = 0; i < allMessages.length; i += 50) {
    const batch = allMessages.slice(i, i + 50);
    const { error, count } = await supabase
      .from('trip_chat_messages')
      .insert(batch, { count: 'exact' });
    if (error) {
      console.error(`Message batch ${i} error:`, error.message);
    } else {
      inserted += count ?? batch.length;
    }
  }
  return inserted;
}

// ─── SEED TASKS ──────────────────────────────────────────────────────────────
async function seedTasks(supabase: any, trips: any[]): Promise<number> {
  const allTasks: any[] = [];

  for (const trip of trips) {
    const config = TRIP_CONFIGS[trip.id];
    if (!config?.tasks) continue;

    const tripStart = new Date(trip.start_date);

    for (let i = 0; i < config.tasks.length; i++) {
      const task = config.tasks[i];
      const creatorId = task.creator === -1 ? CARLTON_ID : MOCK_USERS[task.creator]?.id;

      // Only use creator IDs that have profiles (FK constraint)
      const taskDate = new Date(tripStart);
      taskDate.setDate(taskDate.getDate() - 10 + i * 2);

      allTasks.push({
        trip_id: trip.id,
        title: task.title,
        creator_id: creatorId,
        completed: task.done ?? false,
        completed_at: task.done ? taskDate.toISOString() : null,
        created_at: taskDate.toISOString(),
        updated_at: taskDate.toISOString(),
      });
    }
  }

  let inserted = 0;
  for (let i = 0; i < allTasks.length; i += 50) {
    const batch = allTasks.slice(i, i + 50);
    const { error, count } = await supabase.from('trip_tasks').insert(batch, { count: 'exact' });
    if (error) {
      console.error(`Task batch error:`, error.message);
    } else {
      inserted += count ?? batch.length;
    }
  }
  return inserted;
}

// ─── SEED POLLS ──────────────────────────────────────────────────────────────
async function seedPolls(supabase: any, trips: any[]): Promise<number> {
  const allPolls: any[] = [];

  for (const trip of trips) {
    const config = TRIP_CONFIGS[trip.id];
    if (!config?.polls) continue;

    const tripStart = new Date(trip.start_date);

    for (let i = 0; i < config.polls.length; i++) {
      const poll = config.polls[i];
      const creatorId = poll.creator === -1 ? CARLTON_ID : MOCK_USERS[poll.creator]?.id;

      const pollDate = new Date(tripStart);
      pollDate.setDate(pollDate.getDate() - 12 + i * 3);

      // Build options as JSONB array with vote counts
      const options = poll.options.map((opt, idx) => ({
        text: opt,
        votes: Math.floor(Math.random() * 3) + 1,
        voters: [],
      }));

      allPolls.push({
        trip_id: trip.id,
        question: poll.question,
        options: JSON.stringify(options),
        total_votes: options.reduce((sum: number, o: any) => sum + o.votes, 0),
        status: 'active',
        created_by: creatorId,
        created_at: pollDate.toISOString(),
        updated_at: pollDate.toISOString(),
      });
    }
  }

  const { error, count } = await supabase.from('trip_polls').insert(allPolls, { count: 'exact' });

  if (error) {
    console.error('Poll insert error:', error.message);
    return 0;
  }
  return count ?? allPolls.length;
}

// ─── SEED PAYMENTS ───────────────────────────────────────────────────────────
async function seedPayments(
  supabase: any,
  trips: any[],
): Promise<{ payments: number; splits: number }> {
  let paymentCount = 0;
  let splitCount = 0;

  for (const trip of trips) {
    const config = TRIP_CONFIGS[trip.id];
    if (!config?.payments) continue;

    const tripStart = new Date(trip.start_date);

    for (let i = 0; i < config.payments.length; i++) {
      const pay = config.payments[i];
      const creatorId = pay.creator === -1 ? CARLTON_ID : MOCK_USERS[pay.creator]?.id;

      const payDate = new Date(tripStart);
      payDate.setDate(payDate.getDate() - 5 + i * 2);

      // Resolve participant IDs
      const participantIds = pay.participants.map((idx: number) =>
        idx === -1 ? CARLTON_ID : MOCK_USERS[idx]?.id,
      );

      const { data: inserted, error } = await supabase
        .from('trip_payment_messages')
        .insert({
          trip_id: trip.id,
          amount: pay.amount,
          currency: pay.currency ?? 'USD',
          description: pay.desc,
          split_count: participantIds.length,
          split_participants: JSON.stringify(participantIds),
          payment_methods: JSON.stringify(['venmo', 'zelle']),
          created_by: creatorId,
          is_settled: false,
          created_at: payDate.toISOString(),
          updated_at: payDate.toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error(`Payment insert error for ${trip.id}:`, error.message);
        continue;
      }

      paymentCount++;

      // Create splits
      const splitAmount = pay.amount / participantIds.length;
      const splits = participantIds.map((uid: string) => ({
        payment_message_id: inserted.id,
        debtor_user_id: uid,
        amount_owed: Math.round(splitAmount * 100) / 100,
        is_settled: false,
      }));

      const { error: splitError, count: sc } = await supabase
        .from('payment_splits')
        .insert(splits, { count: 'exact' });

      if (splitError) {
        console.error(`Split insert error:`, splitError.message);
      } else {
        splitCount += sc ?? splits.length;
      }
    }
  }

  return { payments: paymentCount, splits: splitCount };
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const headers = { ...getCorsHeaders(req), 'Content-Type': 'application/json' };

  // Auth gate
  const { requireAuth } = await import('../_shared/requireAuth.ts');
  const auth = await requireAuth(req, headers);
  if (auth.response) return auth.response;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Parse dry_run param
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry_run') === 'true';

  try {
    // STEP 0: Verify scope — only Carlton's trips
    const { data: carltonTrips, error: tripError } = await supabase
      .from('trips')
      .select('id, name, destination, start_date, end_date, trip_type, description, basecamp_name')
      .eq('created_by', CARLTON_ID)
      .like('id', 'carlton-%');

    if (tripError) throw tripError;
    if (!carltonTrips?.length) {
      return new Response(JSON.stringify({ error: 'No Carlton trips found' }), {
        status: 404,
        headers,
      });
    }

    const tripsWithConfig = carltonTrips.filter((t: any) => TRIP_CONFIGS[t.id]);
    const tripsWithoutConfig = carltonTrips.filter((t: any) => !TRIP_CONFIGS[t.id]);

    if (dryRun) {
      return new Response(
        JSON.stringify({
          dry_run: true,
          total_carlton_trips: carltonTrips.length,
          trips_with_config: tripsWithConfig.map((t: any) => t.id),
          trips_without_config: tripsWithoutConfig.map((t: any) => t.id),
          mock_users: MOCK_USERS.map(u => u.display),
          scope: `WHERE created_by = '${CARLTON_ID}' AND id LIKE 'carlton-%'`,
        }),
        { headers },
      );
    }

    console.log(`[seed-carlton-social] Starting reseed for ${tripsWithConfig.length} trips`);

    // STEP 1: Purge existing data
    const purgeCounts = await purgeExistingData(supabase);
    console.log('[seed-carlton-social] Purge complete:', purgeCounts);

    // STEP 2: Create/upsert mock profiles
    const profilesCreated = await seedMockProfiles(supabase);
    console.log(`[seed-carlton-social] Profiles upserted: ${profilesCreated}`);

    // STEP 3: Seed members
    const membersInserted = await seedMembers(supabase);
    console.log(`[seed-carlton-social] Members inserted: ${membersInserted}`);

    // STEP 4: Seed messages
    const messagesInserted = await seedMessages(supabase, tripsWithConfig);
    console.log(`[seed-carlton-social] Messages inserted: ${messagesInserted}`);

    // STEP 5: Seed tasks
    const tasksInserted = await seedTasks(supabase, tripsWithConfig);
    console.log(`[seed-carlton-social] Tasks inserted: ${tasksInserted}`);

    // STEP 6: Seed polls
    const pollsInserted = await seedPolls(supabase, tripsWithConfig);
    console.log(`[seed-carlton-social] Polls inserted: ${pollsInserted}`);

    // STEP 7: Seed payments
    const paymentResult = await seedPayments(supabase, tripsWithConfig);
    console.log(
      `[seed-carlton-social] Payments inserted: ${paymentResult.payments}, Splits: ${paymentResult.splits}`,
    );

    const result = {
      success: true,
      seed_version: SEED_VERSION,
      scope: `carlton trips only (created_by=${CARLTON_ID}, id LIKE 'carlton-%')`,
      purged: purgeCounts,
      seeded: {
        profiles: profilesCreated,
        members: membersInserted,
        messages: messagesInserted,
        tasks: tasksInserted,
        polls: pollsInserted,
        payments: paymentResult.payments,
        payment_splits: paymentResult.splits,
      },
      trips_configured: tripsWithConfig.length,
      trips_skipped: tripsWithoutConfig.map((t: any) => t.id),
    };

    console.log('[seed-carlton-social] Complete:', JSON.stringify(result));
    return new Response(JSON.stringify(result), { headers });
  } catch (error) {
    console.error('[seed-carlton-social] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers },
    );
  }
});
