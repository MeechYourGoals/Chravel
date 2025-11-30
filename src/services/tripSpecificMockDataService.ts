import { getStorageItem } from '@/platform/storage';

interface TripSpecificMediaItem {
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

interface TripSpecificLinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  image_url?: string;
  created_at: string;
  source: 'chat' | 'manual' | 'places';
  tags: string[];
}

interface TripMockData {
  tripId: number;
  tripTitle: string;
  location: string;
  photos: TripSpecificMediaItem[];
  videos: TripSpecificMediaItem[];
  files: TripSpecificMediaItem[];
  links: TripSpecificLinkItem[];
}

// Trip-specific mock data for all 12 trips
const TRIP_MOCK_DATA: Record<number, TripMockData> = {
  // 1. Spring Break Cancun 2026 Kappa Alpha Psi Trip
  1: {
    tripId: 1,
    tripTitle: "Spring Break Cancun 2026 Kappa Alpha Psi Trip",
    location: "Cancun, Mexico",
    photos: [
      {
        id: 'cancun-photo-1',
        media_url: '/mock/images/beach-volleyball.jpg',
        filename: 'Beach Volleyball Tournament.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 425678,
        mime_type: 'image/jpeg'
      },
      {
        id: 'cancun-photo-2',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Sunset Resort Pool Party.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'upload',
        file_size: 523456,
        mime_type: 'image/jpeg'
      },
      {
        id: 'cancun-photo-3',
        media_url: '/mock/images/group-mountain-photo.jpg',
        filename: 'Brotherhood Beach Group Shot.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'chat',
        file_size: 378901,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'cancun-video-1',
      media_url: '/mock/videos/team-celebration.mp4',
      filename: 'Epic Beach Party Highlights.mp4',
      media_type: 'video',
      metadata: { duration: 12, width: 1280, height: 720, poster: '/mock/images/beach-volleyball.jpg' },
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      source: 'chat',
      file_size: 12456000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'cancun-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'Moon Palace Resort Confirmation.pdf',
        media_type: 'document',
        metadata: { pageCount: 3, confirmationNumber: 'MP-CAN-2026-789' },
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        source: 'upload',
        file_size: 267890,
        mime_type: 'application/pdf'
      },
      {
        id: 'cancun-file-2',
        media_url: '/mock/images/conference-schedule-preview.jpg',
        filename: 'Excursion Tickets - Chichen Itza.jpg',
        media_type: 'image',
        metadata: { 
          isTicket: true, 
          venue: 'Chichen Itza', 
          date: '2026-03-17',
          extractedEvents: 1 
        },
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'upload',
        file_size: 345600,
        mime_type: 'image/jpeg'
      }
    ],
    links: [
      {
        id: 'cancun-link-1',
        url: 'https://www.palaceresorts.com/moon-palace-cancun',
        title: 'Moon Palace Cancun - All Inclusive Resort',
        description: 'Luxury all-inclusive resort with 6 restaurants, water park, and pristine beaches.',
        domain: 'palaceresorts.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        source: 'places' as const,
        tags: ['resort', 'all-inclusive', 'accommodation']
      },
      {
        id: 'cancun-link-2',
        url: 'https://www.joestonecrab.com/',
        title: "Joe's Stone Crab Cancun - Seafood Excellence",
        description: 'World-famous stone crab and fresh seafood in the heart of Cancun.',
        domain: 'joestonecrab.com',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'places' as const,
        tags: ['seafood', 'restaurant', 'upscale']
      },
      {
        id: 'cancun-link-3',
        url: 'https://www.cocobongo.com.mx/',
        title: 'Coco Bongo Show & Disco',
        description: 'Spectacular acrobatic show with live performances and tribute acts.',
        domain: 'cocobongo.com.mx',
        image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'places' as const,
        tags: ['nightlife', 'show', 'entertainment']
      },
      {
        id: 'cancun-link-4',
        url: 'https://www.tripadvisor.com/Attraction_Review-g150807-d152896-Reviews-Chichen_Itza-Chichen_Itza_Yucatan_Peninsula.html',
        title: 'Chichen Itza Day Trip',
        description: 'Ancient Mayan ruins and Wonder of the World archaeological site.',
        domain: 'tripadvisor.com',
        image_url: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'places' as const,
        tags: ['cultural', 'historical', 'tour']
      }
    ]
  },

  // 2. Tokyo Adventure
  2: {
    tripId: 2,
    tripTitle: "Tokyo Adventure",
    location: "Tokyo, Japan",
    photos: [
      {
        id: 'tokyo-photo-1',
        media_url: '/mock/images/concert-stage.jpg',
        filename: 'Shibuya Crossing Night Shot.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 456789,
        mime_type: 'image/jpeg'
      },
      {
        id: 'tokyo-photo-2',
        media_url: '/mock/images/wedding-ceremony.jpg',
        filename: 'Cherry Blossoms Ueno Park.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'upload',
        file_size: 398765,
        mime_type: 'image/jpeg'
      },
      {
        id: 'tokyo-photo-3',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Sushi Bar Group Experience.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'chat',
        file_size: 423456,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'tokyo-video-1',
      media_url: '/mock/videos/venue-tour.mp4',
      filename: 'Epic Karaoke Night Shibuya.mp4',
      media_type: 'video',
      metadata: { duration: 10, width: 1280, height: 720, poster: '/mock/images/concert-stage.jpg' },
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: 'chat',
      file_size: 15678000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'tokyo-file-1',
        media_url: '/mock/files/travel_itinerary.pdf',
        filename: 'JR Pass - 7 Day Tokyo Regional.pdf',
        media_type: 'document',
        metadata: { passType: '7-day', regions: ['Tokyo', 'Kanto'] },
        created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
        source: 'upload',
        file_size: 189456,
        mime_type: 'application/pdf'
      },
      {
        id: 'tokyo-file-2',
        media_url: '/mock/files/travel_itinerary.pdf',
        filename: 'Tokyo Itinerary Day by Day.pdf',
        media_type: 'document',
        metadata: { 
          isSchedule: true, 
          days: 10,
          extractedEvents: 15 
        },
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        source: 'upload',
        file_size: 567890,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'tokyo-link-1',
        url: 'https://www.booking.com/hotel/jp/the-millennials-shibuya.html',
        title: 'The Millennials Shibuya Capsule Hotel',
        description: 'Modern capsule hotel in the heart of Shibuya with high-tech amenities.',
        domain: 'booking.com',
        image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        source: 'places' as const,
        tags: ['capsule', 'modern', 'shibuya']
      },
      {
        id: 'tokyo-link-2',
        url: 'https://sushidai-tsukiji.com/',
        title: 'Sushi Dai - Tsukiji Outer Market',
        description: 'World-famous sushi restaurant known for the freshest tuna and traditional preparation.',
        domain: 'sushidai-tsukiji.com',
        image_url: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        source: 'places' as const,
        tags: ['sushi', 'traditional', 'tsukiji']
      },
      {
        id: 'tokyo-link-3',
        url: 'https://www.teamlab.art/e/planets/',
        title: 'teamLab Planets TOKYO Digital Art Museum',
        description: 'Immersive digital art experience with interactive installations and water features.',
        domain: 'teamlab.art',
        image_url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        source: 'places' as const,
        tags: ['art', 'digital', 'immersive']
      },
      {
        id: 'tokyo-link-4',
        url: 'https://www.robot-restaurant.com/',
        title: 'Robot Restaurant Shinjuku',
        description: 'Crazy robot show with lasers, music, and mechanical mayhem in Shinjuku.',
        domain: 'robot-restaurant.com',
        image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'places' as const,
        tags: ['entertainment', 'unique', 'shinjuku']
      }
    ]
  },

  // 3. Jack and Jill's destination wedding (Bali)
  3: {
    tripId: 3,
    tripTitle: "Jack and Jill's destination wedding",
    location: "Bali, Indonesia",
    photos: [
      {
        id: 'bali-photo-1',
        media_url: '/mock/images/wedding-ceremony.jpg',
        filename: 'Beachside Wedding Ceremony.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'upload',
        file_size: 567890,
        mime_type: 'image/jpeg'
      },
      {
        id: 'bali-photo-2',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Sunset Reception Ubud.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'chat',
        file_size: 456123,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'bali-video-1',
      media_url: '/mock/videos/venue-tour.mp4',
      filename: 'Wedding Ceremony Highlights.mp4',
      media_type: 'video',
      metadata: { duration: 12, width: 1920, height: 1080, poster: '/mock/images/wedding-ceremony.jpg' },
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      source: 'upload',
      file_size: 25678000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'bali-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'Villa Seminyak Wedding Package.pdf',
        media_type: 'document',
        metadata: { guests: 50, package: 'Premium Beach Wedding' },
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        source: 'upload',
        file_size: 423789,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'bali-link-1',
        url: 'https://www.seminyakbeachresort.com/',
        title: 'Seminyak Beach Resort & Spa',
        description: 'Luxury beachfront resort perfect for destination weddings with ocean views.',
        domain: 'seminyakbeachresort.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
        source: 'places' as const,
        tags: ['resort', 'wedding-venue', 'luxury']
      },
      {
        id: 'bali-link-2',
        url: 'https://www.lalucianbali.com/',
        title: 'La Lucciola - Beachside Italian',
        description: 'Romantic Italian restaurant with stunning ocean views and fresh seafood.',
        domain: 'lalucianbali.com',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'places' as const,
        tags: ['italian', 'romantic', 'ocean-view']
      },
      {
        id: 'bali-link-3',
        url: 'https://www.baliswing.com/',
        title: 'Bali Swing Adventure Experience',
        description: 'Thrilling jungle swings with incredible valley views for adventurous couples.',
        domain: 'baliswing.com',
        image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        source: 'places' as const,
        tags: ['adventure', 'scenic', 'couples']
      }
    ]
  },

  // Continue with remaining trips... (4-12)
  // For brevity, I'll include a few more key ones

  // 4. Kristen's Bachelorette Party (Nashville)  
  4: {
    tripId: 4,
    tripTitle: "Kristen's Bachelorette Party",
    location: "Nashville, TN",
    photos: [
      {
        id: 'nashville-photo-1',
        media_url: '/mock/images/concert-stage.jpg',
        filename: 'Honky Tonk Squad Goals.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 456789,
        mime_type: 'image/jpeg'
      },
      {
        id: 'nashville-photo-2',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Broadway Live Music Night.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'upload',
        file_size: 523456,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'nashville-video-1',
      media_url: '/mock/videos/venue-tour.mp4',
      filename: 'Bride Karaoke Highlights.mp4',
      media_type: 'video',
      metadata: { duration: 10, width: 1280, height: 720, poster: '/mock/images/concert-stage.jpg' },
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      source: 'chat',
      file_size: 13456000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'nashville-file-1',
        media_url: '/mock/images/conference-schedule-preview.jpg',
        filename: 'Grand Ole Opry VIP Tickets.jpg',
        media_type: 'image',
        metadata: { 
          isTicket: true, 
          venue: 'Grand Ole Opry', 
          date: '2025-11-09',
          extractedEvents: 1 
        },
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        source: 'upload',
        file_size: 234567,
        mime_type: 'image/jpeg'
      }
    ],
    links: [
      {
        id: 'nashville-link-1',
        url: 'https://www.omnihotels.com/hotels/nashville',
        title: 'Omni Nashville Hotel - Downtown',
        description: 'Luxury hotel in the heart of Music City with rooftop pool and spa services.',
        domain: 'omnihotels.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        source: 'places' as const,
        tags: ['hotel', 'luxury', 'downtown']
      },
      {
        id: 'nashville-link-2',
        url: 'https://www.hattiebs.com/',
        title: "Hattie B's Hot Chicken - Nashville Original",
        description: 'Famous Nashville hot chicken with multiple heat levels and Southern sides.',
        domain: 'hattiebs.com',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'places' as const,
        tags: ['chicken', 'nashville', 'spicy']
      },
      {
        id: 'nashville-link-3',
        url: 'https://www.ryman.com/',
        title: 'Ryman Auditorium - Mother Church of Country Music',
        description: 'Historic venue with legendary country music performances and backstage tours.',
        domain: 'ryman.com',
        image_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'places' as const,
        tags: ['music', 'historic', 'tour']
      }
    ]
  },

  // 6. Johnson Family Summer Vacay (Saratoga Springs)
  6: {
    tripId: 6,
    tripTitle: "Johnson Family Summer Vacay",
    location: "Saratoga Springs, NY",
    photos: [
      {
        id: 'saratoga-photo-1',
        media_url: '/mock/images/group-mountain-photo.jpg',
        filename: 'Family at Saratoga Race Course.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'chat',
        file_size: 445678,
        mime_type: 'image/jpeg'
      },
      {
        id: 'saratoga-photo-2',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Congress Park Family Walk.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'upload',
        file_size: 523789,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'saratoga-video-1',
      media_url: '/mock/videos/team-celebration.mp4',
      filename: 'Family Summer Adventure Montage.mp4',
      media_type: 'video',
      metadata: { duration: 10, width: 1280, height: 720, poster: '/mock/images/group-mountain-photo.jpg' },
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: 'chat',
      file_size: 16789000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'saratoga-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'Saratoga Arms Hotel Confirmation.pdf',
        media_type: 'document',
        metadata: { guests: 7, nights: 8 },
        created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
        source: 'upload',
        file_size: 345600,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'saratoga-link-1',
        url: 'https://www.saratogaracecourse.com/',
        title: 'Saratoga Race Course - Historic Horse Racing',
        description: 'Americas oldest thoroughbred racing venue with summer meets and family events.',
        domain: 'saratogaracecourse.com',
        image_url: 'https://images.unsplash.com/photo-1568032284447-5d3bcb9f9ef8?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
        source: 'places' as const,
        tags: ['racing', 'historic', 'entertainment']
      },
      {
        id: 'saratoga-link-2',
        url: 'https://parks.ny.gov/parks/saratogaspa/',
        title: 'Saratoga Spa State Park',
        description: 'Natural mineral springs, hiking trails, and the historic Roosevelt Baths & Spa.',
        domain: 'parks.ny.gov',
        image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        source: 'places' as const,
        tags: ['park', 'spa', 'wellness']
      },
      {
        id: 'saratoga-link-3',
        url: 'https://www.saratoga.com/restaurants/',
        title: 'Downtown Saratoga Restaurants & Cafes',
        description: 'Historic Broadway street with farm-to-table dining and local wineries.',
        domain: 'saratoga.com',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        source: 'places' as const,
        tags: ['dining', 'downtown', 'local']
      }
    ]
  },

  // 7. Fantasy Football Golf Outing (Phoenix)
  7: {
    tripId: 7,
    tripTitle: "Fantasy Football Chat's Annual Golf Outing",
    location: "Phoenix, Arizona",
    photos: [
      {
        id: 'phoenix-photo-1',
        media_url: '/mock/images/group-mountain-photo.jpg',
        filename: 'Desert Golf Championship.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 434567,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'phoenix-video-1',
      media_url: '/mock/videos/team-celebration.mp4',
      filename: 'Hole-in-One Celebration.mp4',
      media_type: 'video',
      metadata: { duration: 8, width: 1280, height: 720, poster: '/mock/images/group-mountain-photo.jpg' },
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      source: 'chat',
      file_size: 9876000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'phoenix-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'TPC Scottsdale Tee Times.pdf',
        media_type: 'document',
        metadata: { players: 6, rounds: 3 },
        created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
        source: 'upload',
        file_size: 267890,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'phoenix-link-1',
        url: 'https://www.tpc.com/scottsdale/',
        title: 'TPC Scottsdale - Stadium Course',
        description: 'Home of the Waste Management Phoenix Open with the famous 16th hole stadium.',
        domain: 'tpc.com',
        image_url: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        source: 'places' as const,
        tags: ['golf', 'pga', 'tournament']
      },
      {
        id: 'phoenix-link-2',
        url: 'https://www.fourseasons.com/scottsdale/',
        title: 'Four Seasons Resort Scottsdale at Troon North',
        description: 'Luxury desert resort with championship golf courses and spa in the Sonoran Desert.',
        domain: 'fourseasons.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        source: 'places' as const,
        tags: ['resort', 'luxury', 'golf']
      },
      {
        id: 'phoenix-link-3',
        url: 'https://www.tripadvisor.com/Restaurants-g31310-Phoenix_Arizona.html',
        title: "Scottsdale Steakhouses & Fine Dining",
        description: "Mastro's Steakhouse, Durant's, and top-rated desert restaurants.",
        domain: 'tripadvisor.com',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        source: 'places' as const,
        tags: ['steakhouse', 'dining', 'scottsdale']
      }
    ]
  },

  // 5. Coachella Squad 2026
  5: {
    tripId: 5,
    tripTitle: "Coachella Squad 2026",
    location: "Indio, CA",
    photos: [
      {
        id: 'coachella-photo-1',
        media_url: '/mock/images/concert-stage.jpg',
        filename: 'Main Stage Festival Vibes.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 445678,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-photo-2',
        media_url: '/mock/images/group-mountain-photo.jpg',
        filename: 'Ferris Wheel Desert Sunset.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'upload',
        file_size: 523456,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-photo-3',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Squad Goals at Sahara Tent.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'chat',
        file_size: 378901,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-photo-4',
        media_url: '/mock/images/beach-volleyball.jpg',
        filename: 'Desert House Pool Party.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'upload',
        file_size: 456789,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-photo-5',
        media_url: '/mock/images/concert-stage.jpg',
        filename: 'Food Truck Adventures.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
        source: 'chat',
        file_size: 387654,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-photo-6',
        media_url: '/mock/images/group-mountain-photo.jpg',
        filename: 'Late Night Art Installation.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'upload',
        file_size: 423567,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-photo-7',
        media_url: '/mock/images/beach-volleyball.jpg',
        filename: 'Morning Coffee Desert Views.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
        source: 'chat',
        file_size: 398745,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-photo-8',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Full Group Festival Outfits.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        source: 'upload',
        file_size: 467832,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [
      {
        id: 'coachella-video-1',
        media_url: '/mock/videos/venue-tour.mp4',
        filename: 'Festival Highlights Reel.mp4',
        media_type: 'video',
        metadata: { duration: 95, width: 1280, height: 720 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 18456000,
        mime_type: 'video/mp4'
      },
      {
        id: 'coachella-video-2',
        media_url: '/mock/videos/team-celebration.mp4',
        filename: 'Epic Desert House Tour.mp4',
        media_type: 'video',
        metadata: { duration: 42, width: 1280, height: 720 },
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        source: 'upload',
        file_size: 8734000,
        mime_type: 'video/mp4'
      },
      {
        id: 'coachella-video-3',
        media_url: '/mock/videos/venue-tour.mp4',
        filename: 'Desert Sunset Timelapse.mp4',
        media_type: 'video',
        metadata: { duration: 28, width: 1280, height: 720 },
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        source: 'chat',
        file_size: 5632000,
        mime_type: 'video/mp4'
      }
    ],
    files: [
      {
        id: 'coachella-file-1',
        media_url: '/mock/images/conference-schedule-preview.jpg',
        filename: 'Weekend 1 Festival Passes.jpg',
        media_type: 'image',
        metadata: { 
          isTicket: true, 
          venue: 'Coachella Valley Music Festival', 
          date: '2026-04-10',
          extractedEvents: 3 
        },
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        source: 'upload',
        file_size: 234567,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-file-2',
        media_url: '/mock/files/travel_itinerary.pdf',
        filename: 'Coachella 2026 Lineup & Schedule.pdf',
        media_type: 'document',
        metadata: { 
          isSchedule: true,
          extractedEvents: 47,
          pageCount: 8
        },
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        source: 'upload',
        file_size: 2456789,
        mime_type: 'application/pdf'
      },
      {
        id: 'coachella-file-3',
        media_url: '/mock/images/dinner-receipt-preview.jpg',
        filename: 'Desert House Rental Receipt.jpg',
        media_type: 'image',
        metadata: { 
          isReceipt: true,
          totalAmount: 2400,
          splitCount: 8,
          perPersonAmount: 300,
          preferredMethod: 'venmo'
        },
        created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
        source: 'chat',
        file_size: 345678,
        mime_type: 'image/jpeg'
      },
      {
        id: 'coachella-file-4',
        media_url: '/mock/files/travel_itinerary.pdf',
        filename: 'Coachella Festival Grounds Map.pdf',
        media_type: 'document',
        metadata: { 
          pageCount: 2,
          extractedEvents: 0
        },
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        source: 'upload',
        file_size: 1234567,
        mime_type: 'application/pdf'
      },
      {
        id: 'coachella-file-5',
        media_url: '/mock/images/conference-schedule-preview.jpg',
        filename: 'VIP Camping Pass Confirmation.jpg',
        media_type: 'image',
        metadata: { 
          isTicket: true,
          venue: 'Coachella VIP Camping',
          date: '2026-04-10'
        },
        created_at: new Date(Date.now() - 86400000 * 35).toISOString(),
        source: 'upload',
        file_size: 198765,
        mime_type: 'image/jpeg'
      }
    ],
    links: [
      {
        id: 'coachella-link-1',
        url: 'https://www.airbnb.com/rooms/coachella-desert-house',
        title: 'Desert House Coachella - 8 Guests',
        description: 'Stunning desert house with pool, perfect for festival groups.',
        domain: 'airbnb.com',
        image_url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        source: 'places' as const,
        tags: ['airbnb', 'desert', 'festival']
      },
      {
        id: 'coachella-link-2',
        url: 'https://www.yelp.com/biz/pappy-and-harriets-pioneertown',
        title: 'Pappy & Harriet\'s Pioneertown Palace',
        description: 'Legendary desert venue and restaurant, perfect for pre-festival dinner.',
        domain: 'yelp.com',
        image_url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 28).toISOString(),
        source: 'places' as const,
        tags: ['restaurant', 'desert', 'iconic']
      },
      {
        id: 'coachella-link-3',
        url: 'https://www.uber.com/us/en/ride/uber-shuttle/',
        title: 'Uber Festival Shuttle Service',
        description: 'Pre-book shuttle rides to avoid festival traffic and parking.',
        domain: 'uber.com',
        image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
        source: 'places' as const,
        tags: ['transportation', 'shuttle', 'festival']
      },
      {
        id: 'coachella-link-4',
        url: 'https://www.coachella.com/lineup',
        title: 'Coachella 2026 Official Lineup',
        description: 'Full artist lineup and set times for both weekends.',
        domain: 'coachella.com',
        image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 40).toISOString(),
        source: 'places' as const,
        tags: ['lineup', 'official', 'schedule']
      },
      {
        id: 'coachella-link-5',
        url: 'https://www.wholefoodsmarket.com/stores/palmdesert',
        title: 'Whole Foods Market Palm Desert',
        description: 'Stock up on snacks and supplies before heading to the festival.',
        domain: 'wholefoodsmarket.com',
        image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 22).toISOString(),
        source: 'places' as const,
        tags: ['grocery', 'supplies', 'healthy']
      }
    ]
  },

  // 9. Newly Divorced Wine-Tasting Getaway (Napa Valley)
  9: {
    tripId: 9,
    tripTitle: "Newly Divorced Wine-Tasting Getaway", 
    location: "Napa Valley, CA",
    photos: [
      {
        id: 'napa-photo-1',
        media_url: '/mock/images/wedding-ceremony.jpg',
        filename: 'Vineyard Toast with the Girls.jpg',
        media_type: 'image' as const,
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat' as const,
        file_size: 445678,
        mime_type: 'image/jpeg'
      },
      {
        id: 'napa-photo-2', 
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Spa Day Relaxation.jpg',
        media_type: 'image' as const,
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        source: 'upload' as const,
        file_size: 523456,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [
      {
        id: 'napa-video-1',
        media_url: '/mock/videos/venue-tour.mp4',
        filename: 'Hot Air Balloon Over Vineyards.mp4',
        media_type: 'video' as const,
        metadata: { duration: 45, width: 1280, height: 720 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat' as const,
        file_size: 8456000,
        mime_type: 'video/mp4'
      }
    ],
    files: [
      {
        id: 'napa-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'Auberge du Soleil Resort Confirmation.pdf',
        media_type: 'document' as const,
        metadata: { 
          nights: 4,
          guests: 6
        },
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        source: 'upload' as const,
        file_size: 234567,
        mime_type: 'application/pdf'
      },
      {
        id: 'napa-file-2',
        media_url: '/mock/files/travel_itinerary.pdf',
        filename: 'Napa Wine Tour Reservations.pdf',
        media_type: 'document' as const,
        metadata: { 
          extractedEvents: 5,
          pageCount: 3
        },
        created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
        source: 'upload' as const,
        file_size: 1456789,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'napa-link-1',
        url: 'https://www.viator.com/Napa-Valley/d909-ttd',
        title: 'Napa Valley Winery Tours & Tastings',
        description: 'Full-day wine tasting experiences at boutique vineyards and famous estates.',
        domain: 'viator.com',
        image_url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        source: 'places' as const,
        tags: ['wine', 'tasting', 'tour']
      },
      {
        id: 'napa-link-2',
        url: 'https://www.aubergeresorts.com/aubergedusoleil/',
        title: 'Auberge du Soleil - Luxury Spa Resort',
        description: 'Five-star hillside resort with Michelin-starred dining and world-class spa.',
        domain: 'aubergeresorts.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
        source: 'places' as const,
        tags: ['luxury', 'spa', 'resort']
      },
      {
        id: 'napa-link-3',
        url: 'https://www.napavalleyballoons.com/',
        title: 'Napa Valley Hot Air Balloon Rides',
        description: 'Sunrise flights over vineyards with champagne brunch after landing.',
        domain: 'napavalleyballoons.com',
        image_url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        source: 'places' as const,
        tags: ['balloon', 'scenic', 'experience']
      }
    ]
  },

  // 8. Tulum Wellness Retreat
  8: {
    tripId: 8,
    tripTitle: "Tulum Wellness Retreat",
    location: "Tulum, Mexico",
    photos: [
      {
        id: 'tulum-photo-1',
        media_url: '/mock/images/wedding-ceremony.jpg',
        filename: 'Beach Yoga Session.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 456789,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'tulum-video-1',
      media_url: '/mock/videos/venue-tour.mp4',
      filename: 'Cenote Diving Adventure.mp4',
      media_type: 'video',
      metadata: { duration: 30, width: 1280, height: 720 },
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: 'chat',
      file_size: 11456000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'tulum-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'Azulik Eco-Resort Confirmation.pdf',
        media_type: 'document',
        metadata: { nights: 7, guests: 8 },
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        source: 'upload',
        file_size: 345600,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'tulum-link-1',
        url: 'https://www.booking.com/city/mx/tulum.html',
        title: 'Tulum Beachfront Boutique Hotels',
        description: 'Eco-chic resorts on the Caribbean coast with yoga studios and wellness programs.',
        domain: 'booking.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        source: 'places' as const,
        tags: ['eco-resort', 'beach', 'wellness']
      },
      {
        id: 'tulum-link-2',
        url: 'https://www.bookyogaretreats.com/tulum',
        title: 'Tulum Yoga Retreats & Classes',
        description: 'Beachfront yoga studios and wellness centers with meditation and breathwork.',
        domain: 'bookyogaretreats.com',
        image_url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
        source: 'places' as const,
        tags: ['yoga', 'wellness', 'retreat']
      },
      {
        id: 'tulum-link-3',
        url: 'https://www.getyourguide.com/tulum-l1087/',
        title: 'Cenote Swimming & Snorkeling Tours',
        description: 'Underground caves and natural pools with crystal-clear waters.',
        domain: 'getyourguide.com',
        image_url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
        source: 'places' as const,
        tags: ['cenote', 'snorkeling', 'adventure']
      }
    ]
  },

  // 10. Corporate Holiday Ski Trip – Aspen
  10: {
    tripId: 10,
    tripTitle: "Corporate Holiday Ski Trip – Aspen",
    location: "Aspen, CO",
    photos: [
      {
        id: 'aspen-corp-photo-1',
        media_url: '/mock/images/group-mountain-photo.jpg',
        filename: 'Team Ski Day on Aspen Mountain.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 467890,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'aspen-corp-video-1',
      media_url: '/mock/videos/team-celebration.mp4',
      filename: 'Corporate Team Building Day.mp4',
      media_type: 'video',
      metadata: { duration: 35, width: 1280, height: 720 },
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: 'chat',
      file_size: 13567000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'aspen-corp-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'St. Regis Aspen Group Booking.pdf',
        media_type: 'document',
        metadata: { nights: 5, rooms: 12 },
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        source: 'upload',
        file_size: 456789,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'aspen-corp-link-1',
        url: 'https://www.aspensnowmass.com/',
        title: 'Aspen Snowmass Ski Resort Info',
        description: 'Four mountains with world-class skiing, lift tickets, and group rates.',
        domain: 'aspensnowmass.com',
        image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 35).toISOString(),
        source: 'places' as const,
        tags: ['skiing', 'resort', 'corporate']
      },
      {
        id: 'aspen-corp-link-2',
        url: 'https://www.booking.com/city/us/aspen.html',
        title: 'Luxury Ski-In/Ski-Out Lodges',
        description: 'Premium mountain hotels with spa services and meeting rooms for teams.',
        domain: 'booking.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 40).toISOString(),
        source: 'places' as const,
        tags: ['luxury', 'lodging', 'ski']
      },
      {
        id: 'aspen-corp-link-3',
        url: 'https://www.tripadvisor.com/Restaurants-g29141-Aspen_Colorado.html',
        title: 'Best Restaurants in Downtown Aspen',
        description: 'Fine dining and après-ski spots perfect for corporate dinners and celebrations.',
        domain: 'tripadvisor.com',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
        source: 'places' as const,
        tags: ['dining', 'apres-ski', 'upscale']
      }
    ]
  },

  // 11. Disney Cruise Family Vacation
  11: {
    tripId: 11,
    tripTitle: "Disney Cruise Family Vacation",
    location: "Port Canaveral, FL",
    photos: [
      {
        id: 'disney-photo-1',
        media_url: '/mock/images/travel-selfie.jpg',
        filename: 'Family with Mickey on Deck.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 445678,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'disney-video-1',
      media_url: '/mock/videos/team-celebration.mp4',
      filename: 'Disney Character Meet & Greet.mp4',
      media_type: 'video',
      metadata: { duration: 25, width: 1280, height: 720 },
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: 'chat',
      file_size: 10234000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'disney-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'Disney Dream Cruise Booking.pdf',
        media_type: 'document',
        metadata: { cabins: 2, guests: 7 },
        created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
        source: 'upload',
        file_size: 567890,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'disney-link-1',
        url: 'https://disneycruise.disney.go.com/',
        title: 'Disney Cruise Line Official Site',
        description: 'Cruise bookings, itineraries, character experiences, and onboard activities.',
        domain: 'disneycruise.disney.go.com',
        image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 50).toISOString(),
        source: 'places' as const,
        tags: ['cruise', 'disney', 'family']
      },
      {
        id: 'disney-link-2',
        url: 'https://www.kennedyspacecenter.com/',
        title: 'Kennedy Space Center Tickets',
        description: 'NASA tours and exhibits - perfect pre or post-cruise day trip with the family.',
        domain: 'kennedyspacecenter.com',
        image_url: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        source: 'places' as const,
        tags: ['nasa', 'space', 'attraction']
      },
      {
        id: 'disney-link-3',
        url: 'https://www.tripadvisor.com/Restaurants-g34044-Cocoa_Beach_Florida.html',
        title: 'Cocoa Beach Restaurants & Dining',
        description: 'Fresh seafood and beachfront cafes near the port for pre-cruise meals.',
        domain: 'tripadvisor.com',
        image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        source: 'places' as const,
        tags: ['seafood', 'beach', 'family-friendly']
      }
    ]
  },

  // 12. Yellowstone National-Park Hiking Adventure
  12: {
    tripId: 12,
    tripTitle: "Yellowstone National-Park Hiking Adventure",
    location: "Yellowstone, WY",
    photos: [
      {
        id: 'yellowstone-photo-1',
        media_url: '/mock/images/group-mountain-photo.jpg',
        filename: 'Old Faithful Group Photo.jpg',
        media_type: 'image',
        metadata: { width: 800, height: 600 },
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        source: 'chat',
        file_size: 478901,
        mime_type: 'image/jpeg'
      }
    ],
    videos: [{
      id: 'yellowstone-video-1',
      media_url: '/mock/videos/venue-tour.mp4',
      filename: 'Bison Herd Crossing.mp4',
      media_type: 'video',
      metadata: { duration: 40, width: 1280, height: 720 },
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      source: 'chat',
      file_size: 14567000,
      mime_type: 'video/mp4'
    }],
    files: [
      {
        id: 'yellowstone-file-1',
        media_url: '/mock/files/hotel-confirmation.pdf',
        filename: 'Old Faithful Inn Reservation.pdf',
        media_type: 'document',
        metadata: { nights: 7, rooms: 3 },
        created_at: new Date(Date.now() - 86400000 * 40).toISOString(),
        source: 'upload',
        file_size: 345678,
        mime_type: 'application/pdf'
      }
    ],
    links: [
      {
        id: 'yellowstone-link-1',
        url: 'https://www.nps.gov/yell/planyourvisit/fees.htm',
        title: 'Yellowstone National Park Passes',
        description: 'Entry fees, annual passes, and reservation requirements for visiting the park.',
        domain: 'nps.gov',
        image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 45).toISOString(),
        source: 'places' as const,
        tags: ['national-park', 'pass', 'entrance']
      },
      {
        id: 'yellowstone-link-2',
        url: 'https://www.yellowstonenationalparklodges.com/',
        title: 'Old Faithful Inn & Park Lodges',
        description: 'Historic in-park lodging with rustic cabins and full-service hotels.',
        domain: 'yellowstonenationalparklodges.com',
        image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 50).toISOString(),
        source: 'places' as const,
        tags: ['lodging', 'historic', 'in-park']
      },
      {
        id: 'yellowstone-link-3',
        url: 'https://www.alltrails.com/parks/us/wyoming/yellowstone-national-park',
        title: 'Best Hiking Trails in Yellowstone',
        description: 'Grand Prismatic Spring, Lamar Valley wildlife viewing, and backcountry trails.',
        domain: 'alltrails.com',
        image_url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=400&h=200&fit=crop',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        source: 'places' as const,
        tags: ['hiking', 'trails', 'wildlife']
      }
    ]
  }
};

class TripSpecificMockDataService {
  private static readonly USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true' || import.meta.env.DEV;

  static isUsingMockData(): boolean {
    return this.USE_MOCK_DATA;
  }

  static getTripMockData(tripId: string | number): TripMockData | null {
    if (!this.USE_MOCK_DATA) return null;
    
    const numericTripId = typeof tripId === 'string' ? parseInt(tripId, 10) : tripId;
    return TRIP_MOCK_DATA[numericTripId] || null;
  }

  static getMockMediaItems(tripId: string | number): TripSpecificMediaItem[] {
    const tripData = this.getTripMockData(tripId);
    if (!tripData) return [];
    
    return [
      ...tripData.photos,
      ...tripData.videos,
      ...tripData.files
    ];
  }

  static getMockLinkItems(tripId: string | number): TripSpecificLinkItem[] {
    const tripData = this.getTripMockData(tripId);
    if (!tripData) return [];
    
    return tripData.links;
  }

  static getMockMediaByType(tripId: string | number, type: 'photos' | 'videos' | 'files'): TripSpecificMediaItem[] {
    const tripData = this.getTripMockData(tripId);
    if (!tripData) return [];
    
    return tripData[type] || [];
  }

  static getMockLinks(tripId: string | number): TripSpecificLinkItem[] {
    const tripData = this.getTripMockData(tripId);
    if (!tripData) return [];
    
    return tripData.links;
  }

  // Helper methods for compatibility
  static async isEnabled(): Promise<boolean> {
    // Check both environment variable and demo mode
    const envEnabled = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    const demoModeValue = await getStorageItem<string>('TRIPS_DEMO_MODE');
    const demoModeEnabled = demoModeValue === 'true';
    return envEnabled || demoModeEnabled;
  }

  static getTripMediaItems(tripId: number): TripSpecificMediaItem[] {
    return this.getMockMediaItems(tripId);
  }

  static getTripLinkItems(tripId: number): TripSpecificLinkItem[] {
    return this.getMockLinkItems(tripId);
  }
}

export default TripSpecificMockDataService;
export type { TripSpecificMediaItem, TripSpecificLinkItem, TripMockData };