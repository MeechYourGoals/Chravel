/**
 * RLS Policy Tests for Trips
 * 
 * Validates that Row Level Security policies correctly enforce access control
 * on trip-related tables (trips, trip_members, trip_chat_messages, etc.)
 * 
 * These tests use direct Supabase client calls to verify database-level security.
 */

import { test, expect } from '../../fixtures/trip.fixture';

test.describe('Trip RLS Policies', () => {
  test('RLS-TRIP-001: Non-member cannot read trip', async ({
    createTestUser,
    createTestTrip,
    getClientAsUser,
  }) => {
    // Create two users
    const userA = await createTestUser({ displayName: 'User A (Owner)' });
    const userB = await createTestUser({ displayName: 'User B (Non-member)' });
    
    // User A creates a trip
    const trip = await createTestTrip(userA, { name: 'Private Trip' });
    
    // User B tries to read the trip
    const clientB = await getClientAsUser(userB);
    const { data, error } = await clientB
      .from('trips')
      .select('*')
      .eq('id', trip.id)
      .single();
    
    // RLS should block access - data should be null or error
    expect(data).toBeNull();
  });
  
  test('RLS-TRIP-002: Member can read trip', async ({
    createTestUser,
    createTestTrip,
    addTripMember,
    getClientAsUser,
  }) => {
    // Create two users
    const userA = await createTestUser({ displayName: 'User A (Owner)' });
    const userB = await createTestUser({ displayName: 'User B (Member)' });
    
    // User A creates a trip
    const trip = await createTestTrip(userA, { name: 'Shared Trip' });
    
    // Add User B as member
    await addTripMember(trip.id, userB.id, 'member');
    
    // User B tries to read the trip
    const clientB = await getClientAsUser(userB);
    const { data, error } = await clientB
      .from('trips')
      .select('*')
      .eq('id', trip.id)
      .single();
    
    // Should have access
    expect(data).not.toBeNull();
    expect(data?.id).toBe(trip.id);
    expect(data?.name).toBe('Shared Trip');
  });
  
  test('RLS-TRIP-003: Creator can update trip', async ({
    createTestUser,
    createTestTrip,
    getClientAsUser,
  }) => {
    const user = await createTestUser({ displayName: 'Trip Creator' });
    const trip = await createTestTrip(user, { name: 'Original Name' });
    
    const client = await getClientAsUser(user);
    const { error } = await client
      .from('trips')
      .update({ name: 'Updated Name' })
      .eq('id', trip.id);
    
    // Should succeed
    expect(error).toBeNull();
    
    // Verify update
    const { data: updated } = await client
      .from('trips')
      .select('name')
      .eq('id', trip.id)
      .single();
    
    expect(updated?.name).toBe('Updated Name');
  });
  
  test('RLS-TRIP-004: Non-admin member cannot update trip', async ({
    createTestUser,
    createTestTrip,
    addTripMember,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const member = await createTestUser({ displayName: 'Regular Member' });
    
    const trip = await createTestTrip(owner, { name: 'Owner Trip' });
    await addTripMember(trip.id, member.id, 'member');
    
    // Member tries to update
    const clientMember = await getClientAsUser(member);
    const { error } = await clientMember
      .from('trips')
      .update({ name: 'Hacked Name' })
      .eq('id', trip.id);
    
    // Should be blocked by RLS (error or no rows affected)
    // Note: Some RLS policies return success but affect 0 rows
    
    // Verify name unchanged
    const clientOwner = await getClientAsUser(owner);
    const { data } = await clientOwner
      .from('trips')
      .select('name')
      .eq('id', trip.id)
      .single();
    
    expect(data?.name).toBe('Owner Trip');
  });
  
  test('RLS-TRIP-005: Non-member cannot delete trip', async ({
    createTestUser,
    createTestTrip,
    getClientAsUser,
    supabaseAdmin,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const attacker = await createTestUser({ displayName: 'Attacker' });
    
    const trip = await createTestTrip(owner, { name: 'Protected Trip' });
    
    // Attacker tries to delete
    const clientAttacker = await getClientAsUser(attacker);
    const { error } = await clientAttacker
      .from('trips')
      .delete()
      .eq('id', trip.id);
    
    // Verify trip still exists
    const { data } = await supabaseAdmin
      .from('trips')
      .select('id')
      .eq('id', trip.id)
      .single();
    
    expect(data).not.toBeNull();
    expect(data?.id).toBe(trip.id);
  });
});

test.describe('Trip Members RLS Policies', () => {
  test('RLS-MEMBER-001: Non-member cannot see trip members', async ({
    createTestUser,
    createTestTrip,
    addTripMember,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const member = await createTestUser({ displayName: 'Member' });
    const outsider = await createTestUser({ displayName: 'Outsider' });
    
    const trip = await createTestTrip(owner);
    await addTripMember(trip.id, member.id);
    
    // Outsider tries to read members
    const clientOutsider = await getClientAsUser(outsider);
    const { data } = await clientOutsider
      .from('trip_members')
      .select('*')
      .eq('trip_id', trip.id);
    
    // Should return empty array or null
    expect(data?.length ?? 0).toBe(0);
  });
  
  test('RLS-MEMBER-002: Member can see other members', async ({
    createTestUser,
    createTestTrip,
    addTripMember,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const memberA = await createTestUser({ displayName: 'Member A' });
    const memberB = await createTestUser({ displayName: 'Member B' });
    
    const trip = await createTestTrip(owner);
    await addTripMember(trip.id, memberA.id);
    await addTripMember(trip.id, memberB.id);
    
    // Member A reads members list
    const clientA = await getClientAsUser(memberA);
    const { data } = await clientA
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', trip.id);
    
    // Should see all members (owner + both members)
    expect(data?.length).toBeGreaterThanOrEqual(2);
    
    const userIds = data?.map(m => m.user_id) || [];
    expect(userIds).toContain(owner.id);
    expect(userIds).toContain(memberA.id);
    expect(userIds).toContain(memberB.id);
  });
});

test.describe('Chat Messages RLS Policies', () => {
  test('RLS-CHAT-001: Non-member cannot read messages', async ({
    createTestUser,
    createTestTrip,
    addChatMessage,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const outsider = await createTestUser({ displayName: 'Outsider' });
    
    const trip = await createTestTrip(owner);
    await addChatMessage(trip.id, owner.id, 'Secret message');
    
    // Outsider tries to read messages
    const clientOutsider = await getClientAsUser(outsider);
    const { data } = await clientOutsider
      .from('trip_chat_messages')
      .select('*')
      .eq('trip_id', trip.id);
    
    // Should return empty
    expect(data?.length ?? 0).toBe(0);
  });
  
  test('RLS-CHAT-002: Member can read messages', async ({
    createTestUser,
    createTestTrip,
    addTripMember,
    addChatMessage,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const member = await createTestUser({ displayName: 'Member' });
    
    const trip = await createTestTrip(owner);
    await addTripMember(trip.id, member.id);
    await addChatMessage(trip.id, owner.id, 'Hello member!');
    
    // Member reads messages
    const clientMember = await getClientAsUser(member);
    const { data } = await clientMember
      .from('trip_chat_messages')
      .select('content')
      .eq('trip_id', trip.id);
    
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data?.some(m => m.content === 'Hello member!')).toBe(true);
  });
  
  test('RLS-CHAT-003: Member can send messages', async ({
    createTestUser,
    createTestTrip,
    addTripMember,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const member = await createTestUser({ displayName: 'Member' });
    
    const trip = await createTestTrip(owner);
    await addTripMember(trip.id, member.id);
    
    // Member sends message
    const clientMember = await getClientAsUser(member);
    const { data, error } = await clientMember
      .from('trip_chat_messages')
      .insert({
        trip_id: trip.id,
        user_id: member.id,
        content: 'Hello from member!',
        message_type: 'text',
      })
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data?.content).toBe('Hello from member!');
  });
  
  test('RLS-CHAT-004: Non-member cannot send messages', async ({
    createTestUser,
    createTestTrip,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const outsider = await createTestUser({ displayName: 'Outsider' });
    
    const trip = await createTestTrip(owner);
    
    // Outsider tries to send message
    const clientOutsider = await getClientAsUser(outsider);
    const { error } = await clientOutsider
      .from('trip_chat_messages')
      .insert({
        trip_id: trip.id,
        user_id: outsider.id,
        content: 'Spam message!',
        message_type: 'text',
      });
    
    // Should be blocked
    expect(error).not.toBeNull();
  });
});

test.describe('Invite Links RLS Policies', () => {
  test('RLS-INVITE-001: Non-member cannot create invite', async ({
    createTestUser,
    createTestTrip,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const outsider = await createTestUser({ displayName: 'Outsider' });
    
    const trip = await createTestTrip(owner);
    
    // Outsider tries to create invite
    const clientOutsider = await getClientAsUser(outsider);
    const { error } = await clientOutsider
      .from('invite_links')
      .insert({
        trip_id: trip.id,
        code: `malicious-${Date.now()}`,
        is_active: true,
      });
    
    // Should be blocked
    expect(error).not.toBeNull();
  });
  
  test('RLS-INVITE-002: Admin can create invite', async ({
    createTestUser,
    createTestTrip,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const trip = await createTestTrip(owner);
    
    // Owner creates invite
    const clientOwner = await getClientAsUser(owner);
    const code = `valid-${Date.now()}`;
    const { data, error } = await clientOwner
      .from('invite_links')
      .insert({
        trip_id: trip.id,
        code,
        is_active: true,
      })
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data?.code).toBe(code);
  });
});

test.describe('Edge Function Permission Tests', () => {
  test('RLS-FUNC-001: join-trip requires valid invite', async ({
    createTestUser,
    createTestTrip,
    supabaseAnon,
    getClientAsUser,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const joiner = await createTestUser({ displayName: 'Joiner' });
    
    const trip = await createTestTrip(owner);
    
    // Joiner tries to join without invite
    const clientJoiner = await getClientAsUser(joiner);
    const { data, error } = await clientJoiner.functions.invoke('join-trip', {
      body: { inviteCode: 'invalid-code-12345' },
    });
    
    // Should fail with appropriate error
    expect(data?.success).not.toBe(true);
  });
  
  test('RLS-FUNC-002: join-trip with valid invite succeeds', async ({
    createTestUser,
    createTestTrip,
    createInviteLink,
    getClientAsUser,
    supabaseAdmin,
  }) => {
    const owner = await createTestUser({ displayName: 'Owner' });
    const joiner = await createTestUser({ displayName: 'Joiner' });
    
    const trip = await createTestTrip(owner);
    const invite = await createInviteLink(trip.id);
    
    // Joiner uses valid invite
    const clientJoiner = await getClientAsUser(joiner);
    const { data, error } = await clientJoiner.functions.invoke('join-trip', {
      body: { inviteCode: invite.code },
    });
    
    // Should succeed
    expect(data?.success).toBe(true);
    
    // Verify membership created
    const { data: membership } = await supabaseAdmin
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', trip.id)
      .eq('user_id', joiner.id)
      .single();
    
    expect(membership).not.toBeNull();
  });
});

test.describe('Leave Trip Persistence', () => {
  test('LEAVE-001: Creator leaves, remaining members retain access to trip and objects', async ({
    createTestUser,
    createTestTrip,
    addTripMember,
    addChatMessage,
    addTripEvent,
    getClientAsUser,
    supabaseAdmin,
  }) => {
    const creator = await createTestUser({ displayName: 'Creator' });
    const member = await createTestUser({ displayName: 'Member' });

    const trip = await createTestTrip(creator, { name: 'Shared Trip' });
    await addTripMember(trip.id, member.id);
    await addChatMessage(trip.id, creator.id, 'Creator message');
    await addTripEvent(trip.id, creator.id, { title: 'Creator event' });

    // Creator leaves via leave_trip RPC
    const clientCreator = await getClientAsUser(creator);
    const { data: leaveResult, error: leaveError } = await clientCreator.rpc('leave_trip', {
      _trip_id: trip.id,
    });

    expect(leaveError).toBeNull();
    expect((leaveResult as { success?: boolean })?.success).toBe(true);

    // Creator loses access
    const { data: creatorTrip } = await clientCreator
      .from('trips')
      .select('id')
      .eq('id', trip.id)
      .single();
    expect(creatorTrip).toBeNull();

    // Remaining member retains access to trip
    const clientMember = await getClientAsUser(member);
    const { data: memberTrip } = await clientMember
      .from('trips')
      .select('id, name')
      .eq('id', trip.id)
      .single();
    expect(memberTrip).not.toBeNull();
    expect(memberTrip?.name).toBe('Shared Trip');

    // Remaining member can read messages (creator's message persists)
    const { data: messages } = await clientMember
      .from('trip_chat_messages')
      .select('content')
      .eq('trip_id', trip.id);
    expect(messages?.some(m => m.content === 'Creator message')).toBe(true);

    // Remaining member can read events
    const { data: events } = await clientMember
      .from('trip_events')
      .select('title')
      .eq('trip_id', trip.id);
    expect(events?.some(e => e.title === 'Creator event')).toBe(true);

    // Creator's membership is soft-deleted (status=left)
    const { data: creatorMembership } = await supabaseAdmin
      .from('trip_members')
      .select('status, left_at')
      .eq('trip_id', trip.id)
      .eq('user_id', creator.id)
      .single();
    expect(creatorMembership?.status).toBe('left');
    expect(creatorMembership?.left_at).not.toBeNull();
  });

  test('LEAVE-002: Last member leaves, trip is archived not deleted', async ({
    createTestUser,
    createTestTrip,
    getClientAsUser,
    supabaseAdmin,
  }) => {
    const creator = await createTestUser({ displayName: 'Solo Creator' });
    const trip = await createTestTrip(creator, { name: 'Solo Trip' });

    const clientCreator = await getClientAsUser(creator);
    const { data: leaveResult } = await clientCreator.rpc('leave_trip', {
      _trip_id: trip.id,
    });

    expect((leaveResult as { success?: boolean; archived?: boolean })?.success).toBe(true);
    expect((leaveResult as { archived?: boolean })?.archived).toBe(true);

    // Trip exists but is archived
    const { data: tripRow } = await supabaseAdmin
      .from('trips')
      .select('id, is_archived, archived_at')
      .eq('id', trip.id)
      .single();
    expect(tripRow).not.toBeNull();
    expect(tripRow?.is_archived).toBe(true);
    expect(tripRow?.archived_at).not.toBeNull();
  });
});
