import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from './demoModeService';
import { tripsData } from '@/data/tripsData';
import { adaptTripsDataToTripSchema } from '@/utils/schemaAdapters';

/**
 * Normalizes date input to YYYY-MM-DD format for database date columns
 * Accepts: YYYY-MM-DD, MM/DD/YYYY, or ISO 8601 datetime strings
 * Returns date-only format (YYYY-MM-DD) expected by Postgres date columns
 */
function normalizeDateInput(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;

  // If already YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // If ISO 8601 datetime, extract date part only
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // Match MM/DD/YYYY and convert to YYYY-MM-DD
  const usDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDateMatch) {
    const [, month, day, year] = usDateMatch;
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  return undefined;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  cover_image_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  trip_type: string;
  basecamp_name?: string;
  basecamp_address?: string;
  enabled_features?: string[]; // ✅ Phase 2: Feature toggles for Pro/Event trips
  membership_status?: 'owner' | 'member' | 'pending' | 'rejected'; // Membership status for current user
  card_color?: string | null; // Color coding for Pro/Event cards
}

export interface CreateTripData {
  id?: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  destination?: string;
  cover_image_url?: string;
  trip_type?: string;
  basecamp_name?: string;
  basecamp_address?: string;
  enabled_features?: string[]; // ✅ Phase 2: Feature toggles for Pro/Event trips
  card_color?: string; // Color coding for Pro/Event cards
}

type TripDetailErrorCode = 'AUTH_REQUIRED' | 'TRIP_NOT_FOUND' | 'ACCESS_DENIED' | 'BAD_REQUEST';

interface TripDetailFunctionResponse {
  success: boolean;
  trip?: Trip;
  error?: string;
  error_code?: TripDetailErrorCode;
}

const fetchTripByIdViaEdgeFunction = async (tripId: string): Promise<Trip | null> => {
  const { data, error } = await supabase.functions.invoke('get-trip-detail', {
    body: { tripId },
  });

  if (error) {
    throw new Error(`Failed to load trip: ${error.message}`);
  }

  const response = data as TripDetailFunctionResponse | undefined;
  if (!response) {
    throw new Error('Failed to load trip: Empty response');
  }

  if (!response.success) {
    if (response.error_code === 'AUTH_REQUIRED') {
      throw new Error('AUTH_REQUIRED');
    }
    if (response.error_code === 'ACCESS_DENIED') {
      throw new Error('permission denied');
    }
    if (response.error_code === 'TRIP_NOT_FOUND') {
      return null;
    }
    throw new Error(response.error || 'Failed to load trip');
  }

  return response.trip ?? null;
};

export const tripService = {
  async createTrip(tripData: CreateTripData): Promise<Trip | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Enhanced validation with detailed error logging
      if (!user) {
        if (import.meta.env.DEV) {
          console.error('[tripService] No authenticated user found');
        }
        throw new Error('No authenticated user');
      }

      if (!user.id) {
        if (import.meta.env.DEV) {
          console.error('[tripService] Authenticated user missing ID', { user });
        }
        throw new Error('Invalid user state - missing ID');
      }

      // Check active trip limit for free users
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_product_id')
        .eq('user_id', user.id)
        .single();

      // Super admin bypass - ccamechi@gmail.com has unlimited access
      const { SUPER_ADMIN_EMAILS } = await import('@/constants/admins');
      const authEmail = user.email?.toLowerCase().trim();
      const isSuperAdmin = authEmail ? SUPER_ADMIN_EMAILS.includes(authEmail) : false;

      if (isSuperAdmin) {
        console.log('[tripService] Super admin bypass for:', authEmail);
      } else {
        const tier =
          profile?.subscription_status === 'active'
            ? profile.subscription_product_id?.includes('explorer')
              ? 'explorer'
              : 'frequent-chraveler'
            : 'free';

        // Count active (non-archived) trips OF THE SAME TYPE being created
        const tripTypeToCheck = tripData.trip_type || 'consumer';
        const { count, error: countError } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
          .eq('created_by', user.id)
          .eq('is_archived', false)
          .eq('trip_type', tripTypeToCheck);

        if (countError) throw countError;

        // 3 trips per type for free users
        const activeTripsLimit = tier === 'free' ? 3 : -1;
        if (activeTripsLimit !== -1 && (count || 0) >= activeTripsLimit) {
          throw new Error('TRIP_LIMIT_REACHED');
        }
      }

      // Dates already in ISO 8601 format from CreateTripModal - no normalization needed
      console.log('[tripService] Creating trip:', {
        name: tripData.name,
        start_date: tripData.start_date,
        end_date: tripData.end_date,
        trip_type: tripData.trip_type,
        user_id: user.id,
      });

      // Use edge function for server-side validation and Pro tier enforcement
      const { data, error } = await supabase.functions.invoke('create-trip', {
        body: {
          name: tripData.name,
          description: tripData.description,
          destination: tripData.destination,
          start_date: tripData.start_date,
          end_date: tripData.end_date,
          trip_type: tripData.trip_type || 'consumer',
          cover_image_url: tripData.cover_image_url,
          card_color: tripData.card_color, // ✅ Pass card color for Pro/Event trips
          enabled_features: tripData.enabled_features, // ✅ Phase 2: Pass feature toggles
        },
      });

      console.log('[tripService] Edge function response:', { success: data?.success, error });

      if (error) {
        console.error('[tripService] Edge function error:', error);
        throw new Error(error.message || 'Failed to create trip');
      }

      if (!data?.success) {
        console.error('[tripService] Edge function returned failure:', data);
        throw new Error(data?.error || 'Failed to create trip');
      }

      console.log('[tripService] Trip created successfully:', data.trip.id);
      return data.trip;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[tripService] Error creating trip:', error);
      }
      // Re-throw to preserve error message for UI
      throw error;
    }
  },

  async getUserTrips(
    isDemoMode?: boolean,
    tripType?: 'consumer' | 'pro' | 'event',
  ): Promise<Trip[]> {
    try {
      const demoEnabled = isDemoMode ?? (await demoModeService.isDemoModeEnabled());
      if (demoEnabled) {
        if (tripType === 'pro') return [];
        if (tripType === 'event') return [];
        const adaptedTrips = adaptTripsDataToTripSchema(tripsData);
        return adaptedTrips;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('trips')
        .select('*')
        .eq('created_by', user.id)
        .eq('is_archived', false)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (tripType) {
        query = query.eq('trip_type', tripType);
      }

      const { data: createdTrips, error: createdError } = await query;

      if (createdError) throw createdError;

      // Fetch trips where user has pending join requests
      const { data: pendingRequests, error: pendingError } = await supabase
        .from('trip_join_requests')
        .select('trip_id, status')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (pendingError) {
        console.error('Error fetching pending requests:', pendingError);
        // Continue without pending trips rather than failing completely
      }

      // Fetch trip details for pending requests
      const pendingTripIds = pendingRequests?.map(r => r.trip_id) || [];
      let pendingTrips: Trip[] = [];

      if (pendingTripIds.length > 0) {
        const { data: pendingTripsData, error: pendingTripsError } = await supabase
          .from('trips')
          .select('*')
          .in('id', pendingTripIds)
          .eq('is_archived', false)
          .eq('is_hidden', false);

        if (!pendingTripsError && pendingTripsData) {
          pendingTrips = pendingTripsData.map(trip => ({
            ...trip,
            membership_status: 'pending' as const,
          }));
        }
      }

      // Combine created trips and pending trips
      const allTrips = [
        ...(createdTrips || []).map(trip => ({
          ...trip,
          membership_status: 'owner' as const,
        })),
        ...pendingTrips,
      ];

      // Also fetch trips where user is a member (not creator)
      const { data: memberTrips, error: memberError } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', user.id);

      if (!memberError && memberTrips && memberTrips.length > 0) {
        const memberTripIds = memberTrips
          .map(m => m.trip_id)
          .filter(id => !allTrips.some(t => t.id === id)); // Exclude already fetched trips

        if (memberTripIds.length > 0) {
          const { data: memberTripsData, error: memberTripsError } = await supabase
            .from('trips')
            .select('*')
            .in('id', memberTripIds)
            .eq('is_archived', false)
            .eq('is_hidden', false);

          if (!memberTripsError && memberTripsData) {
            allTrips.push(
              ...memberTripsData.map(trip => ({
                ...trip,
                membership_status: 'member' as const,
              })),
            );
          }
        }
      }

      if (allTrips.length === 0) return [];

      // Batch-fetch member and link counts separately (no FK required)
      const tripIds = allTrips.map(t => t.id);

      const [membersResult, linksResult] = await Promise.all([
        supabase.from('trip_members').select('trip_id').in('trip_id', tripIds),
        supabase.from('trip_links').select('trip_id').in('trip_id', tripIds),
      ]);

      // Count occurrences per trip
      const memberCountMap = new Map<string, number>();
      const linkCountMap = new Map<string, number>();

      membersResult.data?.forEach(m => {
        memberCountMap.set(m.trip_id, (memberCountMap.get(m.trip_id) || 0) + 1);
      });

      linksResult.data?.forEach(l => {
        linkCountMap.set(l.trip_id, (linkCountMap.get(l.trip_id) || 0) + 1);
      });

      // Attach counts to trips in the format expected by tripConverter
      return allTrips.map(trip => ({
        ...trip,
        trip_members: [{ count: memberCountMap.get(trip.id) || 0 }],
        trip_links: [{ count: linkCountMap.get(trip.id) || 0 }],
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching trips:', error);
      }
      return [];
    }
  },

  async getTripById(tripId: string): Promise<Trip | null> {
    // NOTE: Auth is now handled by useTripDetailData hook (gates query on authUserId)
    // This service method only runs when user is authenticated

    // Use maybeSingle() to distinguish "no rows" from errors
    const { data, error } = await supabase.from('trips').select('*').eq('id', tripId).maybeSingle();

    if (error) {
      // Log in dev for debugging
      if (import.meta.env.DEV) {
        console.error('[tripService.getTripById] Error:', {
          tripId,
          code: error.code,
          message: error.message,
          details: error.details,
        });
      }
      // CRITICAL: Throw so React Query marks this as an error (not cached as null success)
      throw new Error(`Failed to load trip: ${error.message}`);
    }

    if (data) {
      return data;
    }

    // No error but no data could be RLS filtering; fall back to server-side access check
    return await fetchTripByIdViaEdgeFunction(tripId);
  },

  async updateTrip(tripId: string, updates: Partial<Trip>): Promise<boolean> {
    try {
      // Use .select() to verify the update actually happened
      // RLS policy "Trip creators can update their trips" handles authorization
      const { data, error } = await supabase
        .from('trips')
        .update(updates)
        .eq('id', tripId)
        .select('id')
        .maybeSingle();

      if (error) {
        console.error('[tripService] Update error:', error);
        return false;
      }

      // Check if any row was actually updated
      if (!data) {
        console.error(
          '[tripService] No rows updated - user may not have permission to update trip:',
          tripId,
        );
        return false;
      }

      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error updating trip:', error);
      }
      return false;
    }
  },

  async archiveTrip(tripId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('trips').update({ is_archived: true }).eq('id', tripId);

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error archiving trip:', error);
      }
      return false;
    }
  },

  async getTripMembers(tripId: string) {
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(
          `
          id,
          user_id,
          role,
          created_at
        `,
        )
        .eq('trip_id', tripId);

      if (error) throw error;

      // Fetch profiles separately since there's no foreign key
      if (!data || data.length === 0) return [];

      const userIds = data.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Merge trip_members with profiles
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      return data.map(m => ({
        ...m,
        profiles: profilesMap.get(m.user_id) || null,
      }));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error fetching trip members:', error);
      }
      return [];
    }
  },

  /**
   * ⚡ PERFORMANCE: Combined query for members + creator in single parallel batch
   * Reduces 3 sequential round-trips to 1 parallel batch
   */
  async getTripMembersWithCreator(tripId: string): Promise<{
    members: Array<{ id: string; name: string; avatar?: string; isCreator?: boolean }>;
    creatorId: string | null;
  }> {
    // NOTE: Auth is now handled by useTripDetailData hook (gates query on authUserId)
    // This service method only runs when user is authenticated

    if (import.meta.env.DEV) {
      console.log('[tripService.getTripMembersWithCreator] Fetching for tripId:', tripId);
    }

    // Parallel fetch: trip creator + members
    const [tripResult, membersResult] = await Promise.all([
      supabase.from('trips').select('created_by').eq('id', tripId).maybeSingle(),
      supabase.from('trip_members').select('id, user_id, role, created_at').eq('trip_id', tripId),
    ]);

    // CRITICAL: Check for auth/RLS/network errors and THROW (don't silently return empty)
    if (tripResult.error) {
      if (import.meta.env.DEV) {
        console.error('[tripService.getTripMembersWithCreator] Trip query error:', {
          tripId,
          code: tripResult.error.code,
          message: tripResult.error.message,
        });
      }
      throw new Error(`Failed to load trip data: ${tripResult.error.message}`);
    }

    if (membersResult.error) {
      if (import.meta.env.DEV) {
        console.error('[tripService.getTripMembersWithCreator] Members query error:', {
          tripId,
          code: membersResult.error.code,
          message: membersResult.error.message,
        });
      }
      throw new Error(`Failed to load trip members: ${membersResult.error.message}`);
    }

    const creatorId = tripResult.data?.created_by || null;

    if (import.meta.env.DEV) {
      console.log('[tripService.getTripMembersWithCreator] Results:', {
        creatorId,
        membersCount: membersResult.data?.length ?? 0,
      });
    }

    // If no members in table but we have creator, fetch creator as minimum member
    if (!membersResult.data || membersResult.data.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('[tripService] No members found in trip_members table for trip:', tripId);
      }
      if (creatorId) {
        const { data: creatorProfile } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, avatar_url')
          .eq('user_id', creatorId)
          .maybeSingle();

        return {
          members: [
            {
              id: creatorId,
              name: creatorProfile?.display_name || 'Trip Creator',
              avatar: creatorProfile?.avatar_url,
              isCreator: true,
            },
          ],
          creatorId,
        };
      }
      return { members: [], creatorId };
    }

    // Fetch profiles for all members
    const userIds = membersResult.data.map(m => m.user_id);
    const { data: profilesData } = await supabase
      .from('profiles_public')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

    const members = membersResult.data.map(m => {
      const profile = profilesMap.get(m.user_id);
      return {
        id: m.user_id,
        name: profile?.display_name || 'Former Member',
        avatar: profile?.avatar_url,
        isCreator: m.user_id === creatorId,
      };
    });

    if (import.meta.env.DEV) {
      console.log('[tripService.getTripMembersWithCreator] Returning', members.length, 'members');
    }
    return { members, creatorId };
  },

  async addTripMember(tripId: string, userId: string, role: string = 'member'): Promise<boolean> {
    try {
      const { error } = await supabase.from('trip_members').insert({
        trip_id: tripId,
        user_id: userId,
        role: role,
      });

      return !error;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error adding trip member:', error);
      }
      return false;
    }
  },
};
