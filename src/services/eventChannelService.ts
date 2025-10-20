import { supabase } from '../integrations/supabase/client';
import { TripChannel, CreateChannelRequest, UpdateChannelRequest, ChannelMessage, ChannelMessageInput } from '../types/channels';

/**
 * Service for event/generic channels (not role-based)
 * Separate from role-based channels system
 */
class EventChannelService {
  async getChannels(tripId: string): Promise<TripChannel[]> {
    try {
      const { data, error } = await supabase
        .from('trip_channels')
        .select('*')
        .eq('trip_id', tripId)
        .eq('is_archived', false)
        .order('created_at');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      return [];
    }
  }

  async createChannel(request: CreateChannelRequest): Promise<TripChannel | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const slug = request.name.toLowerCase().replace(/\s+/g, '-');
      
      const { data, error } = await supabase
        .from('trip_channels')
        .insert({
          trip_id: request.trip_id,
          name: request.name,
          slug,
          description: request.description,
          channel_type: request.channel_type,
          role_filter: request.role_filter || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create channel:', error);
      return null;
    }
  }

  async updateChannel(channelId: string, updates: UpdateChannelRequest): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trip_channels')
        .update(updates)
        .eq('id', channelId);

      return !error;
    } catch (error) {
      console.error('Failed to update channel:', error);
      return false;
    }
  }

  async archiveChannel(channelId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('trip_channels')
        .update({ is_archived: true })
        .eq('id', channelId);

      return !error;
    } catch (error) {
      console.error('Failed to archive channel:', error);
      return false;
    }
  }

  async addMembers(channelId: string, userIds: string[]): Promise<boolean> {
    try {
      const members = userIds.map(userId => ({
        channel_id: channelId,
        user_id: userId
      }));

      const { error } = await supabase
        .from('channel_members')
        .insert(members);

      return !error;
    } catch (error) {
      console.error('Failed to add members:', error);
      return false;
    }
  }

  async removeMember(channelId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Failed to remove member:', error);
      return false;
    }
  }

  async createDefaultRoleChannels(tripId: string): Promise<boolean> {
    try {
      // Create default channels for common roles
      const defaultChannels = [
        { name: 'General', type: 'custom' as const },
        { name: 'Announcements', type: 'custom' as const }
      ];

      for (const channel of defaultChannels) {
        await this.createChannel({
          trip_id: tripId,
          name: channel.name,
          channel_type: channel.type
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to create default channels:', error);
      return false;
    }
  }

  async getChannelMessages(channelId: string, limit = 50, before?: string): Promise<ChannelMessage[]> {
    try {
      let query = supabase
        .from('channel_messages')
        .select('*')
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).reverse();
    } catch (error) {
      console.error('Failed to load messages:', error);
      return [];
    }
  }

  async sendMessage(input: ChannelMessageInput): Promise<ChannelMessage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: input.channel_id,
          trip_id: input.trip_id,
          user_id: user.id,
          content: input.content,
          attachments: input.attachments || []
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }
}

export const eventChannelService = new EventChannelService();
