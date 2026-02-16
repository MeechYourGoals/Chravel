/**
 * Optimized TripMembers hook with TanStack Query
 * 
 * Uses parallel data fetching and proper caching for instant UI rendering.
 * Falls back to demo mode data when appropriate.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { tripService } from '@/services/tripService';
import { supabase } from '@/integrations/supabase/client';
import { getTripById } from '@/data/tripsData';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useDemoTripMembersStore } from '@/store/demoTripMembersStore';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
export interface TripMember {
  id: string;
  name: string;
  avatar?: string;
  isCreator?: boolean;
}

interface TripMembersData {
  members: TripMember[];
  creatorId: string | null;
  hadError?: boolean;
}

const getMockFallbackMembers = (tripId: string): TripMember[] => {
  const isNumericOnly = /^\d+$/.test(tripId);
  if (!isNumericOnly) return [];
  
  const numericTripId = parseInt(tripId, 10);
  const trip = getTripById(numericTripId);
  
  const baseMembers: TripMember[] = trip?.participants
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
  
  const addedMembers = useDemoTripMembersStore.getState().getAddedMembers(tripId);
  const addedAsTripMembers: TripMember[] = addedMembers.map(m => ({
    id: m.id.toString(),
    name: m.name,
    avatar: m.avatar,
    isCreator: false
  }));
  
  const allMembers = [...baseMembers];
  for (const added of addedAsTripMembers) {
    if (!allMembers.some(m => m.id === added.id)) {
      allMembers.push(added);
    }
  }
  
  return allMembers;
};

/**
 * Fetch trip data and members in PARALLEL for faster loading
 */
async function fetchTripMembersData(
  tripId: string, 
  isDemoMode: boolean
): Promise<TripMembersData> {
  const isNumericOnly = /^\d+$/.test(tripId);
  
  // Fast path for demo mode with numeric IDs
  if (isDemoMode && isNumericOnly) {
    const mockMembers = getMockFallbackMembers(tripId);
    return {
      members: mockMembers,
      creatorId: mockMembers[0]?.id || null,
      hadError: false,
    };
  }

  try {
    // Use canonical source: getTripMembersWithCreator guarantees creator is always in the list
    const { members, creatorId } = await tripService.getTripMembersWithCreator(tripId);

    // Map to TripMember format (members already have id, name, avatar, isCreator)
    const formattedMembers: TripMember[] = members.map(m => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      isCreator: m.isCreator,
    }));

    return {
      members: formattedMembers,
      creatorId,
      hadError: false,
    };
  } catch (error) {
    // Log in all envs so prod breakage (RLS, network) is visible
    console.error('[useTripMembersQuery] Failed to fetch members:', error);
    return { members: [], creatorId: null, hadError: true };
  }
}

export const useTripMembersQuery = (tripId?: string) => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();

  // Track demo store changes
  const demoAddedMembersCount = useDemoTripMembersStore(state => 
    tripId ? (state.addedMembers[tripId]?.length || 0) : 0
  );

  // Main query with caching
  const { data, isLoading, refetch } = useQuery({
    queryKey: [...tripKeys.members(tripId || ''), demoAddedMembersCount],
    queryFn: () => fetchTripMembersData(tripId!, isDemoMode),
    enabled: !!tripId,
    staleTime: QUERY_CACHE_CONFIG.members.staleTime,
    gcTime: QUERY_CACHE_CONFIG.members.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.members.refetchOnWindowFocus,
  });

  const tripMembers = data?.members || [];
  const tripCreatorId = data?.creatorId || null;
  const hadMembersError = data?.hadError ?? false;

  // Check if current user can remove members
  const canRemoveMembers = useCallback(async (): Promise<boolean> => {
    if (!tripId || !user?.id) return false;
    if (tripCreatorId === user.id) return true;
    
    const { data: adminData } = await supabase
      .from('trip_admins')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    return !!adminData;
  }, [tripId, user?.id, tripCreatorId]);

  // Remove member mutation with optimistic update
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!tripId) throw new Error('No trip selected');
      if (userId === tripCreatorId) throw new Error('Cannot remove trip creator');

      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', userId);

      if (error) throw error;
      return userId;
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.members(tripId!) });
      const previous = queryClient.getQueryData<TripMembersData>(tripKeys.members(tripId!));
      
      queryClient.setQueryData<TripMembersData>(tripKeys.members(tripId!), old => ({
        ...old!,
        members: old?.members.filter(m => m.id !== userId) || []
      }));
      
      return { previous };
    },
    onSuccess: () => {
      toast.success('Member removed from trip');
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tripKeys.members(tripId!), context.previous);
      }
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.members(tripId!) });
    }
  });

  // Leave trip mutation
  const leaveTripMutation = useMutation({
    mutationFn: async (tripName: string) => {
      if (!tripId || !user?.id) throw new Error('Must be logged in');
      if (isDemoMode) return true;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name')
        .eq('user_id', user.id)
        .single();
      
      const userName = profileData?.display_name || 
        `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim() || 
        'A member';

      const { error: deleteError } = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Notify creator
      if (tripCreatorId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: tripCreatorId,
            title: `${userName} left ${tripName}`,
            message: `${userName} has left the trip "${tripName}"`,
            type: 'member_left',
            metadata: {
              trip_id: tripId,
              trip_name: tripName,
              left_user_id: user.id,
              left_user_name: userName
            }
          });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.members(tripId!) });
    },
    onError: () => {
      toast.error('Failed to leave trip');
    }
  });

  return {
    tripMembers,
    loading: isLoading,
    tripCreatorId,
    hadMembersError,
    canRemoveMembers,
    removeMember: (userId: string) => removeMemberMutation.mutateAsync(userId),
    leaveTrip: (tripName: string) => leaveTripMutation.mutateAsync(tripName),
    refreshMembers: refetch
  };
};
