import { useQuery } from '@tanstack/react-query';
import { tripService, Trip } from '@/services/tripService';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { getTripById as getDemoTripById } from '@/data/tripsData';
import { convertSupabaseTripToMock } from '@/utils/tripConverter';
import { useDemoTripMembersStore } from '@/store/demoTripMembersStore';

interface TripMember {
  id: string;
  name: string;
  avatar?: string;
  isCreator?: boolean;
}

interface UseTripDetailDataResult {
  trip: ReturnType<typeof getDemoTripById> | null;
  tripMembers: TripMember[];
  tripCreatorId: string | null;
  isLoading: boolean;
  isMembersLoading: boolean;
  isAuthLoading: boolean;
  tripError: Error | null;
  membersError: Error | null;
}

/**
 * ⚡ PERFORMANCE: Unified hook for Trip Detail data fetching
 *
 * Benefits:
 * - Parallel fetching of trip + members (no waterfall)
 * - TanStack Query cache integration (prefetch hits work)
 * - Demo mode fast path (no network calls)
 * - Progressive rendering - trip loads first, members follow
 * - 🔒 Auth-aware: waits for auth hydration before fetching
 * - 🔑 User-scoped cache keys: prevents anon results poisoning auth cache
 * - 🔒 FIX: Uses SAME auth pattern as useTrips (user?.id) for consistency
 */
export const useTripDetailData = (tripId: string | undefined): UseTripDetailDataResult => {
  const { isDemoMode } = useDemoMode();
  // 🔒 FIX: Get BOTH user and session - use same pattern as useTrips for consistency
  // useTrips uses `user`, so we should too. This ensures if trips list works, detail works.
  const { user, session, isLoading: isAuthLoading } = useAuth();

  // 🔒 CRITICAL: Use user?.id (same as useTrips) as primary auth identifier
  // Fallback to session?.user?.id only if user transform is incomplete
  const authUserId = user?.id ?? session?.user?.id ?? null;

  // 🔍 DEBUG: Log auth state (dev only) to diagnose issues
  if (import.meta.env.DEV) {
    console.log('[useTripDetailData] Auth state:', {
      tripId,
      isAuthLoading,
      hasUser: !!user,
      userId: user?.id?.slice(0, 8),
      hasSession: !!session,
      sessionUserId: session?.user?.id?.slice(0, 8),
      authUserId: authUserId?.slice(0, 8),
      isDemoMode,
    });
  }

  // Demo mode: Fast path - synchronous, no network
  const isNumericId = tripId ? /^\d+$/.test(tripId) : false;
  const shouldUseDemoPath = isDemoMode && isNumericId;

  // Get demo members from store for numeric trip IDs
  const demoAddedMembersCount = useDemoTripMembersStore(state =>
    tripId ? state.addedMembers[tripId]?.length || 0 : 0,
  );

  // 🔒 CRITICAL: Only enable queries when:
  // 1. We have a tripId
  // 2. NOT in demo mode path
  // 3. Auth is fully loaded (not hydrating)
  // 4. User has active session (use raw session.user.id, not transformed user)
  // 🔒 FIX: Gate on authUserId (from session) instead of user to prevent race condition
  // where session exists but user transform fails/is delayed
  const isQueryEnabled = !!tripId && !shouldUseDemoPath && !isAuthLoading && !!authUserId;

  // ⚡ PRIORITY 1: Trip data - gates rendering
  // 🔑 Include authUserId in query key to prevent anon cache poisoning auth cache
  // 🔒 FIX: Use authUserId (from session) for consistent cache keys
  const tripQuery = useQuery({
    queryKey: [...tripKeys.detail(tripId!), authUserId ?? 'anon'],
    queryFn: async () => {
      const data = await tripService.getTripById(tripId!);
      return data;
    },
    enabled: isQueryEnabled,
    staleTime: QUERY_CACHE_CONFIG.trip.staleTime,
    gcTime: QUERY_CACHE_CONFIG.trip.gcTime,
    retry: (failureCount, error) => {
      // Don't retry on 403/404 - those are permanent
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('permission') || msg.includes('not found')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // ⚡ PRIORITY 2: Members data - can render progressively
  // 🔑 Include authUserId in query key to prevent anon cache poisoning auth cache
  // 🔒 FIX: Use authUserId (from session) for consistent cache keys
  const membersQuery = useQuery({
    queryKey: [...tripKeys.members(tripId!), authUserId ?? 'anon', demoAddedMembersCount],
    queryFn: async () => {
      return await tripService.getTripMembersWithCreator(tripId!);
    },
    enabled: isQueryEnabled,
    staleTime: QUERY_CACHE_CONFIG.members.staleTime,
    gcTime: QUERY_CACHE_CONFIG.members.gcTime,
    retry: (failureCount, error) => {
      // Don't retry on 403/404 - those are permanent
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('permission') || msg.includes('not found')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Demo mode: Return mock data immediately
  if (shouldUseDemoPath && tripId) {
    const tripIdNum = parseInt(tripId, 10);
    const mockTrip = getDemoTripById(tripIdNum);

    // Get demo members
    const demoMembers = getMockFallbackMembers(tripId);

    return {
      trip: mockTrip || null,
      tripMembers: demoMembers,
      tripCreatorId: demoMembers[0]?.id || null,
      isLoading: false,
      isMembersLoading: false,
      isAuthLoading: false,
      tripError: null,
      membersError: null,
    };
  }

  // 🔒 If auth is still loading, return loading state (NOT "trip not found")
  if (isAuthLoading) {
    return {
      trip: null,
      tripMembers: [],
      tripCreatorId: null,
      isLoading: true,
      isMembersLoading: true,
      isAuthLoading: true,
      tripError: null,
      membersError: null,
    };
  }

  // 🔒 CRITICAL FIX: If auth is done but NO session, return AUTH_REQUIRED error
  // This prevents showing "Trip Not Found" when user simply isn't logged in
  // The query won't run (isQueryEnabled=false) so we must return the error here
  if (!authUserId && !shouldUseDemoPath && tripId) {
    if (import.meta.env.DEV) {
      console.warn('[useTripDetailData] No authUserId after auth loaded - returning AUTH_REQUIRED', {
        tripId,
        isAuthLoading,
        hasSession: !!session,
      });
    }
    return {
      trip: null,
      tripMembers: [],
      tripCreatorId: null,
      isLoading: false,
      isMembersLoading: false,
      isAuthLoading: false,
      tripError: new Error('AUTH_REQUIRED'),
      membersError: new Error('AUTH_REQUIRED'),
    };
  }

  // Production mode: Convert Supabase trip to mock format for backward compatibility
  const trip = tripQuery.data ? convertSupabaseTripToMock(tripQuery.data) : null;

  // Show loading while auth is resolving or data is fetching
  const isLoading = isAuthLoading || tripQuery.isLoading;

  return {
    trip,
    tripMembers: membersQuery.data?.members || [],
    tripCreatorId: membersQuery.data?.creatorId || null,
    isLoading: tripQuery.isLoading,
    isMembersLoading: membersQuery.isLoading,
    isAuthLoading: false,
    tripError: tripQuery.error as Error | null,
    membersError: membersQuery.error as Error | null,
  };
};

/**
 * Get mock fallback members for demo trips
 */
function getMockFallbackMembers(tripId: string): TripMember[] {
  const isNumericOnly = /^\d+$/.test(tripId);
  if (!isNumericOnly) return [];

  const numericTripId = parseInt(tripId, 10);
  const trip = getDemoTripById(numericTripId);

  // Get base participants from static mock data
  const baseMembers: TripMember[] =
    trip && trip.participants
      ? trip.participants.map((participant, index) => ({
          id: participant.id.toString(),
          name: participant.name,
          avatar: participant.avatar,
          isCreator: index === 0,
        }))
      : [
          { id: 'user1', name: 'You', isCreator: true },
          { id: 'user2', name: 'Trip Organizer' },
        ];

  // Get any members added at runtime
  const addedMembers = useDemoTripMembersStore.getState().getAddedMembers(tripId);
  const addedAsTripMembers: TripMember[] = addedMembers.map(m => ({
    id: m.id.toString(),
    name: m.name,
    avatar: m.avatar,
    isCreator: false,
  }));

  // Merge avoiding duplicates
  const allMembers = [...baseMembers];
  for (const added of addedAsTripMembers) {
    if (!allMembers.some(m => m.id === added.id)) {
      allMembers.push(added);
    }
  }

  return allMembers;
}
