import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tripService, Trip } from '@/services/tripService';
import { useDemoMode } from './useDemoMode';
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
  error: Error | null;
}

/**
 * ⚡ PERFORMANCE: Unified hook for Trip Detail data fetching
 * 
 * Benefits:
 * - Parallel fetching of trip + members (no waterfall)
 * - TanStack Query cache integration (prefetch hits work)
 * - Demo mode fast path (no network calls)
 * - Progressive rendering - trip loads first, members follow
 */
export const useTripDetailData = (tripId: string | undefined): UseTripDetailDataResult => {
  const { isDemoMode } = useDemoMode();

  // Demo mode: Fast path - synchronous, no network
  const isNumericId = tripId ? /^\d+$/.test(tripId) : false;
  const shouldUseDemoPath = isDemoMode && isNumericId;

  // Get demo members from store for numeric trip IDs
  const demoAddedMembersCount = useDemoTripMembersStore(state => 
    tripId ? (state.addedMembers[tripId]?.length || 0) : 0
  );

  // ⚡ PRIORITY 1: Trip data - gates rendering
  const tripQuery = useQuery({
    queryKey: tripKeys.detail(tripId!),
    queryFn: async () => {
      const data = await tripService.getTripById(tripId!);
      return data;
    },
    enabled: !!tripId && !shouldUseDemoPath,
    staleTime: QUERY_CACHE_CONFIG.trip.staleTime,
    gcTime: QUERY_CACHE_CONFIG.trip.gcTime,
  });

  // ⚡ PRIORITY 2: Members data - can render progressively
  const membersQuery = useQuery({
    queryKey: tripKeys.members(tripId!),
    queryFn: async () => {
      return await tripService.getTripMembersWithCreator(tripId!);
    },
    enabled: !!tripId && !shouldUseDemoPath,
    staleTime: QUERY_CACHE_CONFIG.members.staleTime,
    gcTime: QUERY_CACHE_CONFIG.members.gcTime,
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
      error: null,
    };
  }

  // Production mode: Convert Supabase trip to mock format for backward compatibility
  const trip = tripQuery.data ? convertSupabaseTripToMock(tripQuery.data) : null;

  return {
    trip,
    tripMembers: membersQuery.data?.members || [],
    tripCreatorId: membersQuery.data?.creatorId || null,
    isLoading: tripQuery.isLoading,
    isMembersLoading: membersQuery.isLoading,
    error: tripQuery.error as Error | null,
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
  const baseMembers: TripMember[] = trip && trip.participants
    ? trip.participants.map((participant, index) => ({
        id: participant.id.toString(),
        name: participant.name,
        avatar: participant.avatar,
        isCreator: index === 0
      }))
    : [
        { id: 'user1', name: 'You', isCreator: true },
        { id: 'user2', name: 'Trip Organizer' }
      ];

  // Get any members added at runtime
  const addedMembers = useDemoTripMembersStore.getState().getAddedMembers(tripId);
  const addedAsTripMembers: TripMember[] = addedMembers.map(m => ({
    id: m.id.toString(),
    name: m.name,
    avatar: m.avatar,
    isCreator: false
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
