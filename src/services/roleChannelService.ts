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
};

export type RoleChannelMessage = {
  id: string;
  channelId: string;
  senderId: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  createdAt: string;
};

class RoleChannelService {
  /**
   * Create a new role-specific channel
   * NOTE: Usually handled automatically by DB trigger on role creation
   */
  async createRoleChannel(tripId: string, roleName: string): Promise<RoleChannel | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const channelSlug = roleName.toLowerCase().replace(/\s+/g, '-');

      const { data, error } = await supabase
        .from('trip_channels')
        .insert({
          trip_id: tripId,
          channel_name: roleName,
          channel_slug: channelSlug,
          is_private: true,
          created_by: user.id,
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
        createdBy: data.created_by,
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
        createdBy: d.created_by,
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
      const { error } = await supabase.from('trip_channels').delete().eq('id', channelId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete channel:', error);
      return false;
    }
  }

  /**
   * Check if user can access a channel (based on their role)
   */
  canUserAccessChannel(channel: RoleChannel, userRole: string): boolean {
    // Ideally this check should happen on the server/RLS
    // For client-side, we might want to check if the user has the role
    // matching the channel name.
    // However, since we now support multi-role, the caller should probably pass
    // the user's roles.
    // For now, simple check:
    return true; // We rely on RLS and filtering in useRoleChannels
  }

  /**
   * Send message to role channel
   */
  async sendChannelMessage(channelId: string, content: string): Promise<RoleChannelMessage | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: channelId,
          sender_id: user.id,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        channelId: data.channel_id,
        senderId: data.sender_id,
        content: data.content,
        createdAt: data.created_at,
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
        .select(
          `
          *,
          sender:sender_id (
            id,
            raw_user_meta_data
          ),
          profiles!sender_id (
            display_name,
            avatar_url
          )
        `,
        )
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        channelId: d.channel_id,
        senderId: d.sender_id,
        senderName:
          d.profiles?.display_name || d.sender?.raw_user_meta_data?.full_name || 'Anonymous',
        senderAvatar: d.profiles?.avatar_url || d.sender?.raw_user_meta_data?.avatar_url,
        content: d.content,
        createdAt: d.created_at,
      }));
    } catch (error) {
      console.error('Failed to get channel messages:', error);
      return [];
    }
  }

  /**
   * Subscribe to new messages in a channel
   */
  subscribeToChannel(channelId: string, onMessage: (message: RoleChannelMessage) => void) {
    const subscription = supabase
      .channel(`channel_messages:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        payload => {
          onMessage({
            id: payload.new.id,
            channelId: payload.new.channel_id,
            senderId: payload.new.sender_id,
            content: payload.new.content,
            createdAt: payload.new.created_at,
          });
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const roleChannelService = new RoleChannelService();
