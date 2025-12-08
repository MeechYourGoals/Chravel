import { useState, useEffect, useCallback } from 'react';
import { tripService } from '@/services/tripService';
import { supabase } from '@/integrations/supabase/client';
import { getTripById } from '@/data/tripsData';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useDemoTripMembersStore } from '@/store/demoTripMembersStore';

interface TripMember {
  id: string;
  name: string;
  avatar?: string;
  isCreator?: boolean;
}

export const useTripMembers = (tripId?: string) => {
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [tripCreatorId, setTripCreatorId] = useState<string | null>(null);
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();

  const formatTripMembers = (dbMembers: any[], creatorId?: string): TripMember[] => {
    return dbMembers.map(member => ({
      id: member.user_id,
      name: member.profiles?.display_name || member.profiles?.first_name || 'Unknown User',
      avatar: member.profiles?.avatar_url,
      isCreator: member.user_id === creatorId
    }));
  };

  const getMockFallbackMembers = (tripId: string): TripMember[] => {
    // CRITICAL: Only use mock data if tripId is ENTIRELY numeric (not a UUID)
    const isNumericOnly = /^\d+$/.test(tripId);
    if (!isNumericOnly) {
      // UUID trip - no mock fallback
      return [];
    }
    const numericTripId = parseInt(tripId, 10);
    const trip = getTripById(numericTripId);
    
    // Get base participants from static mock data
    const baseMembers: TripMember[] = trip && trip.participants
      ? trip.participants.map((participant, index) => ({
          id: participant.id.toString(),
          name: participant.name,
          avatar: participant.avatar,
          isCreator: index === 0 // First participant is creator in demo
        }))
      : [
          { id: 'user1', name: 'You', isCreator: true },
          { id: 'user2', name: 'Trip Organizer' }
        ];
    
    // Get any members added at runtime (from approved join requests)
    const addedMembers = useDemoTripMembersStore.getState().getAddedMembers(tripId);
    const addedAsTripMembers: TripMember[] = addedMembers.map(m => ({
      id: m.id.toString(),
      name: m.name,
      avatar: m.avatar,
      isCreator: false
    }));
    
    // Merge base + added members (avoid duplicates)
    const allMembers = [...baseMembers];
    for (const added of addedAsTripMembers) {
      if (!allMembers.some(m => m.id === added.id)) {
        allMembers.push(added);
      }
    }
    
    return allMembers;
  };

  const loadTripMembers = async (tripId: string) => {
    setLoading(true);
    
    try {
      // ⚡ PERFORMANCE: Fast path for demo mode with numeric IDs - skip database entirely
      const isNumericOnly = /^\d+$/.test(tripId);
      if (isDemoMode && isNumericOnly) {
        const mockMembers = getMockFallbackMembers(tripId);
        setTripMembers(mockMembers);
        setTripCreatorId(mockMembers[0]?.id || null);
        setLoading(false);
        return;
      }

      // Fetch trip creator ID
      const { data: tripData } = await supabase
        .from('trips')
        .select('created_by')
        .eq('id', tripId)
        .single();
      
      if (tripData?.created_by) {
        setTripCreatorId(tripData.created_by);
      }

      // Always try database first for authenticated trips
      const dbMembers = await tripService.getTripMembers(tripId);
      
      if (dbMembers && dbMembers.length > 0) {
        // Database has members - use them
        const formattedMembers = formatTripMembers(dbMembers, tripData?.created_by);
        setTripMembers(formattedMembers);
      } else if (isDemoMode) {
        // Demo mode + no DB members = use mock fallback
        const mockMembers = getMockFallbackMembers(tripId);
        setTripMembers(mockMembers);
      } else {
        // Production mode + no DB members = truly empty
        setTripMembers([]);
      }
    } catch (error) {
      // On error: demo gets mocks, production gets empty
      if (isDemoMode) {
        const mockMembers = getMockFallbackMembers(tripId);
        setTripMembers(mockMembers);
      } else {
        setTripMembers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check if current user can remove members (creator or admin)
  const canRemoveMembers = useCallback(async (): Promise<boolean> => {
    if (!tripId || !user?.id) return false;
    
    // Check if user is creator
    if (tripCreatorId === user.id) return true;
    
    // Check if user is admin
    const { data: adminData } = await supabase
      .from('trip_admins')
      .select('id')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    return !!adminData;
  }, [tripId, user?.id, tripCreatorId]);

  // Remove a member from the trip
  const removeMember = useCallback(async (userId: string): Promise<boolean> => {
    if (!tripId) {
      toast.error('No trip selected');
      return false;
    }

    // Prevent removing the trip creator
    if (userId === tripCreatorId) {
      toast.error('Cannot remove the trip creator');
      return false;
    }

    try {
      const { error } = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing member:', error);
        toast.error('Failed to remove member');
        return false;
      }

      // Update local state
      setTripMembers(prev => prev.filter(m => m.id !== userId));
      toast.success('Member removed from trip');
      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
      return false;
    }
  }, [tripId, tripCreatorId]);

  // Subscribe to demo store changes - use length as stable dependency to avoid infinite loops
  const demoAddedMembersCount = useDemoTripMembersStore(state => 
    tripId ? (state.addedMembers[tripId]?.length || 0) : 0
  );

  useEffect(() => {
    if (tripId) {
      loadTripMembers(tripId);
    }
  }, [tripId, isDemoMode, demoAddedMembersCount]);

  // Real-time subscription for trip members - only when database queries succeed
  useEffect(() => {
    if (!tripId) return;

    let channel: any;

    // Only create subscription if we have a valid trip ID and database connection
    const createSubscription = async () => {
      try {
        // Test if we can connect to the database first
        const { data } = await supabase.from('trip_members').select('id').limit(1);
        
        if (data !== null) {
          channel = supabase
            .channel(`trip-members-${tripId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'trip_members',
                filter: `trip_id=eq.${tripId}`
              },
              () => {
                // Reload members when changes occur
                loadTripMembers(tripId);
              }
            )
            .subscribe();
        }
      } catch {
        // Subscription setup failed - members will be loaded without real-time updates
      }
    };

    createSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [tripId]);

  return {
    tripMembers,
    loading,
    tripCreatorId,
    canRemoveMembers,
    removeMember,
    refreshMembers: () => tripId && loadTripMembers(tripId)
  };
};