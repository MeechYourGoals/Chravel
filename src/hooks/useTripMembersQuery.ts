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
}

const formatTripMembers = (dbMembers: any[], creatorId?: string): TripMember[] => {
  return dbMembers.map(member => ({
    id: member.user_id,
    name: member.profiles?.display_name || member.profiles?.first_name || 'Unknown User',
    avatar: member.profiles?.avatar_url,
    isCreator: member.user_id === creatorId
  }));
};

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
      creatorId: mockMembers[0]?.id || null
    };
  }

  // ⚡ PARALLEL FETCH: Get trip creator and members simultaneously
  const [tripResult, membersResult] = await Promise.all([
    supabase
      .from('trips')
      .select('created_by')
      .eq('id', tripId)
      .single(),
    tripService.getTripMembers(tripId)
  ]);

  const creatorId = tripResult.data?.created_by || null;
  let dbMembers = membersResult || [];

  // Safety check: Ensure creator is always a member
  if (creatorId && !isDemoMode) {
    const creatorInList = dbMembers.some((m: any) => m.user_id === creatorId);
    if (!creatorInList) {
      // Auto-fix: add creator to trip (background)
      tripService.addTripMember(tripId, creatorId, 'admin').catch(console.error);
      
      // Fetch creator profile for local display
      const { data: creatorProfile } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .eq('user_id', creatorId)
        .single();

      if (creatorProfile) {
        dbMembers = [...dbMembers, {
          user_id: creatorId,
          role: 'admin',
          created_at: new Date().toISOString(),
          profiles: creatorProfile,
          id: 'temp-fix-' + Date.now()
        }] as any;
      }
    }
  }

  if (dbMembers && dbMembers.length > 0) {
    return {
      members: formatTripMembers(dbMembers, creatorId),
      creatorId
    };
  }

  // Demo fallback
  if (isDemoMode) {
    const mockMembers = getMockFallbackMembers(tripId);
    return {
      members: mockMembers,
      creatorId: mockMembers[0]?.id || null
    };
  }

  return { members: [], creatorId };
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
    canRemoveMembers,
    removeMember: (userId: string) => removeMemberMutation.mutateAsync(userId),
    leaveTrip: (tripName: string) => leaveTripMutation.mutateAsync(tripName),
    refreshMembers: refetch
  };
};
