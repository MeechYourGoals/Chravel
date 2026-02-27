import { supabase } from '@/integrations/supabase/client';
import { TripMember } from '@/features/chat/hooks/useTripMembers';
import { tripKeys } from '@/lib/queryKeys';
import { Invariants } from '../invariants';

/**
 * Membership Repository (TDAL)
 *
 * Single Source of Truth for Trip Members and Roles.
 * Handles fetching, adding, removing, and role management.
 */
export const membershipRepo = {
  /**
   * Get all members of a trip.
   * Includes profile data (avatar, name).
   */
  async getMembers(tripId: string): Promise<TripMember[]> {
    // 1. Fetch raw membership rows
    const { data: members, error } = await supabase
      .from('trip_members')
      .select('user_id, role, created_at')
      .eq('trip_id', tripId);

    if (error) throw error;
    if (!members || members.length === 0) return [];

    // 2. Fetch profiles
    const userIds = members.map(m => m.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles_public')
      .select('user_id, display_name, avatar_url, first_name, last_name')
      .in('user_id', userIds);

    if (profilesError) throw profilesError;

    // 3. Merge
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

    return members.map(m => {
      const profile = profileMap.get(m.user_id);
      // Determine display name
      let name = 'Unknown User';
      if (profile) {
          name = profile.display_name ||
                 (profile.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : null) ||
                 'Unnamed User';
      }

      return {
        id: m.user_id,
        name,
        avatar: profile?.avatar_url,
        role: m.role || 'member',
        isCreator: false, // Will be set by caller if they know creator ID
      };
    });
  },

  /**
   * Get members with explicit "isCreator" flag.
   */
  async getMembersWithCreator(tripId: string): Promise<{
    members: TripMember[];
    creatorId: string | null;
  }> {
    // Fetch Trip to get creator_id
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('created_by')
      .eq('id', tripId)
      .single();

    if (tripError) throw tripError;
    const creatorId = trip?.created_by || null;

    // Get basic members
    let members = await this.getMembers(tripId);

    // Apply isCreator flag
    members = members.map(m => ({
      ...m,
      isCreator: m.id === creatorId,
    }));

    // Invariant: Creator MUST be in the list
    if (creatorId) {
      Invariants.Membership.assertCreatorIsMember(creatorId, members);
      // If missing (warned by invariant), we could optionally fetch and inject here
      // For now, we rely on the warning.
    }

    return { members, creatorId };
  },

  /**
   * Get Effective Members for Payments (The "Truth" for splits).
   * Usually same as getMembers, but might filter out "observer" roles in future.
   */
  async getEffectiveMembersForPayments(tripId: string): Promise<TripMember[]> {
    const { members } = await this.getMembersWithCreator(tripId);
    // Future: Filter by permissions? For now, all members share costs.
    return members;
  },

  /**
   * Add a member to a trip.
   */
  async addMember(tripId: string, userId: string, role: string = 'member'): Promise<void> {
    const { error } = await supabase
      .from('trip_members')
      .insert({ trip_id: tripId, user_id: userId, role });

    if (error) throw error;
  },

  /**
   * Remove a member from a trip.
   */
  async removeMember(tripId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('trip_members')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId);

    if (error) throw error;
  },
};
