// Import all trip cover images
import cancunSpringBreak from '../assets/trip-covers/cancun-spring-break.webp';
import tokyoAdventure from '../assets/trip-covers/tokyo-adventure.webp';
import baliDestinationWedding from '../assets/trip-covers/bali-destination-wedding.webp';
import nashvilleBachelorette from '../assets/trip-covers/nashville-bachelorette.webp';
import cochelleFestivalNew from '../assets/trip-covers/coachella-festival-new.webp';
import aspenFamilySummer from '../assets/trip-covers/aspen-family-summer.webp';
import phoenixGolfOuting from '../assets/trip-covers/phoenix-golf-outing.webp';
import tulumYogaWellness from '../assets/trip-covers/tulum-yoga-wellness.webp';
import napaWineGetaway from '../assets/trip-covers/napa-wine-getaway.webp';
import aspenCorporateSki from '../assets/trip-covers/aspen-corporate-ski.webp';
import disneyFamilyCruise from '../assets/trip-covers/disney-family-cruise.webp';
import yellowstoneHikingGroup from '../assets/trip-covers/yellowstone-hiking-group.webp';
import { getMockAvatar } from '../utils/mockAvatars';

export interface TripParticipant {
  id: number;
  name: string;
  avatar: string;
}

// TODO: When connecting to Supabase, fetch placesCount with:
// SELECT COUNT(*) as placesCount FROM trip_links WHERE trip_id = trips.id
export interface Trip {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  title: string;
  location: string;
  dateRange: string;
  description: string;
  participants: TripParticipant[];
  coverPhoto?: string;
  placesCount?: number; // Number of saved trip links
  // Feature toggles for Pro/Event trips
  enabled_features?: string[];
  trip_type?: 'consumer' | 'pro' | 'event';
  archived?: boolean;
  // Privacy settings
  privacy_mode?: 'standard' | 'high';
  ai_access_enabled?: boolean;
}

export const tripsData: Trip[] = [
  {
    id: 1,
    title: "Spring Break Cancun 2026 Kappa Alpha Psi Trip",
    location: "Cancun, Mexico",
    dateRange: "Mar 15 - Mar 22, 2026",
    description: "Brotherhood spring break getaway with beach activities, nightlife, and bonding experiences",
    coverPhoto: cancunSpringBreak,
    placesCount: 15,
    participants: [
      { id: 1, name: "Marcus", avatar: getMockAvatar("Marcus") },
      { id: 2, name: "Jamal", avatar: getMockAvatar("Jamal") },
      { id: 3, name: "Darius", avatar: getMockAvatar("Darius") },
      { id: 4, name: "Terrell", avatar: getMockAvatar("Terrell") },
      { id: 5, name: "Jerome", avatar: getMockAvatar("Jerome") }
    ]
  },
  {
    id: 2,
    title: "Tokyo Adventure",
    location: "Tokyo, Japan",
    dateRange: "Oct 5 - Oct 15, 2025",
    description: "Cultural exploration of Japan's capital with temples, modern tech districts, and amazing cuisine",
    coverPhoto: tokyoAdventure,
    placesCount: 18,
    participants: [
      { id: 4, name: "Alex", avatar: getMockAvatar("Alex") },
      { id: 5, name: "Maria", avatar: getMockAvatar("Maria") },
      { id: 6, name: "David", avatar: getMockAvatar("David") }
    ]
  },
  {
    id: 3,
    title: "Jack and Jill's destination wedding",
    location: "Bali, Indonesia",
    dateRange: "Dec 10 - Dec 20, 2025",
    description: "Romantic destination wedding celebration with family and friends in paradise",
    coverPhoto: baliDestinationWedding,
    placesCount: 8,
    participants: [
      { id: 7, name: "Jack", avatar: getMockAvatar("Jack") },
      { id: 8, name: "Jill", avatar: getMockAvatar("Jill") },
      { id: 9, name: "Steve", avatar: getMockAvatar("Steve") },
      { id: 10, name: "Emma", avatar: getMockAvatar("Emma") }
    ]
  },
  {
    id: 4,
    title: "Kristen's Bachelorette Party",
    location: "Nashville, TN",
    dateRange: "Nov 8 - Nov 10, 2025",
    description: "Epic bachelorette celebration with honky-tonk bars, live music, and unforgettable memories",
    coverPhoto: nashvilleBachelorette,
    placesCount: 12,
    participants: [
      { id: 10, name: "Kristen", avatar: getMockAvatar("Kristen") },
      { id: 11, name: "Ashley", avatar: getMockAvatar("Ashley") },
      { id: 12, name: "Megan", avatar: getMockAvatar("Megan") },
      { id: 13, name: "Taylor", avatar: getMockAvatar("Taylor") },
      { id: 14, name: "Sam", avatar: getMockAvatar("Sam") },
      { id: 15, name: "Jenna", avatar: getMockAvatar("Jenna") }
    ]
  },
  {
    id: 5,
    title: "Coachella Squad 2026",
    location: "Indio, CA",
    dateRange: "Apr 10 - Apr 13, 2026",
    description: "Music festival adventure with top artists, desert vibes, and group camping",
    coverPhoto: cochelleFestivalNew,
    placesCount: 10,
    participants: [
      { id: 16, name: "Tyler", avatar: getMockAvatar("Tyler") },
      { id: 17, name: "Zoe", avatar: getMockAvatar("Zoe") },
      { id: 18, name: "Mason", avatar: getMockAvatar("Mason") },
      { id: 19, name: "Chloe", avatar: getMockAvatar("Chloe") },
      { id: 20, name: "Jordan", avatar: getMockAvatar("Jordan") }
    ]
  },
  {
    id: 6,
    title: "Johnson Family Summer Vacay",
    location: "Aspen, CO",
    dateRange: "Jul 20 - Jul 28, 2025",
    description: "Multi-generational family retreat with hiking, spa time, and quality family bonding",
    coverPhoto: aspenFamilySummer,
    placesCount: 12,
    participants: [
      { id: 21, name: "Dad (Mike)", avatar: getMockAvatar("Mike") },
      { id: 22, name: "Mom (Linda)", avatar: getMockAvatar("Linda") },
      { id: 23, name: "Katie", avatar: getMockAvatar("Katie") },
      { id: 24, name: "Tommy", avatar: getMockAvatar("Tommy") },
      { id: 25, name: "Grandma Pat", avatar: getMockAvatar("Pat") }
    ]
  },
  {
    id: 7,
    title: "Fantasy Football Chat's Annual Golf Outing",
    location: "Phoenix, Arizona",
    dateRange: "Feb 20 - Feb 23, 2025",
    description: "Annual guys' golf trip with tournaments, poker nights, and fantasy football draft",
    coverPhoto: phoenixGolfOuting,
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
    dateRange: "Nov 10 - Nov 16, 2025",
    description: "Yoga and wellness focused retreat with breathwork, meditation, and spa treatments",
    coverPhoto: tulumYogaWellness,
    placesCount: 10,
    participants: [
      { id: 32, name: "Elena Ramirez", avatar: getMockAvatar("Elena") },
      { id: 33, name: "Jason Wu", avatar: getMockAvatar("Jason") },
      { id: 34, name: "Amara Vance", avatar: getMockAvatar("Amara") },
      { id: 35, name: "Sophia Chen", avatar: getMockAvatar("Sophia") },
      { id: 36, name: "Marcus Thompson", avatar: getMockAvatar("Marcus") },
      { id: 37, name: "Isla Rodriguez", avatar: getMockAvatar("Isla") },
      { id: 38, name: "Maya Patel", avatar: getMockAvatar("Maya") },
      { id: 39, name: "River Johnson", avatar: getMockAvatar("River") }
    ]
  },
  {
    id: 9,
    title: "Newly Divorced Wine-Tasting Getaway",
    location: "Napa Valley, CA",
    dateRange: "May 2 - May 5, 2025",
    description: "Celebratory wine country escape with tastings, spa treatments, and new beginnings",
    coverPhoto: napaWineGetaway,
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
    dateRange: "Dec 12 - Dec 17, 2025",
    description: "Company holiday celebration with skiing, team building, and winter activities",
    coverPhoto: aspenCorporateSki,
    placesCount: 12,
    participants: [
      { id: 46, name: "Tom Nguyen", avatar: getMockAvatar("Tom") },
      { id: 47, name: "Heather Cole", avatar: getMockAvatar("Heather") },
      { id: 48, name: "Luis Ortiz", avatar: getMockAvatar("Luis") },
      { id: 49, name: "Sarah Kim", avatar: getMockAvatar("Sarah") },
      { id: 50, name: "Michael Chang", avatar: getMockAvatar("Michael") },
      { id: 51, name: "Jennifer Lee", avatar: getMockAvatar("Jennifer") },
      { id: 52, name: "David Park", avatar: getMockAvatar("David") },
      { id: 53, name: "Lisa Wong", avatar: getMockAvatar("Lisa") },
      { id: 54, name: "Kevin Zhang", avatar: getMockAvatar("Kevin") },
      { id: 55, name: "Emily Chen", avatar: getMockAvatar("Emily") }
    ]
  },
  {
    id: 11,
    title: "Disney Cruise Family Vacation",
    location: "Port Canaveral, FL",
    dateRange: "Jun 15 - Jun 22, 2025",
    description: "Magical family cruise with Disney characters, activities, and island adventures",
    coverPhoto: disneyFamilyCruise,
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
    dateRange: "Jul 10 - Jul 17, 2025",
    description: "Outdoor adventure exploring geysers, wildlife, and backcountry hiking trails",
    coverPhoto: yellowstoneHikingGroup,
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

// City-specific link templates for realistic trip planning resources
const getCitySpecificLinks = (location: string) => {
  const city = location.split(',')[0].trim();
  
  const linkTemplates: Record<string, Array<{ title: string; url: string; category: string; domain: string; description: string }>> = {
    'Cancun': [
      { title: 'Cancun All-Inclusive Resort Deals', url: 'https://www.booking.com/city/mx/cancun.html', category: 'Accommodation', domain: 'booking.com', description: 'Top-rated beachfront resorts and hotels' },
      { title: 'Chichen Itza Day Trip from Cancun', url: 'https://www.viator.com/Cancun/d631-ttd', category: 'Activities', domain: 'viator.com', description: 'Ancient Mayan ruins tour with guide' },
      { title: 'Cancun Hotel Zone Nightlife Guide', url: 'https://www.timeout.com/cancun/nightlife', category: 'Nightlife', domain: 'timeout.com', description: 'Best clubs, bars, and beach parties' },
      { title: 'Best Tacos and Seafood in Cancun', url: 'https://www.tripadvisor.com/Restaurants-g150807-Cancun_Yucatan_Peninsula.html', category: 'Food', domain: 'tripadvisor.com', description: 'Local favorites and beachfront dining' },
      { title: 'Isla Mujeres Ferry & Snorkeling', url: 'https://www.getyourguide.com/cancun-l138/', category: 'Activities', domain: 'getyourguide.com', description: 'Island day trip with water activities' }
    ],
    'Tokyo': [
      { title: 'Tokyo Shibuya & Shinjuku Hotel Guide', url: 'https://www.booking.com/city/jp/tokyo.html', category: 'Accommodation', domain: 'booking.com', description: 'Central hotels near train stations' },
      { title: 'Tokyo Skytree Fast-Track Tickets', url: 'https://www.klook.com/activity/233-tokyo-skytree-tokyo/', category: 'Attractions', domain: 'klook.com', description: 'Skip-the-line observation deck access' },
      { title: 'Tsukiji Outer Market Food Tour', url: 'https://www.viator.com/Tokyo-tours/Food-Tours/d332-g6', category: 'Food', domain: 'viator.com', description: 'Fresh sushi and street food experience' },
      { title: 'Shibuya Nightlife & Karaoke Bars', url: 'https://www.timeout.com/tokyo/nightlife', category: 'Nightlife', domain: 'timeout.com', description: 'Best bars, izakayas, and karaoke spots' },
      { title: 'Day Trip to Mount Fuji & Hakone', url: 'https://www.getyourguide.com/tokyo-l193/', category: 'Activities', domain: 'getyourguide.com', description: 'Scenic tour with onsen experience' }
    ],
    'Bali': [
      { title: 'Ubud & Seminyak Luxury Villas', url: 'https://www.airbnb.com/s/Bali--Indonesia/homes', category: 'Accommodation', domain: 'airbnb.com', description: 'Private villas with pools and rice field views' },
      { title: 'Tegallalang Rice Terraces & Swing', url: 'https://www.getyourguide.com/bali-l294/', category: 'Attractions', domain: 'getyourguide.com', description: 'Instagram-worthy jungle swings and terraces' },
      { title: 'Balinese Cooking Class in Ubud', url: 'https://www.viator.com/Bali/d318-ttd', category: 'Activities', domain: 'viator.com', description: 'Traditional market tour and cooking lesson' },
      { title: 'Best Beach Clubs in Canggu & Seminyak', url: 'https://www.timeout.com/bali/beach-clubs', category: 'Nightlife', domain: 'timeout.com', description: 'Sunset cocktails and beach party venues' },
      { title: 'Tanah Lot Temple Sunset Tour', url: 'https://www.klook.com/activity/2347-tanah-lot-temple-tour-bali/', category: 'Attractions', domain: 'klook.com', description: 'Sacred sea temple with sunset views' }
    ],
    'Nashville': [
      { title: 'Broadway Honky Tonks & Live Music', url: 'https://www.visitmusiccity.com/things-to-do/honky-tonks', category: 'Nightlife', domain: 'visitmusiccity.com', description: "Tootsie's, Robert's, and legendary bars" },
      { title: 'Nashville Hot Chicken Tour', url: 'https://www.tripadvisor.com/Restaurants-g55229-Nashville_Tennessee.html', category: 'Food', domain: 'tripadvisor.com', description: "Prince's, Hattie B's, and local favorites" },
      { title: 'Grand Ole Opry Show Tickets', url: 'https://www.opry.com/', category: 'Attractions', domain: 'opry.com', description: 'Legendary country music venue performances' },
      { title: 'Downtown Nashville Hotels Near Broadway', url: 'https://www.booking.com/city/us/nashville.html', category: 'Accommodation', domain: 'booking.com', description: 'Walking distance to all honky-tonks' },
      { title: 'Nashville Pedal Tavern Bar Crawl', url: 'https://www.nashvillepedaltavern.com/', category: 'Activities', domain: 'nashvillepedaltavern.com', description: 'Party bike tour through downtown' }
    ],
    'Indio': [
      { title: 'Coachella Festival Official Site', url: 'https://www.coachella.com/', category: 'Event', domain: 'coachella.com', description: 'Lineup, tickets, and festival info' },
      { title: 'Coachella Camping & Shuttle Passes', url: 'https://www.coachella.com/camping', category: 'Accommodation', domain: 'coachella.com', description: 'On-site camping and transportation options' },
      { title: 'Palm Springs Hotels Near Coachella', url: 'https://www.booking.com/city/us/palm-springs.html', category: 'Accommodation', domain: 'booking.com', description: '30-minute drive to festival grounds' },
      { title: 'Coachella Survival Guide & Tips', url: 'https://www.festivalpass.com/coachella-survival-guide', category: 'Tips', domain: 'festivalpass.com', description: 'What to pack, wear, and expect' },
      { title: 'Coachella After-Parties & Pool Parties', url: 'https://edmidentity.com/coachella-parties/', category: 'Nightlife', domain: 'edmidentity.com', description: 'Official and unofficial festival events' }
    ],
    'Aspen': [
      { title: 'Aspen Snowmass Ski Resort Info', url: 'https://www.aspensnowmass.com/', category: 'Activities', domain: 'aspensnowmass.com', description: 'Trail maps, lift tickets, and conditions' },
      { title: 'Luxury Ski-In/Ski-Out Lodges', url: 'https://www.booking.com/city/us/aspen.html', category: 'Accommodation', domain: 'booking.com', description: 'Premium mountain hotels and condos' },
      { title: 'Aspen Mountain Hiking Trails (Summer)', url: 'https://www.alltrails.com/parks/us/colorado/aspen', category: 'Activities', domain: 'alltrails.com', description: 'Maroon Bells and scenic backcountry routes' },
      { title: 'Best Restaurants in Downtown Aspen', url: 'https://www.tripadvisor.com/Restaurants-g29141-Aspen_Colorado.html', category: 'Food', domain: 'tripadvisor.com', description: 'Fine dining and après-ski spots' },
      { title: 'Aspen Spa & Wellness Centers', url: 'https://www.aspenchamber.org/wellness', category: 'Activities', domain: 'aspenchamber.org', description: 'Luxury spa treatments and hot springs' }
    ],
    'Phoenix': [
      { title: 'Scottsdale Golf Course Tee Times', url: 'https://www.golfnow.com/phoenix', category: 'Activities', domain: 'golfnow.com', description: 'TPC Scottsdale and top desert courses' },
      { title: 'Phoenix Steakhouses & Dining', url: 'https://www.tripadvisor.com/Restaurants-g31310-Phoenix_Arizona.html', category: 'Food', domain: 'tripadvisor.com', description: "Mastro's, Durant's, and local favorites" },
      { title: 'Scottsdale Resort Hotels with Golf', url: 'https://www.booking.com/city/us/scottsdale.html', category: 'Accommodation', domain: 'booking.com', description: 'Luxury resorts with championship courses' },
      { title: 'Old Town Scottsdale Nightlife', url: 'https://www.timeout.com/phoenix/bars', category: 'Nightlife', domain: 'timeout.com', description: 'Bars, clubs, and entertainment district' },
      { title: 'Desert Jeep Tours & Hiking', url: 'https://www.viator.com/Phoenix/d4523-ttd', category: 'Activities', domain: 'viator.com', description: 'Sonoran Desert adventure experiences' }
    ],
    'Tulum': [
      { title: 'Tulum Beachfront Boutique Hotels', url: 'https://www.booking.com/city/mx/tulum.html', category: 'Accommodation', domain: 'booking.com', description: 'Eco-chic resorts on the Caribbean coast' },
      { title: 'Tulum Yoga Retreats & Classes', url: 'https://www.bookyogaretreats.com/tulum', category: 'Activities', domain: 'bookyogaretreats.com', description: 'Beachfront yoga studios and wellness centers' },
      { title: 'Cenote Swimming & Snorkeling Tours', url: 'https://www.getyourguide.com/tulum-l1087/', category: 'Activities', domain: 'getyourguide.com', description: 'Underground caves and natural pools' },
      { title: 'Tulum Mayan Ruins Tickets', url: 'https://www.viator.com/Tulum/d5165-ttd', category: 'Attractions', domain: 'viator.com', description: 'Clifftop archaeological site tours' },
      { title: 'Best Vegan Restaurants in Tulum', url: 'https://www.tripadvisor.com/Restaurants-g150813-Tulum_Yucatan_Peninsula.html', category: 'Food', domain: 'tripadvisor.com', description: 'Healthy cafes and organic dining' }
    ],
    'Napa Valley': [
      { title: 'Napa Valley Winery Tours & Tastings', url: 'https://www.viator.com/Napa-Valley/d909-ttd', category: 'Activities', domain: 'viator.com', description: 'Full-day wine tasting experiences' },
      { title: 'Luxury Spa Resorts in Napa', url: 'https://www.booking.com/region/us/napa-valley.html', category: 'Accommodation', domain: 'booking.com', description: 'Auberge, Carneros, and vineyard estates' },
      { title: 'Michelin-Star Restaurants Napa', url: 'https://www.tripadvisor.com/Restaurants-g32766-Napa_Napa_Valley_California.html', category: 'Food', domain: 'tripadvisor.com', description: 'French Laundry and fine dining' },
      { title: 'Napa Valley Hot Air Balloon Rides', url: 'https://www.napavalleyballoons.com/', category: 'Activities', domain: 'napavalleyballoons.com', description: 'Sunrise flights over vineyards' },
      { title: 'Calistoga Spa & Mud Bath Packages', url: 'https://www.visitcalifornia.com/experience/calistoga-spas/', category: 'Activities', domain: 'visitcalifornia.com', description: 'Volcanic mud treatments and hot springs' }
    ],
    'Port Canaveral': [
      { title: 'Disney Cruise Line Official Site', url: 'https://disneycruise.disney.go.com/', category: 'Cruise', domain: 'disneycruise.disney.go.com', description: 'Booking, itineraries, and onboard activities' },
      { title: 'Port Canaveral Parking & Hotels', url: 'https://www.portcanaveral.com/Cruise/Pre-Post-Cruise-Hotels', category: 'Accommodation', domain: 'portcanaveral.com', description: 'Pre-cruise hotels with shuttle service' },
      { title: 'Kennedy Space Center Tickets', url: 'https://www.kennedyspacecenter.com/', category: 'Attractions', domain: 'kennedyspacecenter.com', description: 'NASA tours before or after cruise' },
      { title: 'Cocoa Beach Restaurants & Dining', url: 'https://www.tripadvisor.com/Restaurants-g34044-Cocoa_Beach_Florida.html', category: 'Food', domain: 'tripadvisor.com', description: 'Fresh seafood and beachfront cafes' },
      { title: 'Disney Cruise Packing Tips', url: 'https://www.disneycruiselineblog.com/packing-list/', category: 'Tips', domain: 'disneycruiselineblog.com', description: 'What to bring for families with kids' }
    ],
    'Yellowstone': [
      { title: 'Yellowstone National Park Passes', url: 'https://www.nps.gov/yell/planyourvisit/fees.htm', category: 'Entrance', domain: 'nps.gov', description: 'Entry fees and annual pass options' },
      { title: 'Old Faithful Inn & Park Lodges', url: 'https://www.yellowstonenationalparklodges.com/', category: 'Accommodation', domain: 'yellowstonenationalparklodges.com', description: 'Historic in-park lodging reservations' },
      { title: 'Yellowstone Geyser & Wildlife Tours', url: 'https://www.viator.com/Yellowstone-National-Park/d5509-ttd', category: 'Activities', domain: 'viator.com', description: 'Guided tours of geysers, bison, and bears' },
      { title: 'Best Hiking Trails in Yellowstone', url: 'https://www.alltrails.com/parks/us/wyoming/yellowstone-national-park', category: 'Activities', domain: 'alltrails.com', description: 'Grand Prismatic, Lamar Valley, and backcountry' },
      { title: 'Yellowstone Safety & Wildlife Tips', url: 'https://www.nps.gov/yell/planyourvisit/safety.htm', category: 'Tips', domain: 'nps.gov', description: 'Bear safety and park regulations' }
    ]
  };
  
  return linkTemplates[city] || [
    { title: `Visit ${city} - Official Guide`, url: `https://www.google.com/search?q=visit+${city.replace(/\s/g, '+')}`, category: 'General', domain: 'google.com', description: `Comprehensive ${city} travel information` },
    { title: `Things to Do in ${city}`, url: `https://www.tripadvisor.com/Tourism-g${city.replace(/\s/g, '_')}.html`, category: 'Attractions', domain: 'tripadvisor.com', description: `Top-rated activities and sights` },
    { title: `Best Restaurants ${city}`, url: `https://www.yelp.com/search?find_desc=restaurants&find_loc=${city.replace(/\s/g, '+')}`, category: 'Food', domain: 'yelp.com', description: `Local dining recommendations` },
    { title: `${city} Hotels & Accommodation`, url: `https://www.booking.com/searchresults.html?ss=${city.replace(/\s/g, '+')}`, category: 'Accommodation', domain: 'booking.com', description: `Places to stay in ${city}` },
    { title: `Getting Around ${city}`, url: `https://www.google.com/maps/place/${city.replace(/\s/g, '+')}`, category: 'Transportation', domain: 'google.com', description: `Maps and navigation for ${city}` }
  ];
};

export const generateTripMockData = (trip: Trip) => {
  // Convert id to string for consistent cache key
  const cacheKey = String(trip.id);
  
  // Check cache first for performance
  if (mockDataCache.has(cacheKey)) {
    return mockDataCache.get(cacheKey)!;
  }

  const participantNames = trip.participants.map(p => p.name);
  const cityLinks = getCitySpecificLinks(trip.location);
  
  const mockData = {
    basecamp: {
      name: `${trip.location.split(',')[0]} Base Hotel`,
      address: `123 Main Street, ${trip.location}`
    },
    broadcasts: [
      { 
        id: 1, 
        senderName: participantNames[0] || "Organizer", 
        content: `Looking forward to ${trip.title}! Everything is confirmed and ready to go.`, 
        timestamp: "2025-01-15T15:30:00Z" 
      },
      { 
        id: 2, 
        senderName: participantNames[1] || "Coordinator", 
        content: `Just confirmed all arrangements for ${trip.location}. This is going to be amazing!`, 
        timestamp: "2025-01-15T10:00:00Z" 
      }
    ],
    links: cityLinks.map((link, index) => ({
      id: index + 1,
      title: link.title,
      url: link.url,
      category: link.category,
      domain: link.domain,
      description: link.description
    })),
    itinerary: [
      {
        date: trip.dateRange.split(' - ')[0].replace(/\w{3} /, '2025-03-'),
        events: [
          { title: "Arrival & Check-in", location: `${trip.location.split(',')[0]} Base Hotel`, time: "14:00" },
          { title: "Welcome Dinner", location: `Local Restaurant in ${trip.location.split(',')[0]}`, time: "19:30" }
        ]
      }
    ]
  };

  // Cache for future calls
  mockDataCache.set(cacheKey, mockData);
  return mockData;
};
