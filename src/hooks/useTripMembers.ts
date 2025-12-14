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
      let dbMembers = await tripService.getTripMembers(tripId);

      // SAFETY CHECK: Ensure creator is always a member
      if (tripData?.created_by && !isDemoMode) {
        const creatorInList = dbMembers?.some((m: any) => m.user_id === tripData.created_by);
        if (!creatorInList) {
          console.warn(`[useTripMembers] Creator ${tripData.created_by} missing from trip ${tripId}. Auto-fixing...`);
          
          // 1. Attempt to add to DB (background operation)
          tripService.addTripMember(tripId, tripData.created_by, 'admin').catch(console.error);
          
          // 2. Fetch profile for local display
          const { data: creatorProfile } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, email')
            .eq('user_id', tripData.created_by)
            .single();

          // 3. Add to local list if profile found
          if (creatorProfile) {
            const tempMember = {
              user_id: tripData.created_by,
              role: 'admin',
              created_at: new Date().toISOString(),
              profiles: creatorProfile,
              id: 'temp-fix-' + Date.now()
            };
            dbMembers = [...(dbMembers || []), tempMember] as any;
          }
        }
      }
      
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

  // Remove a member from the trip (admin action)
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

  // Leave trip (self-removal with notification to organizer)
  const leaveTrip = useCallback(async (tripName: string): Promise<boolean> => {
    if (!tripId || !user?.id) {
      toast.error('You must be logged in to leave a trip');
      return false;
    }

    // Demo mode: just show toast
    if (isDemoMode) {
      toast.success('You have left the trip');
      return true;
    }

    try {
      // Get user's display name for the notification
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name')
        .eq('user_id', user.id)
        .single();
      
      const userName = profileData?.display_name || 
        `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim() || 
        'A member';

      // Delete trip membership
      const { error: deleteError } = await supabase
        .from('trip_members')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error leaving trip:', deleteError);
        toast.error('Failed to leave trip');
        return false;
      }

      // Create notification for trip organizer
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

      // Update local state
      setTripMembers(prev => prev.filter(m => m.id !== user.id));
      return true;
    } catch (error) {
      console.error('Error leaving trip:', error);
      toast.error('Failed to leave trip');
      return false;
    }
  }, [tripId, user?.id, tripCreatorId, isDemoMode]);

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

    // Also subscribe to profile updates so avatar/name changes propagate across the app
    // (payments, chat, collaborator lists should never maintain their own avatar logic).
    const profilesChannel = supabase
      .channel(`profiles-updates-${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        payload => {
          const next = payload.new as { user_id?: string; display_name?: string | null; avatar_url?: string | null } | null;
          const userId = next?.user_id;
          if (!userId) return;

          setTripMembers(prev =>
            prev.map(member => {
              if (member.id !== userId) return member;
              return {
                ...member,
                name: next?.display_name ?? member.name,
                avatar: next?.avatar_url ?? member.avatar,
              };
            }),
          );
        },
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      supabase.removeChannel(profilesChannel);
    };
  }, [tripId]);

  return {
    tripMembers,
    loading,
    tripCreatorId,
    canRemoveMembers,
    removeMember,
    leaveTrip,
    refreshMembers: () => tripId && loadTripMembers(tripId)
  };
};