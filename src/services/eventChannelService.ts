import { supabase } from '../integrations/supabase/client';
import {
  TripChannel,
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelMessage,
  ChannelMessageInput,
} from '../types/channels';
import { toAppChannel, toAppChannelMessage } from '@/lib/adapters/channelAdapter';

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

      return (data || []).map(ch => ({
        ...toAppChannel(ch),
        channel_type: ch.is_private ? ('role' as const) : ('custom' as const),
      }));
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      return [];
    }
  }

  async createChannel(request: CreateChannelRequest): Promise<TripChannel | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
          is_private: request.channel_type === 'role',
        })
        .select()
        .single();

      if (error) throw error;

      // Ensure the creator is added as a channel member
      // (DB trigger also handles this, but adding here for immediate consistency)
      await supabase
        .from('channel_members')
        .upsert({ channel_id: data.id, user_id: user.id }, { onConflict: 'channel_id,user_id' });

      return {
        ...toAppChannel(data),
        channel_type: data.is_private ? ('role' as const) : ('custom' as const),
      };
    } catch (error) {
      console.error('Failed to create channel:', error);
      return null;
    }
  }

  async updateChannel(channelId: string, updates: UpdateChannelRequest): Promise<boolean> {
    try {
      const { error } = await supabase.from('trip_channels').update(updates).eq('id', channelId);

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
        user_id: userId,
      }));

      const { error } = await supabase.from('channel_members').insert(members);

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
        { name: 'Announcements', type: 'custom' as const },
      ];

      for (const channel of defaultChannels) {
        await this.createChannel({
          trip_id: tripId,
          name: channel.name,
          channel_type: channel.type,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to create default channels:', error);
      return false;
    }
  }

  async getChannelMessages(
    channelId: string,
    limit = 50,
    before?: string,
  ): Promise<ChannelMessage[]> {
    try {
      let query = supabase
        .from('channel_messages')
        .select(
          `
          *,
          profiles!channel_messages_sender_id_fkey(display_name)
        `,
        )
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;
      if (error) throw error;

      const messages = (data || []).map(msg => {
        const authorName =
          (msg.profiles as { display_name?: string } | null)?.display_name?.trim() || 'User';
        return toAppChannelMessage(msg, { authorName });
      });

      return messages.reverse();
    } catch (error) {
      console.error('Failed to load messages:', error);
      return [];
    }
  }

  async sendMessage(input: ChannelMessageInput): Promise<ChannelMessage> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw Object.assign(new Error('You must be logged in to send messages.'), {
        code: 'AUTH_REQUIRED',
      });
    }

    if (!input.channel_id) {
      throw Object.assign(new Error('No channel selected.'), {
        code: 'MISSING_CHANNEL',
      });
    }

    const { data, error } = await supabase
      .from('channel_messages')
      .insert({
        channel_id: input.channel_id,
        sender_id: user.id,
        content: input.content,
        message_type: 'text',
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error('[eventChannelService.sendMessage] Supabase error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned after inserting message.');
    }

    return toAppChannelMessage(data, {
      authorName: 'You',
      tripId: input.trip_id,
    });
  }
}

export const eventChannelService = new EventChannelService();
