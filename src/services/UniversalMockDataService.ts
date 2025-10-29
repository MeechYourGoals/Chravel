import { detectTripTier } from '../utils/tripTierDetector';

interface MediaItem {
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

interface LinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  image_url?: string;
  created_at: string;
  source: 'chat' | 'manual' | 'places';
  tags?: string[];
}

export class UniversalMockDataService {
  private static fallbackPhotos: MediaItem[] = [
    {
      id: 'fallback-photo-1',
      media_url: '/mock/images/travel-selfie.jpg',
      filename: 'Group Travel Selfie.jpg',
      media_type: 'image',
      metadata: { width: 1920, height: 1080 },
      created_at: new Date(Date.now() - 3600000).toISOString(),
      source: 'chat',
      file_size: 2457600,
      mime_type: 'image/jpeg'
    },
    {
      id: 'fallback-photo-2',
      media_url: '/mock/images/group-mountain-photo.jpg',
      filename: 'Mountain Adventure.jpg',
      media_type: 'image',
      metadata: { width: 1920, height: 1080 },
      created_at: new Date(Date.now() - 7200000).toISOString(),
      source: 'upload',
      file_size: 3145728,
      mime_type: 'image/jpeg'
    },
    {
      id: 'fallback-photo-3',
      media_url: '/mock/images/dinner-receipt-preview.jpg',
      filename: 'Group Dinner.jpg',
      media_type: 'image',
      metadata: { width: 1920, height: 1080 },
      created_at: new Date(Date.now() - 10800000).toISOString(),
      source: 'chat',
      file_size: 1843200,
      mime_type: 'image/jpeg'
    },
    {
      id: 'fallback-photo-4',
      media_url: '/mock/images/wedding-ceremony.jpg',
      filename: 'Ceremony Moment.jpg',
      media_type: 'image',
      metadata: { width: 1920, height: 1080 },
      created_at: new Date(Date.now() - 14400000).toISOString(),
      source: 'upload',
      file_size: 2621440,
      mime_type: 'image/jpeg'
    }
  ];

  private static fallbackVideos: MediaItem[] = [
    {
      id: 'fallback-video-1',
      media_url: '/mock/videos/team-celebration.mp4',
      filename: 'Team Celebration.mp4',
      media_type: 'video',
      metadata: { duration: 45, width: 1920, height: 1080 },
      created_at: new Date(Date.now() - 5400000).toISOString(),
      source: 'chat',
      file_size: 15728640,
      mime_type: 'video/mp4'
    },
    {
      id: 'fallback-video-2',
      media_url: '/mock/videos/venue-tour.mp4',
      filename: 'Venue Walkthrough.mp4',
      media_type: 'video',
      metadata: { duration: 120, width: 1920, height: 1080 },
      created_at: new Date(Date.now() - 9000000).toISOString(),
      source: 'upload',
      file_size: 45875200,
      mime_type: 'video/mp4'
    }
  ];

  private static fallbackFiles: MediaItem[] = [
    {
      id: 'fallback-file-1',
      media_url: '/mock/files/dinner_receipt.jpg',
      filename: 'Group Dinner Receipt.jpg',
      media_type: 'document',
      metadata: {
        isReceipt: true,
        totalAmount: 127.45,
        splitCount: 4,
        perPersonAmount: 31.86,
        preferredMethod: 'venmo'
      },
      created_at: new Date(Date.now() - 1800000).toISOString(),
      source: 'upload',
      file_size: 2048000,
      mime_type: 'image/jpeg'
    },
    {
      id: 'fallback-file-2',
      media_url: '/mock/files/dodgers_tickets.pdf',
      filename: 'Event Tickets.pdf',
      media_type: 'document',
      metadata: {
        isTicket: true,
        extractedEvents: 1
      },
      created_at: new Date(Date.now() - 5400000).toISOString(),
      source: 'upload',
      file_size: 512000,
      mime_type: 'application/pdf'
    },
    {
      id: 'fallback-file-3',
      media_url: '/mock/images/conference-schedule-preview.jpg',
      filename: 'Event Schedule.jpg',
      media_type: 'document',
      metadata: {
        isSchedule: true,
        extractedEvents: 12
      },
      created_at: new Date(Date.now() - 9000000).toISOString(),
      source: 'chat',
      file_size: 1536000,
      mime_type: 'image/jpeg'
    },
    {
      id: 'fallback-file-4',
      media_url: '/mock/files/travel_itinerary.pdf',
      filename: 'Travel Itinerary.pdf',
      media_type: 'document',
      metadata: {
        extractedEvents: 8
      },
      created_at: new Date(Date.now() - 12600000).toISOString(),
      source: 'upload',
      file_size: 768000,
      mime_type: 'application/pdf'
    }
  ];

  private static fallbackLinks: LinkItem[] = [
    {
      id: 'fallback-link-1',
      url: 'https://airbnb.com/rooms/12345',
      title: 'Beautiful Downtown Loft - Perfect for Groups',
      description: 'Spacious 3BR/2BA loft in the heart of downtown. Sleeps 8 comfortably with modern amenities.',
      domain: 'airbnb.com',
      image_url: '/mock/images/airbnb-listing.jpg',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      source: 'places' as const
    },
    {
      id: 'fallback-link-2',
      url: 'https://opentable.com/restaurant/profile/54321',
      title: 'Sunset Rooftop Restaurant - Reservations Available',
      description: 'Award-winning rooftop dining with panoramic city views. Perfect for group celebrations.',
      domain: 'opentable.com',
      image_url: '/mock/images/restaurant-rooftop.jpg',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      source: 'places' as const
    },
    {
      id: 'fallback-link-3',
      url: 'https://viator.com/tours/city-walking-tour',
      title: 'Historic City Walking Tour - Small Groups Welcome',
      description: 'Discover hidden gems and local history on this 3-hour guided walking tour.',
      domain: 'viator.com',
      image_url: '/mock/images/walking-tour.jpg',
      created_at: new Date(Date.now() - 10800000).toISOString(),
      source: 'places' as const
    },
    {
      id: 'fallback-link-4',
      url: 'https://eventbrite.com/e/concert-tickets',
      title: 'Live Music Concert - Group Discount Available',
      description: 'Don\'t miss this incredible live performance. Group rates available for 6+ people.',
      domain: 'eventbrite.com',
      created_at: new Date(Date.now() - 14400000).toISOString(),
      source: 'places' as const
    }
  ];

  public static getUniversalMockData(tripId: string): {
    photos: MediaItem[];
    videos: MediaItem[];
    files: MediaItem[];
    links: LinkItem[];
  } {
    const tripTier = detectTripTier(tripId);
    
    // Generate trip-specific IDs to avoid conflicts
    const photoData = this.fallbackPhotos.map((item, index) => ({
      ...item,
      id: `${tripId}-photo-${index + 1}`
    }));

    const videoData = this.fallbackVideos.map((item, index) => ({
      ...item,
      id: `${tripId}-video-${index + 1}`
    }));

    const fileData = this.fallbackFiles.map((item, index) => ({
      ...item,
      id: `${tripId}-file-${index + 1}`
    }));

    const linkData = this.fallbackLinks.map((item, index) => ({
      ...item,
      id: `${tripId}-link-${index + 1}`
    }));

    // Customize based on trip tier
    if (tripTier === 'pro') {
      // Add pro-specific content
      fileData.push({
        id: `${tripId}-pro-file-1`,
        media_url: '/mock/files/tour_rider.pdf',
        filename: 'Tour Rider Requirements.pdf',
        media_type: 'document',
        metadata: { extractedEvents: 5 },
        created_at: new Date(Date.now() - 1200000).toISOString(),
        source: 'upload',
        file_size: 1024000,
        mime_type: 'application/pdf'
      });
    }

    if (tripTier === 'event') {
      // Add event-specific content
      fileData.push({
        id: `${tripId}-event-file-1`,
        media_url: '/mock/files/speaker_guidelines.pdf',
        filename: 'Speaker Guidelines.pdf',
        media_type: 'document',
        metadata: { extractedEvents: 3 },
        created_at: new Date(Date.now() - 1500000).toISOString(),
        source: 'upload',
        file_size: 896000,
        mime_type: 'application/pdf'
      });
    }

    return {
      photos: photoData,
      videos: videoData,
      files: fileData,
      links: linkData
    };
  }

  public static getCombinedMediaItems(tripId: string): MediaItem[] {
    const data = this.getUniversalMockData(tripId);
    return [...data.photos, ...data.videos, ...data.files];
  }

  public static getLinkItems(tripId: string): LinkItem[] {
    const data = this.getUniversalMockData(tripId);
    return data.links;
  }
}

export default UniversalMockDataService;