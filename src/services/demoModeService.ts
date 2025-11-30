
import { secureStorageService } from './secureStorageService';
import { mockPolls } from '@/mockData/polls';
import TripSpecificMockDataService from './tripSpecificMockDataService';

interface MockMessage {
  id: string;
  trip_type?: string;
  sender_name: string;
  sender_id?: string;
  message_content: string;
  delay_seconds?: number;
  timestamp_offset_days?: number;
  tags?: string[];
}

export type { MockMessage };

interface MockBroadcast {
  id: string;
  trip_type?: string;
  sender_name: string;
  content: string;
  location?: string;
  tag: 'chill' | 'logistics' | 'urgent' | 'emergency';
  timestamp_offset_hours?: number;
}

export interface MockTrip {
  id: string;
  name: string;
  description?: string;
  destination?: string;
  start_date?: string;
  end_date?: string;
  cover_image_url?: string;
  trip_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface MockPayment {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  description: string;
  split_count: number;
  split_participants: string[];
  payment_methods: string[];
  created_by: string;
  created_at: string;
  is_settled: boolean;
}

export interface MockPoll {
  id: string;
  trip_id: string;
  question: string;
  options: Array<{ id: string; text: string; votes: number }>;
  total_votes: number;
  created_by: string;
  created_at: string;
  status: string;
}

export interface MockMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface SessionPayment {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  description: string;
  split_count: number;
  split_participants: string[];
  payment_methods: string[];
  created_by: string;
  createdByName: string;
  created_at: string;
  is_settled: boolean;
}

export interface SessionPersonalBasecamp {
  id: string;
  trip_id: string;
  user_id: string;
  name?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

class DemoModeService {
  private sessionPayments: Map<string, SessionPayment[]> = new Map();
  private sessionPersonalBasecamps: Map<string, SessionPersonalBasecamp> = new Map();
  private sessionTripBasecamps: Map<string, { name?: string; address: string }> = new Map();
  getTripType(trip: any): string {
    if (!trip) return 'demo';
    if (trip.category === 'pro') return 'pro-trip';
    return 'consumer-trip';
  }

  async isDemoModeEnabled(userId?: string): Promise<boolean> {
    return await secureStorageService.isDemoModeEnabled(userId);
  }

  async enableDemoMode(userId?: string): Promise<void> {
    await secureStorageService.setDemoMode(true, userId);
  }

  async disableDemoMode(userId?: string): Promise<void> {
    await secureStorageService.setDemoMode(false, userId);
  }

  getMockMessages(tripType: string, excludePayments: boolean = false, currentUserId?: string): MockMessage[] {
    // Enhanced mock messages with diverse, realistic names and proper message types
    const baseMessages: MockMessage[] = [
      // Regular conversation messages
      {
        id: 'msg_1',
        trip_type: tripType,
        sender_name: 'Sarah Chen',
        message_content: 'Super excited for this trip! Has everyone seen the weather forecast?',
        timestamp_offset_days: 2,
        tags: ['conversation']
      },
      {
        id: 'msg_2',
        trip_type: tripType,
        sender_name: 'Marcus Johnson',
        message_content: 'Just booked my flight! Landing at 3:30 PM on Friday 🛬',
        timestamp_offset_days: 2,
        tags: ['travel', 'logistics']
      },
      {
        id: 'msg_3',
        trip_type: tripType,
        sender_name: 'Priya Patel',
        message_content: 'Found an amazing restaurant for dinner - sending the link now!',
        timestamp_offset_days: 1,
        tags: ['restaurants', 'planning']
      },
      
      // Broadcast messages
      {
        id: 'msg_4',
        trip_type: tripType,
        sender_name: 'Emma Rodriguez',
        message_content: 'Meeting at hotel lobby at 9 AM sharp tomorrow for our group activity!',
        timestamp_offset_days: 1,
        tags: ['broadcast', 'logistics', 'coordination']
      },
      {
        id: 'msg_5',
        trip_type: tripType,
        sender_name: 'Alex Kim',
        message_content: 'Weather alert: Rain expected this afternoon. Bring umbrellas or jackets!',
        timestamp_offset_days: 1,
        tags: ['broadcast', 'urgent', 'weather']
      },
      
      // Emergency broadcast
      {
        id: 'msg_6',
        trip_type: tripType,
        sender_name: 'David Thompson',
        message_content: 'URGENT: Flight departure gate changed to B12. All passengers report immediately!',
        timestamp_offset_days: 0,
        tags: ['broadcast', 'emergency', 'urgent', 'travel']
      },
      
      // More regular messages
      {
        id: 'msg_7',
        trip_type: tripType,
        sender_name: 'Maya Williams',
        message_content: 'The sunset views from our hotel room are incredible! 📸',
        timestamp_offset_days: 0,
        tags: ['conversation', 'photos']
      },
      {
        id: 'msg_8',
        trip_type: tripType,
        sender_name: 'Jordan Lee',
        message_content: 'Does anyone want to split an Uber to the downtown area?',
        timestamp_offset_days: 0,
        tags: ['conversation', 'transportation']
      },
      
      // Additional broadcast
      {
        id: 'msg_9',
        trip_type: tripType,
        sender_name: 'Sofia Garcia',
        message_content: 'Reminder: Group dinner reservation is at 7:30 PM at Bella Vista. Please confirm attendance!',
        timestamp_offset_days: 0,
        tags: ['broadcast', 'logistics', 'dinner']
      },
      
      {
        id: 'msg_10',
        trip_type: tripType,
        sender_name: 'Chris Anderson',
        message_content: 'Just checked in! Room 502 if anyone needs anything 👍',
        timestamp_offset_days: 0,
        tags: ['conversation', 'checkin']
      },
      
      // Payment Messages
      {
        id: 'payment_1',
        trip_type: tripType,
        sender_name: 'Sarah Chen',
        message_content: 'Dinner at Sakura Restaurant - USD 240.00 (split 4 ways) • Pay me $60.00 via Venmo: @sarahc94',
        timestamp_offset_days: 1,
        tags: ['payment', 'expense']
      },
      {
        id: 'payment_2',
        trip_type: tripType,
        sender_name: 'Marcus Johnson',
        message_content: 'Taxi to airport - USD 65.00 (split 6 ways) • Pay me $10.83 via Zelle: (555) 123-4567',
        timestamp_offset_days: 0,
        tags: ['payment', 'transportation']
      },
      {
        id: 'payment_3',
        trip_type: tripType,
        sender_name: 'Alex Kim',
        message_content: 'Concert tickets - USD 180.00 (split 3 ways) • Pay me $60.00 via PayPal: @alex.kim.music',
        timestamp_offset_days: 0,
        tags: ['payment', 'entertainment']
      }
    ];

    // Add messages from "You" (current user) if currentUserId is provided
    if (currentUserId) {
      baseMessages.push(
        {
          id: currentUserId + '-msg-1',
          trip_type: tripType,
          sender_name: 'You',
          sender_id: currentUserId,
          message_content: 'This looks amazing! Can\'t wait to get there 🎉',
          timestamp_offset_days: 1,
          tags: ['conversation']
        },
        {
          id: currentUserId + '-msg-2',
          trip_type: tripType,
          sender_name: 'You',
          sender_id: currentUserId,
          message_content: 'Count me in for dinner tonight!',
          timestamp_offset_days: 0,
          tags: ['conversation']
        }
      );
    }

    // Add trip-specific messages based on type
    const tripSpecificMessages = this.getTripSpecificMessages(tripType, currentUserId);
    
    let allMessages = [...baseMessages, ...tripSpecificMessages];
    
    // Filter out payment messages if excludePayments is true (for events)
    if (excludePayments) {
      allMessages = allMessages.filter(msg => !msg.tags?.includes('payment'));
    }
    
    return allMessages.sort((a, b) => 
      (b.timestamp_offset_days || 0) - (a.timestamp_offset_days || 0)
    );
  }

  getProMockMessages(tripType: 'pro' | 'event', currentUserId: string): MockMessage[] {
    const proMessages: MockMessage[] = [
      {
        id: 'pro-msg-1',
        trip_type: tripType,
        sender_name: 'Tour Manager',
        message_content: 'Meeting at hotel lobby at 9 AM sharp tomorrow for our group activity!',
        timestamp_offset_days: 2,
        tags: ['broadcast', 'logistics']
      },
      {
        id: 'pro-msg-2',
        trip_type: tripType,
        sender_name: 'Alex Kim',
        message_content: 'Weather alert: Rain expected this afternoon. Bring umbrellas or jackets!',
        timestamp_offset_days: 2,
        tags: ['broadcast']
      },
      {
        id: 'pro-msg-3',
        trip_type: tripType,
        sender_name: 'David Thompson',
        message_content: 'URGENT: Flight departure gate changed to B12. All passengers report immediately!',
        timestamp_offset_days: 2,
        tags: ['broadcast', 'urgent']
      },
      {
        id: 'pro-msg-4',
        trip_type: tripType,
        sender_name: 'Maya Williams',
        message_content: 'The sunset views from our hotel room are incredible! 🌅',
        timestamp_offset_days: 1,
        tags: []
      },
      {
        id: 'pro-msg-5',
        trip_type: tripType,
        sender_name: 'Jordan Lee',
        message_content: 'Does anyone want to split an Uber to the downtown area?',
        timestamp_offset_days: 1,
        tags: []
      },
      {
        id: currentUserId + '-msg-1',
        trip_type: tripType,
        sender_name: 'You',
        sender_id: currentUserId,
        message_content: 'Just checked in! Room 502 if anyone needs anything 👍',
        timestamp_offset_days: 0,
        tags: []
      },
      {
        id: currentUserId + '-msg-2',
        trip_type: tripType,
        sender_name: 'You',
        sender_id: currentUserId,
        message_content: 'See you all at dinner!',
        timestamp_offset_days: 0,
        tags: []
      }
    ];

    return proMessages;
  }

  private getTripSpecificMessages(tripType: string, currentUserId?: string): MockMessage[] {
    switch (tripType) {
      case 'friends-trip':
        return [
          {
            id: 'friends_1',
            trip_type: tripType,
            sender_name: 'Taylor Brooks',
            message_content: 'Pool party at 2 PM! Bring your swimsuits 🏊‍♂️🎉',
            timestamp_offset_days: 0,
            tags: ['broadcast', 'chill', 'activities']
          },
          {
            id: 'friends_2',
            trip_type: tripType,
            sender_name: 'Jamie Chen',
            message_content: 'Who wants to hit up that karaoke place tonight?',
            timestamp_offset_days: 0,
            tags: ['conversation', 'nightlife']
          }
        ];
      
      case 'family-vacation':
        return [
          {
            id: 'family_1',
            trip_type: tripType,
            sender_name: 'Mom (Linda)',
            message_content: 'Kids need to be back at the hotel by 8 PM for bedtime routine!',
            timestamp_offset_days: 0,
            tags: ['broadcast', 'logistics', 'family']
          },
          {
            id: 'family_2',
            trip_type: tripType,
            sender_name: 'Dad (Robert)',
            message_content: 'Found a great ice cream shop - meet us at the boardwalk!',
            timestamp_offset_days: 0,
            tags: ['conversation', 'activities']
          }
        ];
      
      default:
        return [];
    }
  }

  getMockBroadcasts(tripType: string): MockBroadcast[] {
    const baseBroadcasts: MockBroadcast[] = [
      {
        id: 'broadcast_1',
        trip_type: tripType,
        sender_name: 'Trip Coordinator',
        content: 'All luggage must be outside rooms by 8 AM for pickup tomorrow!',
        tag: 'logistics',
        timestamp_offset_hours: 12
      },
      {
        id: 'broadcast_2',
        trip_type: tripType,
        sender_name: 'Safety Team',
        content: 'EMERGENCY: Severe weather warning in effect. Stay indoors until further notice!',
        tag: 'emergency',
        timestamp_offset_hours: 6
      },
      {
        id: 'broadcast_3',
        trip_type: tripType,
        sender_name: 'Activity Leader',
        content: 'Beach volleyball tournament starts in 30 minutes at the south beach! 🏐',
        tag: 'chill',
        timestamp_offset_hours: 2
      }
    ];

    return baseBroadcasts;
  }


  getMockTrips(): MockTrip[] {
    return [
      {
        id: 'demo-trip-1',
        name: 'Spring Break Cancun 2026',
        description: 'Beach getaway with friends',
        destination: 'Cancun, Mexico',
        start_date: '2026-03-15',
        end_date: '2026-03-22',
        cover_image_url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206',
        trip_type: 'consumer',
        created_by: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_archived: false
      },
      {
        id: 'demo-trip-2',
        name: 'Tokyo Adventure',
        description: 'Exploring Japanese culture and cuisine',
        destination: 'Tokyo, Japan',
        start_date: '2026-04-10',
        end_date: '2026-04-18',
        cover_image_url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf',
        trip_type: 'consumer',
        created_by: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_archived: false
      },
      {
        id: 'demo-trip-3',
        name: 'Bali Wellness Retreat',
        description: 'Yoga, meditation, and relaxation',
        destination: 'Bali, Indonesia',
        start_date: '2026-05-20',
        end_date: '2026-05-27',
        cover_image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4',
        trip_type: 'consumer',
        created_by: 'demo-user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_archived: false
      }
    ];
  }

  getMockPayments(tripId: string, isEvent: boolean = false): MockPayment[] {
    // Events don't have payments
    if (isEvent) {
      return [];
    }
    
    return [
      {
        id: 'demo-payment-1',
        trip_id: tripId,
        amount: 240.00,
        currency: 'USD',
        description: 'Dinner at Sakura Restaurant',
        split_count: 4,
        split_participants: ['user1', 'user2', 'user3', 'user4'],
        payment_methods: ['Venmo', 'Zelle'],
        created_by: 'user1',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        is_settled: false
      },
      {
        id: 'demo-payment-2',
        trip_id: tripId,
        amount: 65.00,
        currency: 'USD',
        description: 'Taxi to airport',
        split_count: 6,
        split_participants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'],
        payment_methods: ['Zelle'],
        created_by: 'user2',
        created_at: new Date(Date.now() - 43200000).toISOString(),
        is_settled: true
      },
      {
        id: 'demo-payment-3',
        trip_id: tripId,
        amount: 180.00,
        currency: 'USD',
        description: 'Concert tickets',
        split_count: 3,
        split_participants: ['user1', 'user2', 'user3'],
        payment_methods: ['PayPal'],
        created_by: 'user3',
        created_at: new Date().toISOString(),
        is_settled: false
      }
    ];
  }

  getMockPolls(tripId: string): MockPoll[] {
    // Filter polls specific to this trip from mockPolls.ts
    const tripPolls = mockPolls.filter(poll => poll.trip_id === tripId);
    
    // Transform to MockPoll format
    return tripPolls.map(poll => ({
      id: poll.id,
      trip_id: poll.trip_id,
      question: poll.question,
      options: poll.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        votes: opt.voteCount
      })),
      total_votes: poll.total_votes,
      created_by: poll.created_by,
      created_at: poll.created_at,
      status: poll.status
    }));
  }

  getMockMembers(tripId: string): MockMember[] {
    return [
      {
        id: 'demo-member-1',
        trip_id: tripId,
        user_id: 'user1',
        role: 'admin',
        display_name: 'Sarah Chen',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-member-2',
        trip_id: tripId,
        user_id: 'user2',
        role: 'member',
        display_name: 'Marcus Johnson',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-member-3',
        trip_id: tripId,
        user_id: 'user3',
        role: 'member',
        display_name: 'Priya Patel',
        avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-member-4',
        trip_id: tripId,
        user_id: 'user4',
        role: 'member',
        display_name: 'Alex Kim',
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e',
        created_at: new Date().toISOString()
      },
      {
        id: 'demo-member-5',
        trip_id: tripId,
        user_id: 'user5',
        role: 'member',
        display_name: 'Emma Rodriguez',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        created_at: new Date().toISOString()
      }
    ];
  }

  getMockTasks(tripId: string): Array<{ id: string; trip_id: string; title: string; description?: string; completed: boolean; due_at?: string }> {
    return [
      {
        id: 'demo-task-1',
        trip_id: tripId,
        title: 'Make sure your visa and passport documents are handled at least one month prior',
        description: 'Verify all travel documents are valid and up to date',
        completed: false,
        due_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'demo-task-2',
        trip_id: tripId,
        title: 'Making sure all clothes are packed before next destination',
        description: 'Pack weather-appropriate clothing for all activities',
        completed: false,
        due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'demo-task-3',
        trip_id: tripId,
        title: 'Jimmy to purchase alcohol for the house while Sam gets food',
        description: 'Coordinate house supplies for the trip',
        completed: true,
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }

  // Add payment to session store
  addSessionPayment(tripId: string, paymentData: {
    amount: number;
    currency: string;
    description: string;
    splitCount: number;
    splitParticipants: string[];
    paymentMethods: string[];
  }): string {
    const paymentId = `session-payment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const payment: SessionPayment = {
      id: paymentId,
      trip_id: tripId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      description: paymentData.description,
      split_count: paymentData.splitCount,
      split_participants: paymentData.splitParticipants,
      payment_methods: paymentData.paymentMethods,
      created_by: 'demo-user',
      createdByName: 'Demo User',
      created_at: new Date().toISOString(),
      is_settled: false
    };

    const tripPayments = this.sessionPayments.get(tripId) || [];
    tripPayments.push(payment);
    this.sessionPayments.set(tripId, tripPayments);

    return paymentId;
  }

  // Get session payments for a trip
  getSessionPayments(tripId: string): SessionPayment[] {
    return this.sessionPayments.get(tripId) || [];
  }

  // Clear session payments (called when demo mode is toggled off)
  clearSessionPayments(tripId?: string) {
    if (tripId) {
      this.sessionPayments.delete(tripId);
    } else {
      this.sessionPayments.clear();
    }
  }

  // ============================================
  // Personal Basecamp Methods (Demo Mode)
  // ============================================

  /**
   * Get personal basecamp for a trip in demo mode
   */
  getSessionPersonalBasecamp(tripId: string, sessionUserId: string): SessionPersonalBasecamp | null {
    const key = `${tripId}:${sessionUserId}`;
    return this.sessionPersonalBasecamps.get(key) || null;
  }

  /**
   * Set personal basecamp for a trip in demo mode
   */
  setSessionPersonalBasecamp(payload: {
    trip_id: string;
    user_id: string;
    name?: string;
    address: string;
    latitude?: number;
    longitude?: number;
  }): SessionPersonalBasecamp {
    const key = `${payload.trip_id}:${payload.user_id}`;
    const basecamp: SessionPersonalBasecamp = {
      id: `demo-personal-basecamp-${Date.now()}`,
      trip_id: payload.trip_id,
      user_id: payload.user_id,
      name: payload.name,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.sessionPersonalBasecamps.set(key, basecamp);
    return basecamp;
  }

  /**
   * Delete personal basecamp in demo mode
   */
  deleteSessionPersonalBasecamp(tripId: string, sessionUserId: string): boolean {
    const key = `${tripId}:${sessionUserId}`;
    const existed = this.sessionPersonalBasecamps.has(key);
    this.sessionPersonalBasecamps.delete(key);
    return existed;
  }

  /**
   * Clear all session personal basecamps (called when demo mode is toggled off)
   */
  clearSessionPersonalBasecamps(tripId?: string) {
    if (tripId) {
      // Clear only basecamps for specific trip
      const keys = Array.from(this.sessionPersonalBasecamps.keys());
      keys.forEach(key => {
        if (key.startsWith(`${tripId}:`)) {
          this.sessionPersonalBasecamps.delete(key);
        }
      });
    } else {
      this.sessionPersonalBasecamps.clear();
    }
  }

  /**
   * Clear session trip basecamp for a specific trip
   */
  clearSessionTripBasecamp(tripId: string): void {
    this.sessionTripBasecamps.delete(tripId);
  }

  /**
   * Cover Photo Management
   */
  setCoverPhoto(tripId: string, photoUrl: string): void {
    const key = `demo_cover_photo_${tripId}`;
    sessionStorage.setItem(key, photoUrl);
  }

  getCoverPhoto(tripId: string): string | null {
    const key = `demo_cover_photo_${tripId}`;
    return sessionStorage.getItem(key);
  }

  removeCoverPhoto(tripId: string): void {
    const key = `demo_cover_photo_${tripId}`;
    sessionStorage.removeItem(key);
  }

  /**
   * Media Metadata Management (captions and tags)
   */
  getMediaMeta(tripId: string, mediaId: string): { caption: string; tags: string[] } | null {
    const key = `demo_media_meta_${tripId}_${mediaId}`;
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }

  setMediaMeta(tripId: string, mediaId: string, caption: string, tags: string[]): void {
    const key = `demo_media_meta_${tripId}_${mediaId}`;
    sessionStorage.setItem(key, JSON.stringify({ caption, tags }));
  }

  // ============================================
  // Trip Basecamp Methods (Demo Mode)
  // ============================================

  /**
   * Get session trip basecamp (for demo mode PDF export)
   */
  getSessionTripBasecamp(tripId: string): { name?: string; address: string } | null {
    return this.sessionTripBasecamps.get(tripId) || null;
  }

  /**
   * Set session trip basecamp (for demo mode)
   */
  setSessionTripBasecamp(tripId: string, basecamp: { name?: string; address: string }): void {
    this.sessionTripBasecamps.set(tripId, basecamp);
  }

  /**
   * Clear session trip basecamps (called when demo mode is toggled off)
   */
  clearSessionTripBasecamps(tripId?: string): void {
    if (tripId) {
      this.sessionTripBasecamps.delete(tripId);
    } else {
      this.sessionTripBasecamps.clear();
    }
  }

  // ============================================
  // Trip-Specific Places/Links (Demo Mode)
  // ============================================

  /**
   * Get trip-specific places/links from tripSpecificMockDataService
   */
  getMockPlaces(tripId: string): Array<{ name: string; url: string; description?: string; votes: number }> {
    const numericTripId = parseInt(tripId);
    const tripData = TripSpecificMockDataService.getTripMockData(numericTripId);
    
    if (!tripData?.links) {
      return [];
    }
    
    return tripData.links.map(link => ({
      name: link.title,
      url: link.url,
      description: link.description,
      votes: 0
    }));
  }
}

export const demoModeService = new DemoModeService();
