/**
 * Trip Recovery Utilities
 *
 * Diagnostic functions to find and recover "missing" trips that may be:
 * - Archived (is_archived: true)
 * - Hidden (is_hidden: true)
 * - User removed from trip_members
 */

import { supabase } from '@/integrations/supabase/client';

interface TripSearchResult {
  id: string;
  name: string;
  destination: string | null;
  trip_type: string;
  is_archived: boolean;
  is_hidden: boolean;
  created_by: string;
  created_at: string;
  isMember: boolean;
  isCreator: boolean;
}

/**
 * Search for ALL trips matching a name, regardless of archived/hidden status.
 * This bypasses normal filtering to help recover "lost" trips.
 */
export async function searchAllTrips(searchTerm: string): Promise<{
  trips: TripSearchResult[];
  error: string | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { trips: [], error: 'Not authenticated' };
    }

    // Search ALL trips where user is creator (ignoring is_archived and is_hidden)
    const { data: createdTrips, error: createdError } = await supabase
      .from('trips')
      .select('*')
      .eq('created_by', user.id)
      .ilike('name', `%${searchTerm}%`);

    if (createdError) {
      console.error('Error searching created trips:', createdError);
    }

    // Search trips where user is a member
    const { data: memberTrips, error: memberError } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('Error fetching memberships:', memberError);
    }

    const memberTripIds = memberTrips?.map(m => m.trip_id) || [];

    // Fetch those trips
    let memberTripData: typeof createdTrips = [];
    if (memberTripIds.length > 0) {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .in('id', memberTripIds)
        .ilike('name', `%${searchTerm}%`);

      if (!error) {
        memberTripData = data || [];
      }
    }

    // Combine and deduplicate
    const allTrips = [...(createdTrips || []), ...(memberTripData || [])];
    const uniqueTrips = Array.from(new Map(allTrips.map(t => [t.id, t])).values());

    // Add membership info
    const results: TripSearchResult[] = uniqueTrips.map(trip => ({
      id: trip.id,
      name: trip.name,
      destination: trip.destination,
      trip_type: trip.trip_type,
      is_archived: trip.is_archived,
      is_hidden: trip.is_hidden,
      created_by: trip.created_by,
      created_at: trip.created_at,
      isMember: memberTripIds.includes(trip.id),
      isCreator: trip.created_by === user.id,
    }));

    return { trips: results, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { trips: [], error: message };
  }
}

/**
 * Get ALL trips for a user regardless of status.
 * Useful for debugging "missing" trips.
 */
export async function getAllUserTrips(): Promise<{
  created: TripSearchResult[];
  member: TripSearchResult[];
  error: string | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { created: [], member: [], error: 'Not authenticated' };
    }

    // Get ALL trips created by user
    const { data: createdTrips, error: createdError } = await supabase
      .from('trips')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (createdError) {
      return { created: [], member: [], error: createdError.message };
    }

    // Get all memberships
    const { data: memberships, error: memberError } = await supabase
      .from('trip_members')
      .select('trip_id')
      .eq('user_id', user.id);

    if (memberError) {
      console.error('Error fetching memberships:', memberError);
    }

    const memberTripIds = memberships?.map(m => m.trip_id) || [];

    // Get member trip details (excluding ones we created)
    const nonCreatorMemberIds = memberTripIds.filter(
      id => !createdTrips?.some(t => t.id === id)
    );

    let memberTripData: typeof createdTrips = [];
    if (nonCreatorMemberIds.length > 0) {
      const { data } = await supabase
        .from('trips')
        .select('*')
        .in('id', nonCreatorMemberIds)
        .order('created_at', { ascending: false });

      memberTripData = data || [];
    }

    const formatTrips = (trips: typeof createdTrips, isMember: boolean): TripSearchResult[] =>
      (trips || []).map(trip => ({
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        trip_type: trip.trip_type,
        is_archived: trip.is_archived,
        is_hidden: trip.is_hidden,
        created_by: trip.created_by,
        created_at: trip.created_at,
        isMember,
        isCreator: trip.created_by === user.id,
      }));

    return {
      created: formatTrips(createdTrips, true),
      member: formatTrips(memberTripData, true),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { created: [], member: [], error: message };
  }
}

/**
 * Recover a trip by un-archiving and un-hiding it.
 */
export async function recoverTrip(tripId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('trips')
      .update({ is_archived: false, is_hidden: false })
      .eq('id', tripId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Log all trips to console for debugging.
 * Call this from browser console: await window.debugTrips()
 */
export async function debugTrips(): Promise<void> {
  console.log('🔍 Searching for ALL trips...');

  const result = await getAllUserTrips();

  if (result.error) {
    console.error('❌ Error:', result.error);
    return;
  }

  console.log('\n📦 CREATED TRIPS:');
  console.table(result.created.map(t => ({
    name: t.name,
    type: t.trip_type,
    archived: t.is_archived ? '✓' : '',
    hidden: t.is_hidden ? '✓' : '',
    id: t.id.slice(0, 8) + '...',
  })));

  console.log('\n👥 MEMBER TRIPS (not creator):');
  console.table(result.member.map(t => ({
    name: t.name,
    type: t.trip_type,
    archived: t.is_archived ? '✓' : '',
    hidden: t.is_hidden ? '✓' : '',
    id: t.id.slice(0, 8) + '...',
  })));

  const archived = [...result.created, ...result.member].filter(t => t.is_archived);
  const hidden = [...result.created, ...result.member].filter(t => t.is_hidden);

  console.log(`\n📊 SUMMARY:`);
  console.log(`  Total created: ${result.created.length}`);
  console.log(`  Total member: ${result.member.length}`);
  console.log(`  Archived: ${archived.length}`);
  console.log(`  Hidden: ${hidden.length}`);

  if (archived.length > 0) {
    console.log('\n⚠️ ARCHIVED TRIPS (go to Settings > Archive to restore):');
    archived.forEach(t => console.log(`  - ${t.name} (${t.id})`));
  }

  if (hidden.length > 0) {
    console.log('\n👁️ HIDDEN TRIPS (go to Settings > Archive > Hidden tab):');
    hidden.forEach(t => console.log(`  - ${t.name} (${t.id})`));
  }
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  (window as unknown as { debugTrips: typeof debugTrips; searchAllTrips: typeof searchAllTrips; recoverTrip: typeof recoverTrip }).debugTrips = debugTrips;
  (window as unknown as { searchAllTrips: typeof searchAllTrips }).searchAllTrips = searchAllTrips;
  (window as unknown as { recoverTrip: typeof recoverTrip }).recoverTrip = recoverTrip;
}
