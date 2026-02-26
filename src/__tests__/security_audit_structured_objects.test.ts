
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Configuration for the test
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'ey...'; // Placeholder
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only run if we have service role key (needed to create test users/data bypassing RLS)
const runIntegrationTests = !!SERVICE_ROLE_KEY;

describe('Security Audit: Structured Objects (Calendar, Polls, Tasks)', () => {
  if (!runIntegrationTests) {
    it.skip('Skipping integration tests: SUPABASE_SERVICE_ROLE_KEY not found', () => {});
    return;
  }

  let adminClient: SupabaseClient;
  let ownerClient: SupabaseClient;
  let memberClient: SupabaseClient;
  let outsiderClient: SupabaseClient;
  let serviceClient: SupabaseClient;

  let ownerUser: any;
  let memberUser: any;
  let outsiderUser: any;
  let testTripId: string;

  beforeAll(async () => {
    serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Helper to create a user and get a client for them
    const createUser = async (email: string) => {
      const { data: { user }, error } = await serviceClient.auth.admin.createUser({
        email,
        password: 'test-password-123',
        email_confirm: true,
      });
      if (error) throw error;
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      await client.auth.signInWithPassword({ email, password: 'test-password-123' });
      return { user, client };
    };

    // Create users
    const owner = await createUser(`owner_${Date.now()}@example.com`);
    ownerUser = owner.user;
    ownerClient = owner.client;

    const member = await createUser(`member_${Date.now()}@example.com`);
    memberUser = member.user;
    memberClient = member.client;

    const outsider = await createUser(`outsider_${Date.now()}@example.com`);
    outsiderUser = outsider.user;
    outsiderClient = outsider.client;

    // Create Trip (as Owner)
    // Assuming trips table allows inserts.
    const { data: trip, error: tripError } = await ownerClient
      .from('trips')
      .insert({
        name: 'Security Audit Trip',
        destination: 'Test City',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
      })
      .select()
      .single();

    if (tripError) throw tripError;
    testTripId = trip.id;

    // Add Member to Trip
    const { error: memberError } = await serviceClient
      .from('trip_members')
      .insert({
        trip_id: testTripId,
        user_id: memberUser.id,
        role: 'member',
      });
    if (memberError) throw memberError;
  });

  afterAll(async () => {
    // Cleanup
    if (testTripId) {
      await serviceClient.from('trips').delete().eq('id', testTripId);
    }
    if (ownerUser) await serviceClient.auth.admin.deleteUser(ownerUser.id);
    if (memberUser) await serviceClient.auth.admin.deleteUser(memberUser.id);
    if (outsiderUser) await serviceClient.auth.admin.deleteUser(outsiderUser.id);
  });

  describe('Trip Events', () => {
    it('Outsider cannot view events', async () => {
      const { data, error } = await outsiderClient
        .from('trip_events')
        .select('*')
        .eq('trip_id', testTripId);

      expect(data).toEqual([]);
    });

    it('Member can create event', async () => {
      const { data, error } = await memberClient
        .from('trip_events')
        .insert({
          trip_id: testTripId,
          title: 'Member Event',
          start_time: new Date().toISOString(),
          created_by: memberUser.id
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it('Member cannot delete Owner event', async () => {
       // Create event as Owner
       const { data: ownerEvent } = await ownerClient
         .from('trip_events')
         .insert({
           trip_id: testTripId,
           title: 'Owner Event',
           start_time: new Date().toISOString(),
           created_by: ownerUser.id
         })
         .select()
         .single();

       const { error } = await memberClient
         .from('trip_events')
         .delete()
         .eq('id', ownerEvent.id);

       // Verify it still exists
       const { data: check } = await serviceClient
         .from('trip_events')
         .select('*')
         .eq('id', ownerEvent.id);

       expect(check).toHaveLength(1);
    });

    it('Owner (Admin) can delete Member event', async () => {
        // Create event as Member
        const { data: memberEvent } = await memberClient
            .from('trip_events')
            .insert({
            trip_id: testTripId,
            title: 'Member Event To Delete',
            start_time: new Date().toISOString(),
            created_by: memberUser.id
            })
            .select()
            .single();

        // Delete as Owner
        const { error } = await ownerClient
            .from('trip_events')
            .delete()
            .eq('id', memberEvent.id);

        expect(error).toBeNull();

        // Verify it's gone
        const { data: check } = await serviceClient
            .from('trip_events')
            .select('*')
            .eq('id', memberEvent.id);

        expect(check).toHaveLength(0);
    });
  });

  describe('Trip Tasks', () => {
    it('Outsider cannot view tasks', async () => {
      const { data, error } = await outsiderClient
        .from('trip_tasks')
        .select('*')
        .eq('trip_id', testTripId);

      expect(data).toEqual([]);
    });

    it('Member can create task', async () => {
      const { data, error } = await memberClient
        .from('trip_tasks')
        .insert({
          trip_id: testTripId,
          title: 'Member Task',
          creator_id: memberUser.id // Note: creator_id
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it('Member cannot delete Owner task', async () => {
       const { data: ownerTask } = await ownerClient
         .from('trip_tasks')
         .insert({
           trip_id: testTripId,
           title: 'Owner Task',
           creator_id: ownerUser.id
         })
         .select()
         .single();

       const { error } = await memberClient
         .from('trip_tasks')
         .delete()
         .eq('id', ownerTask.id);

       const { data: check } = await serviceClient
         .from('trip_tasks')
         .select('*')
         .eq('id', ownerTask.id);

       expect(check).toHaveLength(1);
    });

    it('Owner (Admin) can delete Member task', async () => {
        const { data: memberTask } = await memberClient
            .from('trip_tasks')
            .insert({
            trip_id: testTripId,
            title: 'Member Task To Delete',
            creator_id: memberUser.id
            })
            .select()
            .single();

        const { error } = await ownerClient
            .from('trip_tasks')
            .delete()
            .eq('id', memberTask.id);

        expect(error).toBeNull();

        const { data: check } = await serviceClient
            .from('trip_tasks')
            .select('*')
            .eq('id', memberTask.id);

        expect(check).toHaveLength(0);
    });
  });

  describe('Trip Polls', () => {
    it('Outsider cannot view polls', async () => {
      const { data, error } = await outsiderClient
        .from('trip_polls')
        .select('*')
        .eq('trip_id', testTripId);

      expect(data).toEqual([]);
    });

    it('Member can create poll', async () => {
      const { data, error } = await memberClient
        .from('trip_polls')
        .insert({
          trip_id: testTripId,
          question: 'Member Poll',
          created_by: memberUser.id // Note: created_by
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
    });

    it('Member cannot delete Owner poll', async () => {
       const { data: ownerPoll } = await ownerClient
         .from('trip_polls')
         .insert({
           trip_id: testTripId,
           question: 'Owner Poll',
           created_by: ownerUser.id
         })
         .select()
         .single();

       const { error } = await memberClient
         .from('trip_polls')
         .delete()
         .eq('id', ownerPoll.id);

       const { data: check } = await serviceClient
         .from('trip_polls')
         .select('*')
         .eq('id', ownerPoll.id);

       expect(check).toHaveLength(1);
    });

    it('Owner (Admin) can delete Member poll', async () => {
        const { data: memberPoll } = await memberClient
            .from('trip_polls')
            .insert({
            trip_id: testTripId,
            question: 'Member Poll To Delete',
            created_by: memberUser.id
            })
            .select()
            .single();

        const { error } = await ownerClient
            .from('trip_polls')
            .delete()
            .eq('id', memberPoll.id);

        expect(error).toBeNull();

        const { data: check } = await serviceClient
            .from('trip_polls')
            .select('*')
            .eq('id', memberPoll.id);

        expect(check).toHaveLength(0);
    });
  });
});
