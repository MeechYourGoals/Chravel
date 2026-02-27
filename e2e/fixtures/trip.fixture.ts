/**
 * Trip Fixtures for E2E Testing
 *
 * Provides utilities for creating, managing, and cleaning up test trips.
 */

/* eslint-disable react-hooks/rules-of-hooks */

import { test as authTest, TestUser } from './auth.fixture';

// Types
interface TestTrip {
  id: string;
  name: string;
  destination: string;
  creatorId: string;
  tripType: 'consumer' | 'pro' | 'event';
}

interface TestInviteLink {
  id: string;
  code: string;
  tripId: string;
  url: string;
  isActive: boolean;
  requireApproval: boolean;
}

interface TripFixtures {
  /**
   * Create a test trip for a user
   */
  createTestTrip: (
    user: TestUser,
    options?: {
      name?: string;
      destination?: string;
      tripType?: 'consumer' | 'pro' | 'event';
      startDate?: string;
      endDate?: string;
    },
  ) => Promise<TestTrip>;

  /**
   * Add a member to a trip
   */
  addTripMember: (tripId: string, userId: string, role?: 'admin' | 'member') => Promise<void>;

  /**
   * Create an invite link for a trip
   */
  createInviteLink: (
    tripId: string,
    options?: {
      requireApproval?: boolean;
      maxUses?: number;
      expiresAt?: string;
    },
  ) => Promise<TestInviteLink>;

  /**
   * Add a chat message to a trip
   */
  addChatMessage: (tripId: string, userId: string, content: string) => Promise<string>;

  /**
   * Add an event to a trip
   */
  addTripEvent: (
    tripId: string,
    userId: string,
    options?: {
      title?: string;
      date?: Date;
      time?: string;
      location?: string;
      category?: string;
    },
  ) => Promise<string>;

  /**
   * Add a task to a trip
   */
  addTripTask: (
    tripId: string,
    userId: string,
    options?: {
      title?: string;
      description?: string;
      dueAt?: string;
    },
  ) => Promise<string>;

  /**
   * Cleanup a trip and all associated data
   */
  cleanupTrip: (tripId: string) => Promise<void>;
}

/**
 * Extended test with trip fixtures
 */
export const test = authTest.extend<TripFixtures>({
  createTestTrip: async ({ supabaseAdmin }, use) => {
    const createdTrips: string[] = [];

    const createTrip = async (
      user: TestUser,
      options?: {
        name?: string;
        destination?: string;
        tripType?: 'consumer' | 'pro' | 'event';
        startDate?: string;
        endDate?: string;
      },
    ): Promise<TestTrip> => {
      const name = options?.name || `QA Trip ${Date.now()}`;
      const destination = options?.destination || 'Test City, QA Country';
      const tripType = options?.tripType || 'consumer';

      // Create trip
      const { data: trip, error: tripError } = await supabaseAdmin
        .from('trips')
        .insert({
          name,
          destination,
          creator_id: user.id,
          trip_type: tripType,
          start_date: options?.startDate || new Date().toISOString().split('T')[0],
          end_date:
            options?.endDate ||
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select()
        .single();

      if (tripError) {
        throw new Error(`Failed to create test trip: ${tripError.message}`);
      }

      createdTrips.push(trip.id);

      // Add creator as admin member
      const { error: memberError } = await supabaseAdmin.from('trip_members').insert({
        trip_id: trip.id,
        user_id: user.id,
        role: 'admin',
        status: 'active',
      });

      if (memberError) {
        console.warn(`Failed to add creator as member (non-fatal): ${memberError.message}`);
      }

      return {
        id: trip.id,
        name,
        destination,
        creatorId: user.id,
        tripType,
      };
    };

    await use(createTrip);

    // Cleanup all created trips after test
    for (const tripId of createdTrips) {
      try {
        await supabaseAdmin.from('trip_chat_messages').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_events').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_tasks').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_polls').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('invite_links').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_join_requests').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_members').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trips').delete().eq('id', tripId);
      } catch (error) {
        console.warn(`Failed to cleanup trip ${tripId}:`, error);
      }
    }
  },

  addTripMember: async ({ supabaseAdmin }, use) => {
    const addMember = async (
      tripId: string,
      userId: string,
      role: 'admin' | 'member' = 'member',
    ): Promise<void> => {
      const { error } = await supabaseAdmin.from('trip_members').insert({
        trip_id: tripId,
        user_id: userId,
        role,
        status: 'active',
      });

      if (error) {
        throw new Error(`Failed to add trip member: ${error.message}`);
      }
    };

    await use(addMember);
  },

  createInviteLink: async ({ supabaseAdmin }, use) => {
    const createInvite = async (
      tripId: string,
      options?: {
        requireApproval?: boolean;
        maxUses?: number;
        expiresAt?: string;
      },
    ): Promise<TestInviteLink> => {
      // Generate unique code
      const code = `qa-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { data: invite, error } = await supabaseAdmin
        .from('invite_links')
        .insert({
          trip_id: tripId,
          code,
          is_active: true,
          require_approval: options?.requireApproval ?? false,
          max_uses: options?.maxUses ?? null,
          expires_at: options?.expiresAt ?? null,
          current_uses: 0,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create invite link: ${error.message}`);
      }

      const baseUrl = process.env.BASE_URL || 'http://localhost:5173';

      return {
        id: invite.id,
        code,
        tripId,
        url: `${baseUrl}/join/${code}`,
        isActive: true,
        requireApproval: options?.requireApproval ?? false,
      };
    };

    await use(createInvite);
  },

  addChatMessage: async ({ supabaseAdmin }, use) => {
    const addMessage = async (tripId: string, userId: string, content: string): Promise<string> => {
      const { data, error } = await supabaseAdmin
        .from('trip_chat_messages')
        .insert({
          trip_id: tripId,
          user_id: userId,
          content,
          message_type: 'text',
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to add chat message: ${error.message}`);
      }

      return data.id;
    };

    await use(addMessage);
  },

  addTripEvent: async ({ supabaseAdmin }, use) => {
    const addEvent = async (
      tripId: string,
      userId: string,
      options?: {
        title?: string;
        date?: Date;
        time?: string;
        location?: string;
        category?: string;
      },
    ): Promise<string> => {
      const eventDate = options?.date || new Date();

      const { data, error } = await supabaseAdmin
        .from('trip_events')
        .insert({
          trip_id: tripId,
          created_by: userId,
          title: options?.title || `QA Event ${Date.now()}`,
          event_date: eventDate.toISOString().split('T')[0],
          event_time: options?.time || '14:00',
          location: options?.location || 'Test Location',
          event_category: options?.category || 'activity',
          include_in_itinerary: true,
          source_type: 'manual',
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to add trip event: ${error.message}`);
      }

      return data.id;
    };

    await use(addEvent);
  },

  addTripTask: async ({ supabaseAdmin }, use) => {
    const addTask = async (
      tripId: string,
      userId: string,
      options?: {
        title?: string;
        description?: string;
        dueAt?: string;
      },
    ): Promise<string> => {
      const { data, error } = await supabaseAdmin
        .from('trip_tasks')
        .insert({
          trip_id: tripId,
          creator_id: userId,
          title: options?.title || `QA Task ${Date.now()}`,
          description: options?.description,
          due_at: options?.dueAt,
          is_poll: false,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to add trip task: ${error.message}`);
      }

      return data.id;
    };

    await use(addTask);
  },

  cleanupTrip: async ({ supabaseAdmin }, use) => {
    const cleanup = async (tripId: string): Promise<void> => {
      try {
        // Delete in order respecting foreign keys
        await supabaseAdmin.from('trip_chat_messages').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_events').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_tasks').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_polls').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_files').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('invite_links').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_join_requests').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trip_members').delete().eq('trip_id', tripId);
        await supabaseAdmin.from('trips').delete().eq('id', tripId);
      } catch (error) {
        console.warn(`Cleanup error for trip ${tripId}:`, error);
      }
    };

    await use(cleanup);
  },
});

export { expect } from '@playwright/test';
export type { TestTrip, TestInviteLink };
