import { getStorageItem, setStorageItem, removeStorageItem } from '@/platform/storage';

interface MockMediaItem {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: any;
  created_at: string;
  source: 'chat' | 'upload';
  file_size?: number;
  mime_type?: string;
}

interface MockLinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  image_url?: string;
  created_at: string;
  source: 'chat' | 'manual';
}

interface MockPlaceItem {
  id: string;
  name: string;
  address: string;
  coordinates: { lat: number; lng: number };
  category?: string;
  rating?: number;
  url?: string;
  distanceFromBasecamp?: any;
}

class MockDataService {
  private static readonly STORAGE_PREFIX = 'trip_mock_data_';
  private static readonly USE_MOCK_DATA =
    import.meta.env.VITE_USE_MOCK_DATA === 'true' || import.meta.env.DEV;

  private static getMockMediaData(): MockMediaItem[] {
    return [
      // Photos - AI-generated realistic photos
      {
        id: 'mock-media-1',
        media_url: '/mock/images/group-mountain-photo.jpg',
        filename: 'Group Mountain Photo.jpg',
        media_type: 'image',
        metadata: { width: 1024, height: 768 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 345678,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-2',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Team Breakfast.jpg',
        media_type: 'image',
        metadata: { width: 1920, height: 1080 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'chat',
        file_size: 278901,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-3',
        media_url: '/mock/images/beach-volleyball.jpg',
        filename: 'Adventure Hiking.jpg',
        media_type: 'image',
        metadata: { width: 1920, height: 1080 },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'upload',
        file_size: 423456,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-4',
        media_url: '/mock/images/concert-stage.jpg',
        filename: 'Event Flyer - Music Festival.jpg',
        media_type: 'image',
        metadata: { width: 1080, height: 1350, isFlyer: true },
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        source: 'upload',
        file_size: 567890,
        mime_type: 'image/jpeg',
      },
      // AI-Generated Photos - People at events
      {
        id: 'mock-media-11',
        media_url: '/mock/images/friends-party.jpg',
        filename: 'Friends Party Night.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 11).toISOString(),
        source: 'chat',
        file_size: 412678,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-12',
        media_url: '/mock/images/basketball-action.jpg',
        filename: 'Basketball Game Action.jpg',
        media_type: 'image',
        metadata: { width: 1024, height: 768 },
        created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
        source: 'chat',
        file_size: 523901,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-13',
        media_url: '/mock/images/concert-stage.jpg',
        filename: 'Music Festival Crowd.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 13).toISOString(),
        source: 'upload',
        file_size: 623456,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-14',
        media_url: '/mock/images/wedding-ceremony.jpg',
        filename: 'Wedding Ceremony.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
        source: 'upload',
        file_size: 467890,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-16',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Travel Group Selfie.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        source: 'chat',
        file_size: 345123,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-17',
        media_url: '/mock/images/beach-volleyball.jpg',
        filename: 'Beach Volleyball Fun.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 16).toISOString(),
        source: 'upload',
        file_size: 389456,
        mime_type: 'image/jpeg',
      },
      // Videos - Local working video sources
      {
        id: 'mock-media-5',
        media_url: '/mock/videos/team-celebration.mp4',
        filename: 'Team Celebration.mp4',
        media_type: 'video',
        metadata: {
          duration: 8.5,
          width: 1280,
          height: 720,
          poster: '/mock/images/basketball-action.jpg',
        },
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'chat',
        file_size: 1024000,
        mime_type: 'video/mp4',
      },
      {
        id: 'mock-media-6',
        media_url: '/mock/videos/venue-tour.mp4',
        filename: 'Venue Tour.mp4',
        media_type: 'video',
        metadata: {
          duration: 12.3,
          width: 640,
          height: 360,
          poster: '/mock/images/concert-stage.jpg',
        },
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        source: 'upload',
        file_size: 2048000,
        mime_type: 'video/mp4',
      },
      // Files - Rich document items
      {
        id: 'mock-media-8',
        media_url:
          'data:application/pdf;base64,JVBERi0xLjQKJfbk/N8KMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgMyAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggMzMKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoyIDQgVGQKKERvZGdlcnMgVGlja2V0cykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyMDIgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoyODUKJSVFT0Y=',
        filename: 'Dodgers Game Tickets.pdf',
        media_type: 'document',
        metadata: {
          extractedEvents: 1,
          isTicket: true,
          venue: 'Dodger Stadium',
          date: '2025-02-15',
        },
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        source: 'upload',
        file_size: 245600,
        mime_type: 'application/pdf',
      },
      {
        id: 'mock-media-9',
        media_url: '/mock/images/conference-schedule-preview.jpg',
        filename: 'Conference Schedule.jpg',
        media_type: 'image',
        metadata: {
          extractedEvents: 3,
          isSchedule: true,
          conference: 'Tech Summit 2025',
        },
        created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
        source: 'upload',
        file_size: 1024000,
        mime_type: 'image/jpeg',
      },
      {
        id: 'mock-media-10',
        media_url: '/mock/images/dinner-receipt-preview.jpg',
        filename: 'Dinner at Le Comptoir.jpg',
        media_type: 'image',
        metadata: {
          isReceipt: true,
          totalAmount: 156.8,
          currency: 'USD',
          preferredMethod: 'venmo',
          splitCount: 4,
          perPersonAmount: 39.2,
        },
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        source: 'upload',
        file_size: 523800,
        mime_type: 'image/jpeg',
      },
    ];
  }

  private static getMockPlacesData(citySet: number = 0): MockPlaceItem[] {
    // Different city sets for variety: 0=NYC, 1=LA, 2=Paris, 3=Tokyo
    const cities = [
      // NYC
      [
        {
          id: 'mock-place-1',
          name: 'Central Park',
          address: 'Central Park, New York, NY 10024',
          coordinates: { lat: 40.785091, lng: -73.968285 },
          category: 'attraction',
          rating: 4.8,
          url: 'https://www.centralparknyc.org/',
        },
        {
          id: 'mock-place-2',
          name: "Joe's Pizza",
          address: '7 Carmine St, New York, NY 10014',
          coordinates: { lat: 40.73061, lng: -74.00208 },
          category: 'restaurant',
          rating: 4.6,
          url: 'https://www.joespizzanyc.com/',
        },
        {
          id: 'mock-place-3',
          name: 'The Metropolitan Museum of Art',
          address: '1000 5th Ave, New York, NY 10028',
          coordinates: { lat: 40.779437, lng: -73.963244 },
          category: 'attraction',
          rating: 4.8,
          url: 'https://www.metmuseum.org/',
        },
        {
          id: 'mock-place-4',
          name: 'Equinox Hudson Yards',
          address: '30 Hudson Yards, New York, NY 10001',
          coordinates: { lat: 40.753863, lng: -74.001904 },
          category: 'fitness',
          rating: 4.5,
          url: 'https://www.equinox.com/clubs/new-york/hudson-yards',
        },
        {
          id: 'mock-place-5',
          name: 'The Standard High Line',
          address: '848 Washington St, New York, NY 10014',
          coordinates: { lat: 40.740753, lng: -74.008614 },
          category: 'hotel',
          rating: 4.4,
          url: 'https://www.standardhotels.com/new-york/properties/high-line',
        },
        {
          id: 'mock-place-6',
          name: 'Brooklyn Bridge',
          address: 'Brooklyn Bridge, New York, NY 10038',
          coordinates: { lat: 40.706086, lng: -73.996864 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://www.nyc.gov/html/dot/html/infrastructure/brooklyn-bridge.shtml',
        },
        {
          id: 'mock-place-7',
          name: 'Le Bernardin',
          address: '155 W 51st St, New York, NY 10019',
          coordinates: { lat: 40.761625, lng: -73.982137 },
          category: 'restaurant',
          rating: 4.7,
          url: 'https://www.le-bernardin.com/',
        },
        {
          id: 'mock-place-8',
          name: 'Madison Square Garden',
          address: '4 Pennsylvania Plaza, New York, NY 10001',
          coordinates: { lat: 40.750504, lng: -73.993439 },
          category: 'activity',
          rating: 4.5,
          url: 'https://www.msg.com/',
        },
        {
          id: 'mock-place-9',
          name: 'The Dead Rabbit',
          address: '30 Water St, New York, NY 10004',
          coordinates: { lat: 40.703151, lng: -74.01133 },
          category: 'nightlife',
          rating: 4.6,
          url: 'https://www.deadrabbitnyc.com/',
        },
        {
          id: 'mock-place-10',
          name: 'Times Square',
          address: 'Manhattan, NY 10036',
          coordinates: { lat: 40.758896, lng: -73.98513 },
          category: 'attraction',
          rating: 4.3,
          url: 'https://www.timessquarenyc.org/',
        },
      ],
      // LA
      [
        {
          id: 'mock-place-la-1',
          name: 'Griffith Observatory',
          address: '2800 E Observatory Rd, Los Angeles, CA 90027',
          coordinates: { lat: 34.118434, lng: -118.300399 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://griffithobservatory.org/',
        },
        {
          id: 'mock-place-la-2',
          name: 'Santa Monica Pier',
          address: '200 Santa Monica Pier, Santa Monica, CA 90401',
          coordinates: { lat: 34.008888, lng: -118.498611 },
          category: 'attraction',
          rating: 4.5,
          url: 'https://www.santamonicapier.org/',
        },
        {
          id: 'mock-place-la-3',
          name: 'The Getty Center',
          address: '1200 Getty Center Dr, Los Angeles, CA 90049',
          coordinates: { lat: 34.078056, lng: -118.473889 },
          category: 'attraction',
          rating: 4.8,
          url: 'https://www.getty.edu/',
        },
        {
          id: 'mock-place-la-4',
          name: 'In-N-Out Burger',
          address: '9149 W Sunset Blvd, West Hollywood, CA 90069',
          coordinates: { lat: 34.090833, lng: -118.388611 },
          category: 'restaurant',
          rating: 4.6,
          url: 'https://www.in-n-out.com/',
        },
        {
          id: 'mock-place-la-5',
          name: 'Venice Beach',
          address: 'Venice Beach, Los Angeles, CA 90291',
          coordinates: { lat: 33.985556, lng: -118.473056 },
          category: 'attraction',
          rating: 4.4,
          url: 'https://www.venicebeach.com/',
        },
        {
          id: 'mock-place-la-6',
          name: 'Hollywood Sign',
          address: 'Mt Lee Dr, Los Angeles, CA 90068',
          coordinates: { lat: 34.134117, lng: -118.321495 },
          category: 'attraction',
          rating: 4.5,
          url: 'https://hollywoodsign.org/',
        },
        {
          id: 'mock-place-la-7',
          name: 'Runyon Canyon Park',
          address: '2000 N Fuller Ave, Los Angeles, CA 90046',
          coordinates: { lat: 34.110278, lng: -118.352222 },
          category: 'activity',
          rating: 4.6,
          url: 'https://www.laparks.org/',
        },
        {
          id: 'mock-place-la-8',
          name: 'The Grove',
          address: '189 The Grove Dr, Los Angeles, CA 90036',
          coordinates: { lat: 34.072222, lng: -118.3575 },
          category: 'attraction',
          rating: 4.3,
          url: 'https://www.thegrovela.com/',
        },
        {
          id: 'mock-place-la-9',
          name: 'Nobu Malibu',
          address: '22706 Pacific Coast Hwy, Malibu, CA 90265',
          coordinates: { lat: 34.032778, lng: -118.682222 },
          category: 'restaurant',
          rating: 4.5,
          url: 'https://www.noburestaurants.com/',
        },
        {
          id: 'mock-place-la-10',
          name: 'Dodger Stadium',
          address: '1000 Vin Scully Ave, Los Angeles, CA 90012',
          coordinates: { lat: 34.07385, lng: -118.239578 },
          category: 'activity',
          rating: 4.6,
          url: 'https://www.mlb.com/dodgers/',
        },
      ],
      // Paris
      [
        {
          id: 'mock-place-paris-1',
          name: 'Eiffel Tower',
          address: 'Champ de Mars, 75007 Paris, France',
          coordinates: { lat: 48.85837, lng: 2.294481 },
          category: 'attraction',
          rating: 4.8,
          url: 'https://www.toureiffel.paris/',
        },
        {
          id: 'mock-place-paris-2',
          name: 'Louvre Museum',
          address: 'Rue de Rivoli, 75001 Paris, France',
          coordinates: { lat: 48.860611, lng: 2.337644 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://www.louvre.fr/',
        },
        {
          id: 'mock-place-paris-3',
          name: 'Notre-Dame Cathedral',
          address: '6 Parvis Notre-Dame, 75004 Paris, France',
          coordinates: { lat: 48.852968, lng: 2.349902 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://www.notredamedeparis.fr/',
        },
        {
          id: 'mock-place-paris-4',
          name: "Le Relais de l'Entrecôte",
          address: '15 Rue Marbeuf, 75008 Paris, France',
          coordinates: { lat: 48.868889, lng: 2.304167 },
          category: 'restaurant',
          rating: 4.6,
          url: 'https://www.relaisentrecote.fr/',
        },
        {
          id: 'mock-place-paris-5',
          name: 'Arc de Triomphe',
          address: 'Place Charles de Gaulle, 75008 Paris, France',
          coordinates: { lat: 48.873889, lng: 2.295 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://www.paris-arc-de-triomphe.fr/',
        },
        {
          id: 'mock-place-paris-6',
          name: 'Sacré-Cœur',
          address: '35 Rue du Chevalier de la Barre, 75018 Paris, France',
          coordinates: { lat: 48.886722, lng: 2.343056 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://www.sacre-coeur-montmartre.com/',
        },
        {
          id: 'mock-place-paris-7',
          name: "Musée d'Orsay",
          address: "1 Rue de la Légion d'Honneur, 75007 Paris, France",
          coordinates: { lat: 48.86, lng: 2.326389 },
          category: 'attraction',
          rating: 4.8,
          url: 'https://www.musee-orsay.fr/',
        },
        {
          id: 'mock-place-paris-8',
          name: 'Champs-Élysées',
          address: 'Avenue des Champs-Élysées, 75008 Paris, France',
          coordinates: { lat: 48.869889, lng: 2.307653 },
          category: 'attraction',
          rating: 4.4,
          url: 'https://www.champselysees.org/',
        },
        {
          id: 'mock-place-paris-9',
          name: "L'As du Fallafel",
          address: '34 Rue des Rosiers, 75004 Paris, France',
          coordinates: { lat: 48.857222, lng: 2.36 },
          category: 'restaurant',
          rating: 4.5,
          url: 'https://www.lasdufallafel.com/',
        },
        {
          id: 'mock-place-paris-10',
          name: 'Luxembourg Gardens',
          address: '75006 Paris, France',
          coordinates: { lat: 48.846667, lng: 2.337222 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://www.senat.fr/visite/jardin/',
        },
      ],
      // Tokyo
      [
        {
          id: 'mock-place-tokyo-1',
          name: 'Senso-ji Temple',
          address: '2-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan',
          coordinates: { lat: 35.714722, lng: 139.796667 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://www.senso-ji.jp/',
        },
        {
          id: 'mock-place-tokyo-2',
          name: 'Tokyo Skytree',
          address: '1-1-2 Oshiage, Sumida City, Tokyo 131-0045, Japan',
          coordinates: { lat: 35.710139, lng: 139.810833 },
          category: 'attraction',
          rating: 4.6,
          url: 'https://www.tokyo-skytree.jp/',
        },
        {
          id: 'mock-place-tokyo-3',
          name: 'Meiji Shrine',
          address: '1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557, Japan',
          coordinates: { lat: 35.676389, lng: 139.699444 },
          category: 'attraction',
          rating: 4.8,
          url: 'https://www.meijijingu.or.jp/',
        },
        {
          id: 'mock-place-tokyo-4',
          name: 'Tsukiji Outer Market',
          address: '4 Chome Tsukiji, Chuo City, Tokyo 104-0045, Japan',
          coordinates: { lat: 35.665556, lng: 139.770556 },
          category: 'restaurant',
          rating: 4.5,
          url: 'https://www.tsukiji.or.jp/',
        },
        {
          id: 'mock-place-tokyo-5',
          name: 'Shibuya Crossing',
          address: '2-2-1 Dogenzaka, Shibuya City, Tokyo 150-0043, Japan',
          coordinates: { lat: 35.659444, lng: 139.700556 },
          category: 'attraction',
          rating: 4.4,
          url: 'https://www.shibuya-scramble-square.com/',
        },
        {
          id: 'mock-place-tokyo-6',
          name: 'Tokyo Tower',
          address: '4-2-8 Shibakoen, Minato City, Tokyo 105-0011, Japan',
          coordinates: { lat: 35.658611, lng: 139.745556 },
          category: 'attraction',
          rating: 4.5,
          url: 'https://www.tokyotower.co.jp/',
        },
        {
          id: 'mock-place-tokyo-7',
          name: 'Ramen Nagi',
          address: '1-1-10 Kabukicho, Shinjuku City, Tokyo 160-0021, Japan',
          coordinates: { lat: 35.694444, lng: 139.701111 },
          category: 'restaurant',
          rating: 4.6,
          url: 'https://www.n-nagi.com/',
        },
        {
          id: 'mock-place-tokyo-8',
          name: 'teamLab Borderless',
          address: '1-3-8 Aomi, Koto City, Tokyo 135-0064, Japan',
          coordinates: { lat: 35.627778, lng: 139.775556 },
          category: 'attraction',
          rating: 4.7,
          url: 'https://www.teamlab.art/',
        },
        {
          id: 'mock-place-tokyo-9',
          name: 'Harajuku',
          address: 'Jingumae, Shibuya City, Tokyo 150-0001, Japan',
          coordinates: { lat: 35.670278, lng: 139.702778 },
          category: 'attraction',
          rating: 4.5,
          url: 'https://www.harajuku.or.jp/',
        },
        {
          id: 'mock-place-tokyo-10',
          name: 'Imperial Palace',
          address: '1-1 Chiyoda, Chiyoda City, Tokyo 100-8111, Japan',
          coordinates: { lat: 35.685175, lng: 139.752799 },
          category: 'attraction',
          rating: 4.6,
          url: 'https://www.kunaicho.go.jp/',
        },
      ],
    ];

    return cities[citySet % cities.length];
  }

  private static getMockLinksData(): MockLinkItem[] {
    return [
      {
        id: 'mock-link-1',
        url: 'https://www.nytimes.com/2024/08/14/travel/best-summer-destinations.html',
        title: 'The 20 Best Summer Travel Destinations You Need to Visit',
        description:
          'From hidden beaches to mountain retreats, discover the most stunning places to visit this summer season.',
        domain: 'nytimes.com',
        image_url:
          'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'chat',
      },
      {
        id: 'mock-link-2',
        url: 'https://maps.google.com/place/central-park-new-york',
        title: 'Central Park - Google Maps',
        description:
          'Iconic urban park in Manhattan with lakes, meadows, and recreational facilities.',
        domain: 'maps.google.com',
        image_url:
          'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'manual',
      },
      {
        id: 'mock-link-3',
        url: 'https://www.ticketmaster.com/event/summer-music-festival-2024',
        title: 'Summer Music Festival 2024 - Official Tickets',
        description:
          'Join us for the biggest music festival of the year featuring top artists and incredible performances.',
        domain: 'ticketmaster.com',
        image_url:
          'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        source: 'chat',
      },
      {
        id: 'mock-link-4',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Amazing Travel Vlog: Epic Adventure Highlights',
        description:
          'Watch our incredible journey through the most beautiful destinations around the world.',
        domain: 'youtube.com',
        image_url:
          'https://images.unsplash.com/photo-1533603732389-4d9d2a15ebe0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'chat',
      },
      {
        id: 'mock-link-5',
        url: 'https://www.instagram.com/p/amazing-sunset-view',
        title: 'Epic sunset view from our trip! 🌅',
        description: "The most incredible sunset we've ever seen during our adventure.",
        domain: 'instagram.com',
        image_url:
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        source: 'chat',
      },
      {
        id: 'mock-link-6',
        url: 'https://www.booking.com/hotel/luxury-mountain-resort',
        title: 'Luxury Mountain Resort & Spa - Book Direct',
        description:
          'Experience ultimate relaxation at our award-winning mountain resort with world-class amenities.',
        domain: 'booking.com',
        image_url:
          'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        source: 'manual',
      },
      {
        id: 'mock-link-7',
        url: 'https://www.airbnb.com/rooms/cozy-cabin-mountains',
        title: 'Cozy Cabin in the Mountains - Airbnb',
        description:
          'Perfect getaway with stunning views, hot tub, and hiking trails right outside your door.',
        domain: 'airbnb.com',
        image_url:
          'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        source: 'manual',
      },
      {
        id: 'mock-link-8',
        url: 'https://www.timeout.com/newyork/restaurants/best-restaurants-nyc',
        title: 'The 50 Best Restaurants in NYC Right Now',
        description:
          "From hole-in-the-wall gems to Michelin-starred establishments, discover NYC's culinary scene.",
        domain: 'timeout.com',
        image_url:
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        source: 'chat',
      },
    ];
  }

  static isUsingMockData(): boolean {
    return this.USE_MOCK_DATA;
  }

  static getStorageKey(tripId: string, type: 'media' | 'links'): string {
    return `${this.STORAGE_PREFIX}${tripId}_${type}`;
  }

  static async getMockMediaItems(tripId: string): Promise<MockMediaItem[]> {
    if (!this.USE_MOCK_DATA) return [];

    const storageKey = this.getStorageKey(tripId, 'media');

    // Always return fresh data to ensure updates are shown
    const mockData = this.getMockMediaData();
    await setStorageItem(storageKey, mockData);
    return mockData;
  }

  static async getMockPlaceItems(
    tripId: string,
    forceLoad: boolean = false,
  ): Promise<MockPlaceItem[]> {
    if (!this.USE_MOCK_DATA && !forceLoad) {
      return [];
    }

    const storageKey = `${this.STORAGE_PREFIX}${tripId}_places`;
    const stored = await getStorageItem<MockPlaceItem[]>(storageKey);

    if (stored) {
      return stored;
    }

    // First time - initialize with trip-specific mock data
    // Use tripId to determine which city set to use (0=NYC, 1=LA, 2=Paris, 3=Tokyo)
    const tripNum = parseInt(tripId, 10) || 0;
    const citySet = tripNum % 4;
    const mockData = this.getMockPlacesData(citySet);
    await setStorageItem(storageKey, mockData);
    return mockData;
  }

  static async getMockLinkItems(tripId: string): Promise<MockLinkItem[]> {
    if (!this.USE_MOCK_DATA) return [];

    const storageKey = this.getStorageKey(tripId, 'links');
    const stored = await getStorageItem<MockLinkItem[]>(storageKey);

    if (stored) {
      return stored;
    }

    // First time - initialize with mock data
    const mockData = this.getMockLinksData();
    await setStorageItem(storageKey, mockData);
    return mockData;
  }

  static async reseedMockData(tripId: string): Promise<void> {
    if (!this.USE_MOCK_DATA) return;

    // Clear existing data
    await removeStorageItem(this.getStorageKey(tripId, 'media'));
    await removeStorageItem(this.getStorageKey(tripId, 'links'));
    await removeStorageItem(`${this.STORAGE_PREFIX}${tripId}_places`);

    // Reinitialize
    await this.getMockMediaItems(tripId);
    await this.getMockLinkItems(tripId);
    await this.getMockPlaceItems(tripId);
  }

  static async clearMockData(tripId?: string): Promise<void> {
    if (tripId) {
      await removeStorageItem(this.getStorageKey(tripId, 'media'));
      await removeStorageItem(this.getStorageKey(tripId, 'links'));
      await removeStorageItem(`${this.STORAGE_PREFIX}${tripId}_places`);
    } else {
      // Note: platformStorage doesn't expose Object.keys() like localStorage
      // This will be handled by individual clearMockData calls per trip
      if (import.meta.env.DEV) {
        console.warn('Clear all mock data not fully supported with platformStorage');
      }
    }
  }
}

export default MockDataService;
export type { MockMediaItem, MockLinkItem, MockPlaceItem };
