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

export interface Trip {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  title: string;
  location: string;
  dateRange: string;
  description: string;
  participants: TripParticipant[];
  coverPhoto?: string;
  placesCount?: number; // Number of saved trip links (from trip_links count)
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
    location: "Saratoga Springs, NY",
    dateRange: "Jul 20 - Jul 28, 2025",
    description: "Multi-generational family retreat with horse racing, spa time, and quality family bonding",
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
      { title: 'The Mulia Resort - Nusa Dua', url: 'https://www.themulia.com/', category: 'Accommodation', domain: 'themulia.com', description: 'Beachfront luxury resort with private pools' },
      { title: 'Bali Swing at Tegallalang Rice Terraces', url: 'https://baliswing.com/', category: 'Activity', domain: 'baliswing.com', description: 'Jungle swings over rice paddies and waterfall' },
      { title: 'Locavore Restaurant', url: 'https://www.locavore.co.id/', category: 'Appetite', domain: 'locavore.co.id', description: 'Award-winning contemporary Indonesian tasting menu' },
      { title: 'Uluwatu Temple', url: 'https://bali.com/bali/attractions/uluwatu-temple/', category: 'Attraction', domain: 'bali.com', description: 'Clifftop temple with sunset Kecak fire dance' }
    ],
    'Nashville': [
      { title: 'The Hermitage Hotel', url: 'https://www.thehermitagehotel.com/', category: 'Accommodation', domain: 'thehermitagehotel.com', description: 'Historic luxury hotel downtown near Broadway' },
      { title: 'Nashville Pedal Tavern', url: 'https://nashvillepedaltavern.com/', category: 'Activity', domain: 'nashvillepedaltavern.com', description: 'Party bike bar crawl through downtown' },
      { title: "Hattie B's Hot Chicken", url: 'https://hattieb.com/', category: 'Appetite', domain: 'hattieb.com', description: 'Legendary Nashville hot chicken restaurant' },
      { title: 'Grand Ole Opry', url: 'https://www.opry.com/', category: 'Attraction', domain: 'opry.com', description: 'Iconic country music venue and live shows' }
    ],
    'Indio': [
      { title: 'Renaissance Indian Wells Resort & Spa', url: 'https://www.marriott.com/hotels/travel/pspbr-renaissance-indian-wells-resort-and-spa/', category: 'Accommodation', domain: 'marriott.com', description: 'Desert resort 20 minutes from Coachella grounds' },
      { title: 'Joshua Tree National Park Day Trip', url: 'https://www.nps.gov/jotr/index.htm', category: 'Activity', domain: 'nps.gov', description: 'Desert hiking and rock climbing 45 minutes away' },
      { title: "Pappy & Harriet's Pioneertown Palace", url: 'https://pappyandharriets.com/', category: 'Appetite', domain: 'pappyandharriets.com', description: 'BBQ restaurant and live music venue in desert' },
      { title: 'Coachella Valley Music Festival', url: 'https://www.coachella.com/', category: 'Attraction', domain: 'coachella.com', description: 'Annual music and arts festival with major artists' }
    ],
    'Saratoga Springs': [
      { title: 'Saratoga Arms Hotel', url: 'https://www.saratogaarms.com/', category: 'Accommodation', domain: 'saratogaarms.com', description: 'Boutique hotel steps from downtown and racetrack' },
      { title: 'Saratoga Race Course Tours', url: 'https://www.nyra.com/saratoga/', category: 'Activity', domain: 'nyra.com', description: 'Historic thoroughbred horse racing experience' },
      { title: 'The Brook Tavern', url: 'https://www.thebrooktavern.com/', category: 'Appetite', domain: 'thebrooktavern.com', description: 'Farm-to-table dining with seasonal New York cuisine' },
      { title: 'Saratoga Spa State Park', url: 'https://parks.ny.gov/parks/saratogaspa', category: 'Attraction', domain: 'parks.ny.gov', description: 'Natural mineral springs, hiking trails, and spa' }
    ],
    'Phoenix': [
      { title: 'The Phoenician Resort', url: 'https://www.thephoenician.com/', category: 'Accommodation', domain: 'thephoenician.com', description: 'Luxury golf resort at base of Camelback Mountain' },
      { title: 'TPC Scottsdale Champions Course', url: 'https://www.tpc.com/scottsdale/', category: 'Activity', domain: 'tpc.com', description: 'PGA Tour golf course, home of Phoenix Open' },
      { title: 'The Mission - Modern Latin Cuisine', url: 'https://themissionaz.com/', category: 'Appetite', domain: 'themissionaz.com', description: 'Upscale Latin fusion in Old Town Scottsdale' },
      { title: 'Desert Botanical Garden', url: 'https://www.dbg.org/', category: 'Attraction', domain: 'dbg.org', description: 'World-class desert plant collection and trails' }
    ],
    'Tulum': [
      { title: 'Azulik Eco-Resort & Maya Spa', url: 'https://www.azulik.com/', category: 'Accommodation', domain: 'azulik.com', description: 'Adults-only treehouse villas on private beach' },
      { title: 'Cenote Dos Ojos Cave Snorkeling', url: 'https://www.cenotedosojos.com/', category: 'Activity', domain: 'cenotedosojos.com', description: 'Crystal-clear underground cenote diving' },
      { title: 'Hartwood Restaurant', url: 'https://www.hartwoodtulum.com/', category: 'Appetite', domain: 'hartwoodtulum.com', description: 'Jungle dining with wood-fired seasonal cuisine' },
      { title: 'Tulum Archaeological Site', url: 'https://www.inah.gob.mx/zonas/159-zona-arqueologica-de-tulum', category: 'Attraction', domain: 'inah.gob.mx', description: 'Mayan ruins overlooking Caribbean Sea' }
    ],
    'Napa Valley': [
      { title: 'Auberge du Soleil', url: 'https://aubergeresorts.com/aubergedusoleil/', category: 'Accommodation', domain: 'aubergeresorts.com', description: 'Luxury hillside resort with vineyard views' },
      { title: 'Napa Valley Wine Train', url: 'https://www.winetrain.com/', category: 'Activity', domain: 'winetrain.com', description: 'Vintage train tour through wine country with tastings' },
      { title: 'The French Laundry', url: 'https://www.thomaskeller.com/tfl', category: 'Appetite', domain: 'thomaskeller.com', description: 'Three-Michelin-star fine dining by Thomas Keller' },
      { title: 'Castello di Amorosa Winery', url: 'https://www.castellodiamorosa.com/', category: 'Attraction', domain: 'castellodiamorosa.com', description: '13th-century Tuscan castle winery with tours' }
    ],
    'Aspen': [
      { title: 'The Little Nell', url: 'https://www.thelittlenell.com/', category: 'Accommodation', domain: 'thelittlenell.com', description: 'Five-star ski-in/ski-out hotel at Aspen Mountain base' },
      { title: 'Aspen Snowmass Ski Resort', url: 'https://www.aspensnowmass.com/', category: 'Activity', domain: 'aspensnowmass.com', description: 'Four mountains with world-class skiing and terrain' },
      { title: 'Matsuhisa Aspen', url: 'https://www.matsuhisaaspen.com/', category: 'Appetite', domain: 'matsuhisaaspen.com', description: "Nobu's original restaurant with Japanese-Peruvian fusion" },
      { title: 'Maroon Bells', url: 'https://www.fs.usda.gov/recarea/whiteriver/recarea/?recid=40565', category: 'Attraction', domain: 'fs.usda.gov', description: 'Most photographed peaks in North America' }
    ],
    'Port Canaveral': [
      { title: 'Disney Cruise Line', url: 'https://disneycruise.disney.go.com/', category: 'Accommodation', domain: 'disney.go.com', description: 'Family cruise ships departing from Port Canaveral' },
      { title: 'Kennedy Space Center Visitor Complex', url: 'https://www.kennedyspacecenter.com/', category: 'Activity', domain: 'kennedyspacecenter.com', description: 'NASA tours, rocket launches, and space exhibits' },
      { title: 'Grills Seafood Deck & Tiki Bar', url: 'https://www.grillsseafood.com/', category: 'Appetite', domain: 'grillsseafood.com', description: 'Waterfront seafood with fresh catch and sunset views' },
      { title: 'Cocoa Beach Pier', url: 'https://www.cocoabeachpier.com/', category: 'Attraction', domain: 'cocoabeachpier.com', description: 'Historic 800-foot pier with shops, restaurants, surfing' }
    ],
    'Yellowstone': [
      { title: 'Old Faithful Inn', url: 'https://www.yellowstonenationalparklodges.com/lodgings/historic-lodges/old-faithful-inn/', category: 'Accommodation', domain: 'yellowstonenationalparklodges.com', description: 'Historic log lodge next to Old Faithful geyser' },
      { title: 'Grand Prismatic Spring Overlook Trail', url: 'https://www.nps.gov/yell/planyourvisit/grand-prismatic-spring.htm', category: 'Activity', domain: 'nps.gov', description: "Hike to view the park's largest hot spring" },
      { title: 'Old Faithful Inn Dining Room', url: 'https://www.yellowstonenationalparklodges.com/dining/', category: 'Appetite', domain: 'yellowstonenationalparklodges.com', description: 'Historic lodge dining with regional American cuisine' },
      { title: 'Old Faithful Geyser', url: 'https://www.nps.gov/yell/planyourvisit/exploreoldfaithful.htm', category: 'Attraction', domain: 'nps.gov', description: 'Iconic geyser erupting every 90 minutes' }
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
