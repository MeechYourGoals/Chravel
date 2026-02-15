// Demo trip covers are served from Supabase Storage for consistency with OG previews
const DEMO_COVERS_BASE = 'https://jmjiyekmxwsxkfnqwyaa.supabase.co/storage/v1/object/public/trip-media/demo-covers';

import { getMockAvatar } from '../utils/mockAvatars';

export interface TripParticipant {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  name: string;
  avatar: string;
}

export interface Trip {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  title: string;
  location: string;
  dateRange: string;
  description: string;
  participants: TripParticipant[];
  coverPhoto?: string;
  placesCount?: number; // Number of unique places from calendar events with locations
  peopleCount?: number; // Number of trip members (from trip_members count)
  // Feature toggles for Pro/Event trips
  enabled_features?: string[];
  trip_type?: 'consumer' | 'pro' | 'event';
  archived?: boolean;
  // Privacy settings
  privacy_mode?: 'standard' | 'high';
  ai_access_enabled?: boolean;
  // Membership status for current user
  membership_status?: 'owner' | 'member' | 'pending' | 'rejected';
  // Creator ID for determining if current user can leave the trip
  created_by?: string;
}

export const tripsData: Trip[] = [
  {
    id: 1,
    title: "Spring Break Cancun 2026 – Fraternity Trip",
    location: "Cancun, Mexico",
    dateRange: "Mar 15 - Mar 22, 2026",
    description: "Brotherhood spring break getaway with beach activities, nightlife, and bonding experiences",
    coverPhoto: `${DEMO_COVERS_BASE}/cancun-spring-break.jpg`,
    placesCount: 15,
    participants: [
      { id: 1, name: "Marcus", avatar: getMockAvatar("Marcus") },
      { id: 2, name: "Jamal", avatar: getMockAvatar("Jamal") },
      { id: 3, name: "Darius", avatar: getMockAvatar("Darius") },
      { id: 4, name: "Terrell", avatar: getMockAvatar("Terrell") },
      { id: 5, name: "Jerome", avatar: getMockAvatar("Jerome") },
      { id: 6, name: "DeAndre", avatar: getMockAvatar("DeAndre") },
      { id: 7, name: "Malik", avatar: getMockAvatar("Malik") },
      { id: 8, name: "Brandon", avatar: getMockAvatar("Brandon") },
      { id: 9, name: "Kevin", avatar: getMockAvatar("Kevin") },
      { id: 10, name: "Andre", avatar: getMockAvatar("Andre") },
      { id: 11, name: "Isaiah", avatar: getMockAvatar("Isaiah") },
      { id: 12, name: "Justin", avatar: getMockAvatar("Justin") },
      { id: 13, name: "Tyler", avatar: getMockAvatar("Tyler") },
      { id: 14, name: "Chris", avatar: getMockAvatar("Chris") }
    ]
  },
  {
    id: 2,
    title: "Tokyo Adventure",
    location: "Tokyo, Japan",
    dateRange: "Oct 5 - Oct 15, 2026",
    description: "Cultural exploration of Japan's capital with temples, modern tech districts, and amazing cuisine",
    coverPhoto: `${DEMO_COVERS_BASE}/tokyo-adventure.jpg`,
    placesCount: 9,
    participants: [
      { id: 4, name: "Alex", avatar: getMockAvatar("Alex") },
      { id: 5, name: "Maria", avatar: getMockAvatar("Maria") },
      { id: 6, name: "David", avatar: getMockAvatar("David") },
      { id: 7, name: "Sarah", avatar: getMockAvatar("Sarah") },
      { id: 8, name: "James", avatar: getMockAvatar("James") },
      { id: 9, name: "Emily", avatar: getMockAvatar("Emily") },
      { id: 10, name: "Ryan", avatar: getMockAvatar("Ryan") },
      { id: 11, name: "Jessica", avatar: getMockAvatar("Jessica") },
      { id: 12, name: "Michael", avatar: getMockAvatar("Michael") },
      { id: 13, name: "Amanda", avatar: getMockAvatar("Amanda") },
      { id: 14, name: "Daniel", avatar: getMockAvatar("Daniel") },
      { id: 15, name: "Laura", avatar: getMockAvatar("Laura") }
    ]
  },
  // ⚠️ DEMO DATA — peopleCount is authoritative. Do not auto-derive or use fallbacks.
  {
    id: 3,
    title: "The Tyler's Tie The Knot",
    location: "Bali, Indonesia",
    dateRange: "Dec 10 - Dec 12, 2026",
    description: "Romantic destination wedding celebration with family and friends in paradise, featuring welcome dinner, ceremony, and reception",
    coverPhoto: `${DEMO_COVERS_BASE}/bali-destination-wedding.jpg`,
    placesCount: 4,
    peopleCount: 63, // Explicit count — do not derive from participants array
    participants: Array.from({ length: 63 }, (_, i) => {
      if (i === 0) return { id: i + 1, name: "Jack", avatar: getMockAvatar("Jack") };
      if (i === 1) return { id: i + 1, name: "Jill", avatar: getMockAvatar("Jill") };
      if (i < 12) {
        const brideFamily = ["Mom Sarah", "Dad Robert", "Sister Emma", "Brother Mike", "Grandma Rose", "Grandpa John", "Aunt Lisa", "Uncle Tom", "Cousin Anna", "Cousin David"];
        return { id: i + 1, name: brideFamily[i - 2] || `Bride Family ${i - 1}`, avatar: getMockAvatar(brideFamily[i - 2] || `Guest${i}`) };
      }
      if (i < 22) {
        const groomFamily = ["Dad Steve", "Mom Linda", "Brother Chris", "Sister Katie", "Grandma Mary", "Grandpa Bill", "Aunt Carol", "Uncle Dan", "Cousin Beth", "Cousin Mark"];
        return { id: i + 1, name: groomFamily[i - 12] || `Groom Family ${i - 11}`, avatar: getMockAvatar(groomFamily[i - 12] || `Guest${i}`) };
      }
      return { id: i + 1, name: `Wedding Guest ${i - 21}`, avatar: getMockAvatar(`Guest${i}`) };
    })
  },
  {
    id: 4,
    title: "Kristen Goldberg's Bachelorette Party",
    location: "Nashville, TN",
    dateRange: "Nov 8 - Nov 10, 2026",
    description: "Epic bachelorette celebration with honky-tonk bars, live music, spa day, karaoke, and unforgettable memories across multiple Nashville venues",
    coverPhoto: `${DEMO_COVERS_BASE}/nashville-bachelorette.jpg`,
    placesCount: 7,
    participants: [
      { id: 10, name: "Kristen", avatar: getMockAvatar("Kristen") },
      { id: 11, name: "Ashley", avatar: getMockAvatar("Ashley") },
      { id: 12, name: "Megan", avatar: getMockAvatar("Megan") },
      { id: 13, name: "Taylor", avatar: getMockAvatar("Taylor") },
      { id: 14, name: "Sam", avatar: getMockAvatar("Sam") },
      { id: 15, name: "Jenna", avatar: getMockAvatar("Jenna") },
      { id: 16, name: "Rachel", avatar: getMockAvatar("Rachel") },
      { id: 17, name: "Lauren", avatar: getMockAvatar("Lauren") },
      { id: 18, name: "Nicole", avatar: getMockAvatar("Nicole") },
      { id: 19, name: "Madison", avatar: getMockAvatar("Madison") },
      { id: 20, name: "Olivia", avatar: getMockAvatar("Olivia") },
      { id: 21, name: "Sophia", avatar: getMockAvatar("Sophia") },
      { id: 22, name: "Emma", avatar: getMockAvatar("Emma") },
      { id: 23, name: "Ava", avatar: getMockAvatar("Ava") },
      { id: 24, name: "Isabella", avatar: getMockAvatar("Isabella") },
      { id: 25, name: "Mia", avatar: getMockAvatar("Mia") },
      { id: 26, name: "Charlotte", avatar: getMockAvatar("Charlotte") },
      { id: 27, name: "Amelia", avatar: getMockAvatar("Amelia") },
      { id: 28, name: "Harper", avatar: getMockAvatar("Harper") },
      { id: 29, name: "Evelyn", avatar: getMockAvatar("Evelyn") },
      { id: 30, name: "Abigail", avatar: getMockAvatar("Abigail") },
      { id: 31, name: "Emily", avatar: getMockAvatar("Emily") }
    ]
  },
  {
    id: 5,
    title: "Coachella Squad 2026",
    location: "Indio, CA",
    dateRange: "Apr 10 - Apr 13, 2026",
    description: "Music festival adventure with top artists, desert vibes, and group camping",
    coverPhoto: `${DEMO_COVERS_BASE}/coachella-festival.jpg`,
    placesCount: 7,
    participants: [
      { id: 16, name: "Tyler", avatar: getMockAvatar("Tyler") },
      { id: 17, name: "Zoe", avatar: getMockAvatar("Zoe") },
      { id: 18, name: "Mason", avatar: getMockAvatar("Mason") },
      { id: 19, name: "Chloe", avatar: getMockAvatar("Chloe") },
      { id: 20, name: "Jordan", avatar: getMockAvatar("Jordan") },
      { id: 21, name: "Ethan", avatar: getMockAvatar("Ethan") },
      { id: 22, name: "Lily", avatar: getMockAvatar("Lily") },
      { id: 23, name: "Noah", avatar: getMockAvatar("Noah") },
      { id: 24, name: "Grace", avatar: getMockAvatar("Grace") },
      { id: 25, name: "Liam", avatar: getMockAvatar("Liam") },
      { id: 26, name: "Hannah", avatar: getMockAvatar("Hannah") },
      { id: 27, name: "Lucas", avatar: getMockAvatar("Lucas") },
      { id: 28, name: "Bella", avatar: getMockAvatar("Bella") },
      { id: 29, name: "Dylan", avatar: getMockAvatar("Dylan") },
      { id: 30, name: "Aria", avatar: getMockAvatar("Aria") },
      { id: 31, name: "Jackson", avatar: getMockAvatar("Jackson") },
      { id: 32, name: "Scarlett", avatar: getMockAvatar("Scarlett") },
      { id: 33, name: "Aiden", avatar: getMockAvatar("Aiden") },
      { id: 34, name: "Layla", avatar: getMockAvatar("Layla") },
      { id: 35, name: "Carter", avatar: getMockAvatar("Carter") },
      { id: 36, name: "Nora", avatar: getMockAvatar("Nora") },
      { id: 37, name: "Sebastian", avatar: getMockAvatar("Sebastian") }
    ]
  },
  {
    id: 6,
    title: "Cameron Knight's Dubai Birthday",
    location: "Dubai, UAE",
    dateRange: "Jul 5 - Jul 9, 2026",
    description: "Luxury birthday celebration in Dubai featuring Burj Khalifa, desert safari, yacht party, and fine dining",
    coverPhoto: `${DEMO_COVERS_BASE}/dubai-birthday.jpg`,
    placesCount: 4,
    participants: [
      { id: 21, name: "Cameron", avatar: getMockAvatar("Cameron") },
      { id: 22, name: "Alex", avatar: getMockAvatar("Alex") },
      { id: 23, name: "Jordan", avatar: getMockAvatar("Jordan") },
      { id: 24, name: "Taylor", avatar: getMockAvatar("Taylor") },
      { id: 25, name: "Morgan", avatar: getMockAvatar("Morgan") },
      { id: 26, name: "Casey", avatar: getMockAvatar("Casey") },
      { id: 27, name: "Riley", avatar: getMockAvatar("Riley") },
      { id: 28, name: "Avery", avatar: getMockAvatar("Avery") }
    ]
  },
  {
    id: 7,
    title: "Fantasy Football Chat's Annual Golf Outing",
    location: "Phoenix, Arizona",
    dateRange: "Feb 20 - Feb 23, 2026",
    description: "Annual guys' golf trip with tournaments, poker nights, and fantasy football draft",
    coverPhoto: `${DEMO_COVERS_BASE}/phoenix-golf-outing.jpg`,
    placesCount: 6,
    participants: [
      { id: 26, name: "Commissioner Mike", avatar: getMockAvatar("Mike") },
      { id: 27, name: "Big Rob", avatar: getMockAvatar("Rob") },
      { id: 28, name: "Tony", avatar: getMockAvatar("Tony") },
      { id: 29, name: "Dave", avatar: getMockAvatar("Dave") },
      { id: 30, name: "Chris", avatar: getMockAvatar("Chris") },
      { id: 31, name: "Steve", avatar: getMockAvatar("Steve") }
    ]
  },
  {
    id: 8,
    title: "Tulum Wellness Retreat",
    location: "Tulum, Mexico",
    dateRange: "Nov 10 - Nov 23, 2026",
    description: "Yoga and wellness focused retreat with breathwork, meditation, and spa treatments",
    coverPhoto: `${DEMO_COVERS_BASE}/tulum-yoga-wellness.jpg`,
    placesCount: 10,
    participants: Array.from({ length: 34 }, (_, i) => {
      const names = ["Elena Ramirez", "Jason Wu", "Amara Vance", "Sophia Chen", "Marcus Thompson", "Isla Rodriguez", "Maya Patel", "River Johnson", "Luna Martinez", "Phoenix Anderson", "Aurora Kim", "Sage Williams", "Willow Davis", "Ocean Brooks", "Sky Thompson", "Rain Garcia", "Storm Lee", "Ember Jones", "Aspen Miller", "Sierra Wilson", "Canyon Moore", "River Taylor", "Jade Martinez", "Crystal White", "Harmony Brown", "Serenity Clark", "Karma Lopez", "Zen Jackson", "Peace Harris", "Lotus Martin", "Chakra Robinson", "Mantra Lewis", "Aura Walker", "Nirvana Hall"];
      return { id: 32 + i, name: names[i] || `Wellness Guest ${i + 1}`, avatar: getMockAvatar(names[i] || `Guest${i}`) };
    })
  },
  {
    id: 9,
    title: "Sarah Gardelin's Promotion Celebration",
    location: "Napa Valley, CA",
    dateRange: "May 2 - May 5, 2026",
    description: "Celebratory wine country escape with close friends to mark a major career milestone, featuring tastings, spa treatments, and new adventures",
    coverPhoto: `${DEMO_COVERS_BASE}/napa-wine-getaway.jpg`,
    placesCount: 8,
    participants: [
      { id: 40, name: "Olivia Parker", avatar: getMockAvatar("Olivia") },
      { id: 41, name: "Mia Brooks", avatar: getMockAvatar("Mia") },
      { id: 42, name: "Sara Kang", avatar: getMockAvatar("Sara") },
      { id: 43, name: "Jessica Martinez", avatar: getMockAvatar("Jessica") },
      { id: 44, name: "Rachel Davis", avatar: getMockAvatar("Rachel") },
      { id: 45, name: "Amanda Wilson", avatar: getMockAvatar("Amanda") }
    ]
  },
  {
    id: 10,
    title: "Corporate Holiday Ski Trip – Aspen",
    location: "Aspen, CO",
    dateRange: "Dec 12 - Dec 15, 2026",
    description: "Company holiday celebration with skiing, team building, and winter activities featuring corporate lodging, group ski lessons, and team dinners",
    coverPhoto: `${DEMO_COVERS_BASE}/aspen-corporate-ski.jpg`,
    placesCount: 3,
    participants: Array.from({ length: 44 }, (_, i) => {
      const names = ["Tom Nguyen", "Heather Cole", "Luis Ortiz", "Sarah Kim", "Michael Chang", "Jennifer Lee", "David Park", "Lisa Wong", "Kevin Zhang", "Emily Chen", "Robert Smith", "Anna Garcia", "James Wilson", "Maria Rodriguez", "John Martinez", "Patricia Anderson", "Carlos Thomas", "Linda Taylor", "Daniel Moore", "Nancy Jackson", "Matthew White", "Karen Harris", "Anthony Martin", "Betty Thompson", "Mark Garcia", "Sandra Lee", "Donald Lewis", "Ashley Robinson", "Steven Clark", "Donna Walker", "Paul Hall", "Carol Allen", "Andrew Young", "Michelle King", "Joshua Wright", "Laura Lopez", "Kenneth Hill", "Kimberly Scott", "Brian Green", "Elizabeth Adams", "George Baker", "Deborah Nelson", "Edward Carter", "Jessica Mitchell"];
      return { id: 46 + i, name: names[i] || `Employee ${i + 1}`, avatar: getMockAvatar(names[i] || `Employee${i}`) };
    })
  },
  {
    id: 11,
    title: "Disney Cruise Family Vacation",
    location: "Port Canaveral, FL",
    dateRange: "Jun 15 - Jun 22, 2026",
    description: "Magical family cruise with Disney characters, activities, and island adventures",
    coverPhoto: `${DEMO_COVERS_BASE}/disney-family-cruise.jpg`,
    placesCount: 10,
    participants: [
      { id: 56, name: "Liam Turner", avatar: getMockAvatar("Liam") },
      { id: 57, name: "Emma Turner", avatar: getMockAvatar("Emma") },
      { id: 58, name: "Ella Turner", avatar: getMockAvatar("Ella") },
      { id: 59, name: "Noah Turner", avatar: getMockAvatar("Noah") },
      { id: 60, name: "Grace Turner", avatar: getMockAvatar("Grace") },
      { id: 61, name: "Grandpa Joe", avatar: getMockAvatar("Joe") },
      { id: 62, name: "Grandma Rose", avatar: getMockAvatar("Rose") }
    ]
  },
  {
    id: 12,
    title: "Yellowstone National-Park Hiking Adventure",
    location: "Yellowstone, WY",
    dateRange: "Jul 10 - Jul 17, 2026",
    description: "Outdoor adventure exploring geysers, wildlife, and backcountry hiking trails",
    coverPhoto: `${DEMO_COVERS_BASE}/yellowstone-hiking-group.jpg`,
    placesCount: 14,
    participants: [
      { id: 63, name: "Brent Miller", avatar: getMockAvatar("Brent") },
      { id: 64, name: "Nia Patel", avatar: getMockAvatar("Nia") },
      { id: 65, name: "Zoe Lewis", avatar: getMockAvatar("Zoe") },
      { id: 66, name: "Alex Rivera", avatar: getMockAvatar("Alex") },
      { id: 67, name: "Cameron Brooks", avatar: getMockAvatar("Cameron") }
    ]
  }
];

export const getTripById = (id: number): Trip | null => {
  return tripsData.find(trip => trip.id === id) || null;
};

// 🚀 OPTIMIZATION: Cache for generated mock data (supports both numeric and UUID string keys)
const mockDataCache = new Map<string, ReturnType<typeof generateTripMockData>>();

// City-specific link templates for realistic trip planning resources (4 per trip: Accommodation, Activity, Appetite, Attraction)
const getCitySpecificLinks = (location: string) => {
  const city = location.split(',')[0].trim();
  
  const linkTemplates: Record<string, Array<{ title: string; url: string; category: string; domain: string; description: string }>> = {
    'Cancun': [
      { title: 'Live Aqua Beach Resort Cancun', url: 'https://www.liveaqua.com/cancun', category: 'Accommodation', domain: 'liveaqua.com', description: 'Adults-only all-inclusive beachfront resort' },
      { title: 'Cenote Dos Ojos Snorkeling & Cave Diving', url: 'https://www.cenotedosojos.com/', category: 'Activity', domain: 'cenotedosojos.com', description: 'Underground cave system snorkeling tours' },
      { title: 'La Parrilla - Authentic Mexican Cuisine', url: 'https://www.laparrilla.com.mx/', category: 'Appetite', domain: 'laparrilla.com.mx', description: 'Traditional Yucatecan dishes and live mariachi' },
      { title: 'Chichén Itzá Archaeological Site', url: 'https://www.inah.gob.mx/zonas/146-zona-arqueologica-de-chichen-itza', category: 'Attraction', domain: 'inah.gob.mx', description: 'Ancient Mayan pyramid and UNESCO World Heritage site' }
    ],
    'Tokyo': [
      { title: 'Park Hyatt Tokyo', url: 'https://www.hyatt.com/en-US/hotel/japan/park-hyatt-tokyo/tyoph', category: 'Accommodation', domain: 'hyatt.com', description: 'Luxury hotel in Shinjuku with skyline views' },
      { title: 'teamLab Borderless Digital Art Museum', url: 'https://www.teamlab.art/e/borderless/', category: 'Activity', domain: 'teamlab.art', description: 'Immersive interactive digital art experience' },
      { title: 'Sukiyabashi Jiro Sushi Restaurant', url: 'https://www.sushi-jiro.jp/', category: 'Appetite', domain: 'sushi-jiro.jp', description: 'Three-Michelin-star sushi by master chef' },
      { title: 'Senso-ji Temple', url: 'https://www.senso-ji.jp/english/', category: 'Attraction', domain: 'senso-ji.jp', description: "Tokyo's oldest Buddhist temple in Asakusa" }
    ],
    'Bali': [
      { title: 'Mulia Bali Resort', url: 'https://www.themulia.com/mulia-bali', category: 'Accommodation', domain: 'themulia.com', description: 'Luxury beachfront resort with private beach' },
      { title: 'Mount Batur Sunrise Trek', url: 'https://www.balihai-cruises.com/batur', category: 'Activity', domain: 'balihai-cruises.com', description: 'Guided volcano trek with sunrise views' },
      { title: 'Locavore Restaurant Ubud', url: 'https://www.locavore.co.id/', category: 'Appetite', domain: 'locavore.co.id', description: 'Farm-to-table Indonesian fine dining' },
      { title: 'Tirta Empul Water Temple', url: 'https://www.bali.com/tirta-empul-temple.html', category: 'Attraction', domain: 'bali.com', description: 'Sacred Balinese Hindu water temple' }
    ],
    'Nashville': [
      { title: 'The Hermitage Hotel', url: 'https://www.thehermitagehotel.com/', category: 'Accommodation', domain: 'thehermitagehotel.com', description: 'Historic luxury hotel in downtown Nashville' },
      { title: 'Grand Ole Opry VIP Tour', url: 'https://www.opry.com/tour', category: 'Activity', domain: 'opry.com', description: 'Backstage tour of country music landmark' },
      { title: 'Hattie B\'s Hot Chicken', url: 'https://www.hattieb.com/', category: 'Appetite', domain: 'hattieb.com', description: 'Famous Nashville hot chicken restaurant' },
      { title: 'Country Music Hall of Fame', url: 'https://www.countrymusichalloffame.org/', category: 'Attraction', domain: 'countrymusichalloffame.org', description: 'Museum celebrating country music history' }
    ],
    'Indio': [
      { title: 'La Quinta Resort & Club', url: 'https://www.laquintaresort.com/', category: 'Accommodation', domain: 'laquintaresort.com', description: 'Luxury desert resort near festival grounds' },
      { title: 'Hot Air Balloon Ride Palm Desert', url: 'https://www.fantasticballoons.com/', category: 'Activity', domain: 'fantasticballoons.com', description: 'Scenic balloon flights over Coachella Valley' },
      { title: 'Tac/Quila Mexican Restaurant', url: 'https://tacquila.com/', category: 'Appetite', domain: 'tacquila.com', description: 'Upscale Mexican cuisine with desert views' },
      { title: 'Joshua Tree National Park', url: 'https://www.nps.gov/jotr/', category: 'Attraction', domain: 'nps.gov', description: 'Iconic desert landscape with unique rock formations' }
    ],
    'Dubai': [
      { title: 'Burj Al Arab Jumeirah', url: 'https://www.jumeirah.com/burj-al-arab', category: 'Accommodation', domain: 'jumeirah.com', description: 'Iconic sail-shaped luxury hotel' },
      { title: 'Desert Safari with BBQ Dinner', url: 'https://www.arabian-adventures.com/', category: 'Activity', domain: 'arabian-adventures.com', description: 'Dune bashing and traditional Bedouin camp' },
      { title: 'Nobu Dubai', url: 'https://www.noburestaurants.com/dubai', category: 'Appetite', domain: 'noburestaurants.com', description: 'World-famous Japanese-Peruvian fusion' },
      { title: 'Burj Khalifa Observation Deck', url: 'https://www.burjkhalifa.ae/', category: 'Attraction', domain: 'burjkhalifa.ae', description: "World's tallest building with stunning views" }
    ],
    'Phoenix': [
      { title: 'The Phoenician Resort', url: 'https://www.thephoenician.com/', category: 'Accommodation', domain: 'thephoenician.com', description: 'Luxury Scottsdale resort at Camelback Mountain' },
      { title: 'TPC Scottsdale Golf Course', url: 'https://www.tpc.com/scottsdale', category: 'Activity', domain: 'tpc.com', description: 'Championship golf course hosting PGA Tour' },
      { title: 'Steak 44', url: 'https://www.steak44.com/', category: 'Appetite', domain: 'steak44.com', description: 'Premier Phoenix steakhouse experience' },
      { title: 'Desert Botanical Garden', url: 'https://www.dbg.org/', category: 'Attraction', domain: 'dbg.org', description: 'Stunning desert plant collections and trails' }
    ],
    'Tulum': [
      { title: 'Azulik Resort', url: 'https://www.azulik.com/', category: 'Accommodation', domain: 'azulik.com', description: 'Eco-luxury treehouse resort on the beach' },
      { title: 'Gran Cenote Swimming', url: 'https://grancenote.com/', category: 'Activity', domain: 'grancenote.com', description: 'Crystal-clear cenote swimming and snorkeling' },
      { title: 'Hartwood Restaurant', url: 'https://www.hartwoodtulum.com/', category: 'Appetite', domain: 'hartwoodtulum.com', description: 'Farm-to-table dining by candlelight' },
      { title: 'Tulum Archaeological Zone', url: 'https://www.inah.gob.mx/zonas/zona-arqueologica-de-tulum', category: 'Attraction', domain: 'inah.gob.mx', description: 'Mayan ruins overlooking the Caribbean Sea' }
    ],
    'Napa Valley': [
      { title: 'Meadowood Napa Valley', url: 'https://www.meadowood.com/', category: 'Accommodation', domain: 'meadowood.com', description: 'Luxury estate resort in wine country' },
      { title: 'Hot Air Balloon Over Vineyards', url: 'https://www.balloonrides.com/napa', category: 'Activity', domain: 'balloonrides.com', description: 'Sunrise balloon flight with champagne toast' },
      { title: 'The French Laundry', url: 'https://www.thomaskeller.com/tfl', category: 'Appetite', domain: 'thomaskeller.com', description: 'Three-Michelin-star culinary experience' },
      { title: 'Opus One Winery', url: 'https://www.opusonewinery.com/', category: 'Attraction', domain: 'opusonewinery.com', description: 'Iconic Napa winery with premium tastings' }
    ],
    'Aspen': [
      { title: 'The Little Nell', url: 'https://www.thelittlenell.com/', category: 'Accommodation', domain: 'thelittlenell.com', description: 'Ski-in/ski-out luxury at base of Aspen Mountain' },
      { title: 'Aspen Skiing Company Lessons', url: 'https://www.aspensnowmass.com/lessons', category: 'Activity', domain: 'aspensnowmass.com', description: 'Expert ski and snowboard instruction' },
      { title: 'Matsuhisa Aspen', url: 'https://www.noburestaurants.com/matsuhisa-aspen', category: 'Appetite', domain: 'noburestaurants.com', description: 'Nobu\'s original mountain Japanese restaurant' },
      { title: 'Maroon Bells', url: 'https://www.aspenchamber.org/maroon-bells', category: 'Attraction', domain: 'aspenchamber.org', description: 'Colorado\'s most photographed peaks' }
    ],
    'Port Canaveral': [
      { title: 'Cape Canaveral Beach Resort', url: 'https://www.capecanaveralbeachresort.com/', category: 'Accommodation', domain: 'capecanaveralbeachresort.com', description: 'Oceanfront resort near cruise port' },
      { title: 'Kennedy Space Center Visitor Complex', url: 'https://www.kennedyspacecenter.com/', category: 'Activity', domain: 'kennedyspacecenter.com', description: 'NASA space exploration experience' },
      { title: 'Grills Seafood Deck', url: 'https://www.grillsseafood.com/', category: 'Appetite', domain: 'grillsseafood.com', description: 'Waterfront fresh seafood and rocket views' },
      { title: 'Exploration Tower', url: 'https://www.explorationtower.com/', category: 'Attraction', domain: 'explorationtower.com', description: '7-story observation tower with port views' }
    ],
    'Yellowstone': [
      { title: 'Old Faithful Inn', url: 'https://www.yellowstonenationalparklodges.com/lodgings/hotel/old-faithful-inn/', category: 'Accommodation', domain: 'yellowstonenationalparklodges.com', description: 'Historic lodge overlooking Old Faithful geyser' },
      { title: 'Yellowstone Wildlife Safari', url: 'https://www.yellowstonesafari.com/', category: 'Activity', domain: 'yellowstonesafari.com', description: 'Guided wildlife viewing and photography tours' },
      { title: 'Lake Yellowstone Hotel Dining Room', url: 'https://www.yellowstonenationalparklodges.com/dine/lake-yellowstone-hotel-dining-room/', category: 'Appetite', domain: 'yellowstonenationalparklodges.com', description: 'Elegant lakeside dining in the park' },
      { title: 'Grand Prismatic Spring', url: 'https://www.nps.gov/yell/planyourvisit/grand-prismatic-spring.htm', category: 'Attraction', domain: 'nps.gov', description: 'Largest hot spring in the United States' }
    ]
  };
  
  return linkTemplates[city] || [
    { title: `${city} Hotels on Booking.com`, url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}`, category: 'Accommodation', domain: 'booking.com', description: `Find the best hotels in ${city}` },
    { title: `${city} Activities on Viator`, url: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(city)}`, category: 'Activity', domain: 'viator.com', description: `Tours and activities in ${city}` },
    { title: `${city} Restaurants on Yelp`, url: `https://www.yelp.com/search?find_desc=Restaurants&find_loc=${encodeURIComponent(city)}`, category: 'Appetite', domain: 'yelp.com', description: `Best restaurants in ${city}` },
    { title: `Things to do in ${city}`, url: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(city)}`, category: 'Attraction', domain: 'tripadvisor.com', description: `Top attractions in ${city}` }
  ];
};

/**
 * Generate comprehensive mock data for a trip.
 * Accepts a Trip object, trip ID (number), or UUID string.
 */
export const generateTripMockData = (tripOrId: Trip | number | string) => {
  // Extract ID from Trip object or use directly
  const tripId = typeof tripOrId === 'object' && tripOrId !== null ? tripOrId.id : tripOrId;
  const cacheKey = String(tripId);
  
  // Check cache first
  if (mockDataCache.has(cacheKey)) {
    return mockDataCache.get(cacheKey)!;
  }
  
  // Get trip data - use passed Trip object or look up by ID
  const trip = typeof tripOrId === 'object' && tripOrId !== null 
    ? tripOrId 
    : (typeof tripId === 'number' ? getTripById(tripId) : getTripById(parseInt(String(tripId), 10)));
  
  const participants = trip?.participants || [
    { id: 1, name: "Demo User", avatar: getMockAvatar("Demo") }
  ];
  
  const location = trip?.location || "Unknown Location";
  
  // Generate mock calendar events
  const generateCalendarEvents = () => {
    const events = [
      { id: 1, title: "Arrival & Check-in", date: "Day 1", time: "2:00 PM", type: "logistics" },
      { id: 2, title: "Welcome Dinner", date: "Day 1", time: "7:00 PM", type: "dining" },
      { id: 3, title: "Group Activity", date: "Day 2", time: "10:00 AM", type: "activity" },
      { id: 4, title: "Free Time / Explore", date: "Day 2", time: "2:00 PM", type: "free" },
      { id: 5, title: "Sunset Experience", date: "Day 2", time: "6:00 PM", type: "activity" },
      { id: 6, title: "Farewell Brunch", date: "Day 3", time: "10:00 AM", type: "dining" },
      { id: 7, title: "Departure", date: "Day 3", time: "1:00 PM", type: "logistics" }
    ];
    return events;
  };

  // Generate mock messages with realistic chat flow
  const generateMessages = () => {
    const messageTemplates = [
      { author: 0, content: "Hey everyone! So excited for this trip! 🎉", time: "2 days ago" },
      { author: 1, content: "Can't wait! Has everyone booked their flights?", time: "2 days ago" },
      { author: 2, content: "Yes! Arriving Thursday afternoon", time: "1 day ago" },
      { author: 0, content: "Perfect! I'll share the itinerary tonight", time: "1 day ago" },
      { author: 3, content: "Should we rent a car or use rideshare?", time: "1 day ago" },
      { author: 1, content: "I think rideshare might be easier in the city", time: "20 hours ago" },
      { author: 4, content: "Agreed! Plus we can all explore together 🚗", time: "18 hours ago" },
      { author: 2, content: "What's the dress code for dinner?", time: "12 hours ago" },
      { author: 0, content: "Smart casual! Nothing too fancy", time: "10 hours ago" },
      { author: 5, content: "This is going to be amazing! 🙌", time: "8 hours ago" },
      { author: 3, content: "Just packed my bags! Ready to go!", time: "4 hours ago" },
      { author: 1, content: "See everyone soon! Safe travels! ✈️", time: "2 hours ago" }
    ];
    
    return messageTemplates.map((msg, idx) => ({
      id: idx + 1,
      author: participants[msg.author % participants.length]?.name || "Guest",
      authorAvatar: participants[msg.author % participants.length]?.avatar || getMockAvatar("Guest"),
      content: msg.content,
      time: msg.time,
      reactions: idx % 3 === 0 ? ["❤️", "🎉"] : idx % 2 === 0 ? ["👍"] : []
    }));
  };

  // Generate mock media items
  const generateMedia = () => {
    const mediaItems = [
      { id: 1, type: "photo", url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400", uploadedBy: participants[0]?.name || "Guest", date: "Day 1" },
      { id: 2, type: "photo", url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400", uploadedBy: participants[1]?.name || "Guest", date: "Day 1" },
      { id: 3, type: "photo", url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400", uploadedBy: participants[2]?.name || "Guest", date: "Day 2" },
      { id: 4, type: "photo", url: "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=400", uploadedBy: participants[0]?.name || "Guest", date: "Day 2" },
      { id: 5, type: "photo", url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400", uploadedBy: participants[3]?.name || "Guest", date: "Day 3" },
      { id: 6, type: "photo", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400", uploadedBy: participants[1]?.name || "Guest", date: "Day 3" }
    ];
    return mediaItems;
  };

  // Generate mock payments/expenses
  const generatePayments = () => {
    const payments = [
      { id: 1, description: "Accommodation (4 nights)", amount: 1200, paidBy: participants[0]?.name || "Guest", splitWith: participants.slice(0, 4).map(p => p.name), status: "pending" },
      { id: 2, description: "Welcome dinner", amount: 280, paidBy: participants[1]?.name || "Guest", splitWith: participants.slice(0, 6).map(p => p.name), status: "settled" },
      { id: 3, description: "Activity booking", amount: 450, paidBy: participants[2]?.name || "Guest", splitWith: participants.slice(0, 8).map(p => p.name), status: "pending" },
      { id: 4, description: "Transportation", amount: 180, paidBy: participants[3]?.name || "Guest", splitWith: participants.slice(0, 4).map(p => p.name), status: "settled" }
    ];
    return payments;
  };

  // Generate mock links using city-specific templates
  const generateLinks = () => {
    return getCitySpecificLinks(location);
  };

  const mockData = {
    calendarEvents: generateCalendarEvents(),
    messages: generateMessages(),
    media: generateMedia(),
    payments: generatePayments(),
    links: generateLinks(),
    participants
  };
  
  // Cache the result
  mockDataCache.set(cacheKey, mockData);
  
  return mockData;
};
