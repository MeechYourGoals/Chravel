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
      
      // Map database columns to TripChannel type
      const channels = (data || []).map(ch => ({
        id: ch.id,
        trip_id: ch.trip_id,
        name: ch.channel_name,
        slug: ch.channel_slug,
        description: ch.description,
        channel_type: ch.is_private ? 'role' : 'custom',
        role_filter: null,
        created_by: ch.created_by,
        created_at: ch.created_at,
        updated_at: ch.updated_at,
        is_archived: ch.is_archived || false
      }));
      
      return channels as TripChannel[];
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
          channel_name: request.name,
          channel_slug: slug,
          description: request.description,
          channel_type: request.channel_type,
          role_filter: request.role_filter || null,
          created_by: user.id,
          is_private: request.channel_type === 'role'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Map response to TripChannel
      const channel: TripChannel = {
        id: data.id,
        trip_id: data.trip_id,
        name: data.channel_name,
        slug: data.channel_slug,
        description: data.description,
        channel_type: data.is_private ? 'role' : 'custom',
        role_filter: null,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_archived: data.is_archived || false
      };
      
      return channel;
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
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map to ChannelMessage type
      const messages = (data || []).map(msg => ({
        id: msg.id,
        channel_id: msg.channel_id,
        trip_id: '', // Will be fetched from channel if needed
        user_id: msg.sender_id,
        content: msg.content,
        author_name: 'User', // Fetch from profiles if needed
        created_at: msg.created_at,
        updated_at: msg.edited_at || msg.created_at,
        edited_at: msg.edited_at,
        is_deleted: !!msg.deleted_at,
        deleted_at: msg.deleted_at
      }));

      return messages.reverse() as ChannelMessage[];
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
          sender_id: user.id,
          content: input.content,
          message_type: 'text',
          metadata: {}
        })
        .select()
        .single();

      if (error) throw error;
      
      // Map to ChannelMessage type
      const message: ChannelMessage = {
        id: data.id,
        channel_id: data.channel_id,
        trip_id: input.trip_id,
        user_id: data.sender_id,
        content: data.content,
        author_name: 'You',
        created_at: data.created_at,
        updated_at: data.created_at
      };
      
      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  }
}

export const eventChannelService = new EventChannelService();
