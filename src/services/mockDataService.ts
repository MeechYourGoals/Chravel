import { getStorageItem, setStorageItem, removeStorageItem } from '@/platform/storage';

interface MockMediaItem {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'audio' | 'document';
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

class MockDataService {
  private static readonly STORAGE_PREFIX = 'trip_mock_data_';
  private static readonly USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || import.meta.env.DEV;

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
        mime_type: 'image/jpeg'
      },
      {
        id: 'mock-media-2',
        media_url: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=600&h=400&fit=crop',
        filename: 'Team Breakfast.jpg',
        media_type: 'image',
        metadata: { width: 1920, height: 1080 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'chat',
        file_size: 278901,
        mime_type: 'image/jpeg'
      },
      {
        id: 'mock-media-3',
        media_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&h=400&fit=crop',
        filename: 'Adventure Hiking.jpg',
        media_type: 'image',
        metadata: { width: 1920, height: 1080 },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'upload',
        file_size: 423456,
        mime_type: 'image/jpeg'
      },
      {
        id: 'mock-media-4',
        media_url: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=800&fit=crop',
        filename: 'Event Flyer - Music Festival.jpg',
        media_type: 'image',
        metadata: { width: 1080, height: 1350, isFlyer: true },
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        source: 'upload',
        file_size: 567890,
        mime_type: 'image/jpeg'
      },
      // AI-Generated Photos - People at events
      {
        id: 'mock-media-11',
        media_url: 'https://images.unsplash.com/photo-1529271338528-96a6ac830a56?w=600&h=400&fit=crop',
        filename: 'Friends Party Night.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 11).toISOString(),
        source: 'chat',
        file_size: 412678,
        mime_type: 'image/jpeg'
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
        mime_type: 'image/jpeg'
      },
      {
        id: 'mock-media-13',
        media_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=600&h=400&fit=crop',
        filename: 'Music Festival Crowd.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 13).toISOString(),
        source: 'upload',
        file_size: 623456,
        mime_type: 'image/jpeg'
      },
      {
        id: 'mock-media-14',
        media_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop',
        filename: 'Wedding Ceremony.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
        source: 'upload',
        file_size: 467890,
        mime_type: 'image/jpeg'
      },
      {
        id: 'mock-media-16',
        media_url: 'https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&h=400&fit=crop',
        filename: 'Travel Group Selfie.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        source: 'chat',
        file_size: 345123,
        mime_type: 'image/jpeg'
      },
      {
        id: 'mock-media-17',
        media_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop',
        filename: 'Beach Volleyball Fun.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 16).toISOString(),
        source: 'upload',
        file_size: 389456,
        mime_type: 'image/jpeg'
      },
      // Videos - Local working video sources
      {
        id: 'mock-media-5',
        media_url: '/mock/videos/team-celebration.mp4',
        filename: 'Team Celebration.mp4',
        media_type: 'video',
        metadata: { duration: 8.5, width: 1280, height: 720, poster: '/mock/images/basketball-action.jpg' },
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'chat',
        file_size: 1024000,
        mime_type: 'video/mp4'
      },
      {
        id: 'mock-media-6',
        media_url: '/mock/videos/venue-tour.mp4',
        filename: 'Venue Tour.mp4',
        media_type: 'video',
        metadata: { duration: 12.3, width: 640, height: 360, poster: '/mock/images/concert-stage.jpg' },
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        source: 'upload',
        file_size: 2048000,
        mime_type: 'video/mp4'
      },
      // Audio - Local working voice note samples
      {
        id: 'mock-media-7',
        media_url: '/mock/audio/voice-note-1.mp3',
        filename: 'Voice Note - Meeting Point.mp3',
        media_type: 'audio',
        metadata: { duration: 4.2 },
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        source: 'chat',
        file_size: 89012,
        mime_type: 'audio/mp3'
      },
      {
        id: 'mock-media-15',
        media_url: '/mock/audio/voice-note-2.mp3',
        filename: 'Voice Note - Departure Time.mp3',
        media_type: 'audio',
        metadata: { duration: 6.8 },
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        source: 'upload',
        file_size: 156000,
        mime_type: 'audio/mp3'
      },
      // Files - Rich document items
      {
        id: 'mock-media-8',
        media_url: 'data:application/pdf;base64,JVBERi0xLjQKJfbk/N8KMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFsgMyAwIFIgXQovQ291bnQgMQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9MZW5ndGggMzMKPj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoyIDQgVGQKKERvZGdlcnMgVGlja2V0cykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAyMDIgMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgoyODUKJSVFT0Y=',
        filename: 'Dodgers Game Tickets.pdf',
        media_type: 'document',
        metadata: { 
          extractedEvents: 1,
          isTicket: true,
          venue: 'Dodger Stadium',
          date: '2025-02-15'
        },
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        source: 'upload',
        file_size: 245600,
        mime_type: 'application/pdf'
      },
      {
        id: 'mock-media-9',
        media_url: '/mock/images/conference-schedule-preview.jpg',
        filename: 'Conference Schedule.jpg',
        media_type: 'image',
        metadata: { 
          extractedEvents: 3,
          isSchedule: true,
          conference: 'Tech Summit 2025'
        },
        created_at: new Date(Date.now() - 86400000 * 9).toISOString(),
        source: 'upload',
        file_size: 1024000,
        mime_type: 'image/jpeg'
      },
      {
        id: 'mock-media-10',
        media_url: '/mock/images/dinner-receipt-preview.jpg',
        filename: 'Dinner at Le Comptoir.jpg',
        media_type: 'image',
        metadata: { 
          isReceipt: true,
          totalAmount: 156.80,
          currency: 'USD',
          preferredMethod: 'venmo',
          splitCount: 4,
          perPersonAmount: 39.20
        },
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        source: 'upload',
        file_size: 523800,
        mime_type: 'image/jpeg'
      }
    ];
  }

  private static getMockLinksData(): MockLinkItem[] {
    return [
      {
        id: 'mock-link-1',
        url: 'https://www.nytimes.com/2024/08/14/travel/best-summer-destinations.html',
        title: 'The 20 Best Summer Travel Destinations You Need to Visit',
        description: 'From hidden beaches to mountain retreats, discover the most stunning places to visit this summer season.',
        domain: 'nytimes.com',
        image_url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'chat'
      },
      {
        id: 'mock-link-2',
        url: 'https://maps.google.com/place/central-park-new-york',
        title: 'Central Park - Google Maps',
        description: 'Iconic urban park in Manhattan with lakes, meadows, and recreational facilities.',
        domain: 'maps.google.com',
        image_url: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'manual'
      },
      {
        id: 'mock-link-3',
        url: 'https://www.ticketmaster.com/event/summer-music-festival-2024',
        title: 'Summer Music Festival 2024 - Official Tickets',
        description: 'Join us for the biggest music festival of the year featuring top artists and incredible performances.',
        domain: 'ticketmaster.com',
        image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        source: 'chat'
      },
      {
        id: 'mock-link-4',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Amazing Travel Vlog: Epic Adventure Highlights',
        description: 'Watch our incredible journey through the most beautiful destinations around the world.',
        domain: 'youtube.com',
        image_url: 'https://images.unsplash.com/photo-1533603732389-4d9d2a15ebe0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'chat'
      },
      {
        id: 'mock-link-5',
        url: 'https://www.instagram.com/p/amazing-sunset-view',
        title: 'Epic sunset view from our trip! 🌅',
        description: 'The most incredible sunset we\'ve ever seen during our adventure.',
        domain: 'instagram.com',
        image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        source: 'chat'
      },
      {
        id: 'mock-link-6',
        url: 'https://www.booking.com/hotel/luxury-mountain-resort',
        title: 'Luxury Mountain Resort & Spa - Book Direct',
        description: 'Experience ultimate relaxation at our award-winning mountain resort with world-class amenities.',
        domain: 'booking.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        source: 'manual'
      },
      {
        id: 'mock-link-7',
        url: 'https://www.airbnb.com/rooms/cozy-cabin-mountains',
        title: 'Cozy Cabin in the Mountains - Airbnb',
        description: 'Perfect getaway with stunning views, hot tub, and hiking trails right outside your door.',
        domain: 'airbnb.com',
        image_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        source: 'manual'
      },
      {
        id: 'mock-link-8',
        url: 'https://www.timeout.com/newyork/restaurants/best-restaurants-nyc',
        title: 'The 50 Best Restaurants in NYC Right Now',
        description: 'From hole-in-the-wall gems to Michelin-starred establishments, discover NYC\'s culinary scene.',
        domain: 'timeout.com',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        source: 'chat'
      }
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
    
    // Reinitialize
    await this.getMockMediaItems(tripId);
    await this.getMockLinkItems(tripId);
    
    console.log('Mock data reseeded for trip:', tripId);
  }

  static async clearMockData(tripId?: string): Promise<void> {
    if (tripId) {
      await removeStorageItem(this.getStorageKey(tripId, 'media'));
      await removeStorageItem(this.getStorageKey(tripId, 'links'));
    } else {
      // Note: platformStorage doesn't expose Object.keys() like localStorage
      // This will be handled by individual clearMockData calls per trip
      console.warn('Clear all mock data not fully supported with platformStorage');
    }
  }
}

export default MockDataService;
export type { MockMediaItem, MockLinkItem };