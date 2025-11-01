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
  id: number;
  title: string;
  location: string;
  dateRange: string;
  description: string;
  participants: TripParticipant[];
  coverPhoto?: string;
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

// 🚀 OPTIMIZATION: Cache for generated mock data
const mockDataCache = new Map<number, ReturnType<typeof generateTripMockData>>();

export const generateTripMockData = (trip: Trip) => {
  // Check cache first for performance
  if (mockDataCache.has(trip.id)) {
    return mockDataCache.get(trip.id)!;
  }

  const participantNames = trip.participants.map(p => p.name);
  
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
    links: [
      { id: 1, title: `Our Accommodation in ${trip.location.split(',')[0]}`, url: "https://example.com/accommodation", category: "Accommodation" },
      { id: 2, title: `${trip.location.split(',')[0]} Attractions Guide`, url: "https://example.com/attractions", category: "Attractions" },
      { id: 3, title: `Best Restaurants in ${trip.location.split(',')[0]}`, url: "https://example.com/restaurants", category: "Food" }
    ],
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
  mockDataCache.set(trip.id, mockData);
  return mockData;
};
