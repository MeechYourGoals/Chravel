import { supabase } from '../integrations/supabase/client';
import { TripChannel, ChannelMessage } from '@/types/roleChannels';

// Re-export types for compatibility
export type RoleChannel = {
  id: string;
  tripId: string;
  roleName: string;
  memberCount: number;
  createdAt: string;
  createdBy: string;
}

export type RoleChannelMessage = {
  id: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
}

class RoleChannelService {
  /**
   * Create a new role-specific channel
   * NOTE: Usually handled automatically by DB trigger on role creation
   */
  async createRoleChannel(tripId: string, roleName: string): Promise<RoleChannel | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const channelSlug = roleName.toLowerCase().replace(/\s+/g, '-');

      const { data, error } = await supabase
        .from('trip_channels')
        .insert({
          trip_id: tripId,
          channel_name: roleName,
          channel_slug: channelSlug,
          is_private: true,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        tripId: data.trip_id,
        roleName: data.channel_name,
        memberCount: 0,
        createdAt: data.created_at,
        createdBy: data.created_by
      };
    } catch (error) {
      console.error('Failed to create role channel:', error);
      return null;
    }
  }

  /**
   * Get all role channels for a trip
   */
  async getRoleChannels(tripId: string): Promise<RoleChannel[]> {
    try {
      const { data, error } = await supabase
        .from('trip_channels')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        tripId: d.trip_id,
        roleName: d.channel_name,
        memberCount: 0, // TODO: Calculate from roster
        createdAt: d.created_at,
        createdBy: d.created_by
      }));
    } catch (error) {
      console.error('Failed to get role channels:', error);
      return [];
    }
  }

  /**
   * Delete a role channel
   */
  async deleteChannel(channelId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trip_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete channel:', error);
      return false;
    }
  }

  /**
   * Check if user can access a channel based on their role(s)
   * @param channel The channel to check access for
   * @param userRole The user's primary role (string)
   * @param userRoles Optional array of all user roles (for multi-role support)
   */
  canUserAccessChannel(
    channel: RoleChannel,
    userRole: string,
    userRoles?: string[]
  ): boolean {
    // Admin roles always have access to all channels
    const adminRoles = ['admin', 'manager', 'tour manager', 'owner', 'creator'];
    if (adminRoles.includes(userRole.toLowerCase())) {
      return true;
    }

    // If userRoles array is provided, check if any of the user's roles match
    if (userRoles && userRoles.length > 0) {
      const normalizedUserRoles = userRoles.map(r => r.toLowerCase().trim());
      const channelRole = channel.roleName.toLowerCase().trim();

      // Check if any user role matches the channel role
      if (normalizedUserRoles.some(r => r === channelRole)) {
        return true;
      }

      // Check if user has an admin role in their roles array
      if (normalizedUserRoles.some(r => adminRoles.includes(r))) {
        return true;
      }
    }

    // Single role check - normalize both strings for comparison
    const normalizedUserRole = userRole.toLowerCase().trim();
    const normalizedChannelRole = channel.roleName.toLowerCase().trim();

    // Direct match
    if (normalizedUserRole === normalizedChannelRole) {
      return true;
    }

    // Check for general/public channels that everyone can access
    const publicChannelNames = ['general', 'announcements', 'all', 'everyone', 'public'];
    if (publicChannelNames.includes(normalizedChannelRole)) {
      return true;
    }

    return false;
  }

  /**
   * Get channels accessible to a user based on their roles
   */
  async getUserAccessibleChannels(
    tripId: string,
    userId: string
  ): Promise<RoleChannel[]> {
    try {
      // First, get the user's roles for this trip
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_trip_roles')
        .select(`
          role_id,
          trip_roles (
            id,
            role_name
          )
        `)
        .eq('trip_id', tripId)
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      // Extract role names from the user's assignments
      const userRoleNames = (userRoles || [])
        .map((r: any) => r.trip_roles?.role_name)
        .filter(Boolean) as string[];

      // Get all channels for the trip
      const allChannels = await this.getRoleChannels(tripId);

      // Filter channels based on user's roles
      return allChannels.filter(channel =>
        this.canUserAccessChannel(channel, userRoleNames[0] || 'member', userRoleNames)
      );
    } catch (error) {
      console.error('Error getting user accessible channels:', error);
      return [];
    }
  }

  /**
   * Send message to role channel
   */
  async sendChannelMessage(channelId: string, content: string): Promise<RoleChannelMessage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        channelId: data.channel_id,
        senderId: data.sender_id,
        content: data.content,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Failed to send channel message:', error);
      return null;
    }
  }

  /**
   * Get messages for a role channel
   */
  async getChannelMessages(channelId: string): Promise<RoleChannelMessage[]> {
    try {
      const { data, error } = await supabase
        .from('channel_messages')
        .select(`
          *,
          sender:sender_id (
            id,
            raw_user_meta_data
          ),
          profiles!sender_id (
            display_name,
            avatar_url
          )
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        channelId: d.channel_id,
        senderId: d.sender_id,
        senderName: d.profiles?.display_name || d.sender?.raw_user_meta_data?.full_name || 'Anonymous',
        senderAvatar: d.profiles?.avatar_url || d.sender?.raw_user_meta_data?.avatar_url,
        content: d.content,
        createdAt: d.created_at
      }));
    } catch (error) {
      console.error('Failed to get channel messages:', error);
      return [];
    }
  }

  /**
   * Subscribe to new messages in a channel
   */
  subscribeToChannel(
    channelId: string,
    onMessage: (message: RoleChannelMessage) => void
  ) {
    const subscription = supabase
      .channel(`channel_messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`
        },
        (payload) => {
          onMessage({
            id: payload.new.id,
            channelId: payload.new.channel_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            createdAt: payload.new.created_at
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const roleChannelService = new RoleChannelService();
