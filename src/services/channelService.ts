import { supabase } from '../integrations/supabase/client';
import { 
  TripChannel, 
  ChannelMember, 
  ChannelMessage, 
  ChannelPermissions,
  CreateChannelRequest,
  UpdateChannelRequest,
  ChannelMessageInput,
  ChannelWithStats,
  ChannelListFilters,
  ChannelMemberWithProfile,
  ChannelInviteRequest
} from '../types/channels';

class ChannelService {
  /**
   * Get all channels for a trip
   */
  async getChannels(tripId: string, filters?: ChannelListFilters): Promise<ChannelWithStats[]> {
    try {
      // Check if tables exist first
      const { data: tableCheck, error: tableError } = await (supabase as any)
        .from('trip_channels')
        .select('id')
        .limit(1);

      if (tableError && tableError.message?.includes('relation "trip_channels" does not exist')) {
        console.warn('Channels tables not found. Migration may need to be applied.');
        return [];
      }

      let query = (supabase as any)
        .from('trip_channels')
        .select(`
          *,
          trip_channel_members(user_id),
          trip_chat_messages(id, created_at, content, author_name)
        `)
        .eq('trip_id', tripId)
        .eq('is_archived', false);

      if (filters?.channel_type && filters.channel_type !== 'all') {
        query = query.eq('channel_type', filters.channel_type);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      // Transform data to include stats
      const channelsWithStats: ChannelWithStats[] = data?.map(channel => {
        const members = channel.trip_channel_members || [];
        const messages = channel.trip_chat_messages || [];
        
        const lastMessage = messages.length > 0 
          ? messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
          : undefined;

        return {
          ...channel,
          stats: {
            channel_id: channel.id,
            member_count: members.length,
            message_count: messages.length,
            last_message_at: lastMessage?.created_at,
            unread_count: 0
          },
          member_count: members.length,
          last_message: lastMessage,
          is_unread: false
        };
      }) || [];

      return channelsWithStats;
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }

  /**
   * Get a single channel by ID
   */
  async getChannel(channelId: string): Promise<TripChannel | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('trip_channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (error) throw error;
      return data as TripChannel;
    } catch (error) {
      console.error('Error fetching channel:', error);
      return null;
    }
  }

  /**
   * Create a new channel
   */
  async createChannel(request: CreateChannelRequest): Promise<TripChannel | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const slug = request.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const { data, error } = await (supabase as any)
        .from('trip_channels')
        .insert({
          trip_id: request.trip_id,
          name: request.name,
          slug: slug,
          description: request.description,
          channel_type: request.channel_type,
          role_filter: request.role_filter || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as a member
      if (data) {
        await this.addMembers(data.id, [user.id]);
      }

      // Add specified members
      if (request.member_user_ids && request.member_user_ids.length > 0) {
        await this.addMembers(data.id, request.member_user_ids);
      }

      return data;
    } catch (error) {
      console.error('Error creating channel:', error);
      return null;
    }
  }

  /**
   * Update a channel
   */
  async updateChannel(channelId: string, updates: UpdateChannelRequest): Promise<TripChannel | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('trip_channels')
        .update(updates)
        .eq('id', channelId)
        .select()
        .single();

      if (error) throw error;
      return data as TripChannel;
    } catch (error) {
      console.error('Error updating channel:', error);
      return null;
    }
  }

  /**
   * Archive a channel
   */
  async archiveChannel(channelId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('trip_channels')
        .update({ is_archived: true })
        .eq('id', channelId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error archiving channel:', error);
      return false;
    }
  }

  /**
   * Get members of a channel
   */
  async getChannelMembers(channelId: string): Promise<ChannelMemberWithProfile[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('trip_channel_members')
        .select(`
          *,
          profile:profiles(id, email, full_name, avatar_url, role)
        `)
        .eq('channel_id', channelId);

      if (error) throw error;
      return (data || []) as ChannelMemberWithProfile[];
    } catch (error) {
      console.error('Error fetching channel members:', error);
      return [];
    }
  }

  /**
   * Add members to a channel
   */
  async addMembers(channelId: string, userIds: string[]): Promise<boolean> {
    try {
      const memberships = userIds.map(userId => ({
        channel_id: channelId,
        user_id: userId,
      }));

      const { error } = await (supabase as any)
        .from('trip_channel_members')
        .upsert(memberships, {
          onConflict: 'channel_id,user_id',
          ignoreDuplicates: true
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding channel members:', error);
      return false;
    }
  }

  /**
   * Remove a member from a channel
   */
  async removeMember(channelId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('trip_channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing channel member:', error);
      return false;
    }
  }

  /**
   * Get channel permissions for current user
   */
  async getChannelPermissions(channelId: string): Promise<ChannelPermissions | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if user is a member
      const { data: membership } = await (supabase as any)
        .from('trip_channel_members')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', user.id)
        .single();

      return {
        can_read: !!membership,
        can_write: !!membership,
        can_manage: false // TODO: Implement proper permission checking
      };
    } catch (error) {
      console.error('Error fetching channel permissions:', error);
      return null;
    }
  }

  /**
   * Get messages for a channel
   */
  async getChannelMessages(channelId: string, limit = 50, offset = 0): Promise<ChannelMessage[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('trip_chat_messages')
        .select('*')
        .eq('channel_id', channelId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return ((data || []) as ChannelMessage[]).reverse();
    } catch (error) {
      console.error('Error fetching channel messages:', error);
      return [];
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(input: ChannelMessageInput): Promise<ChannelMessage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Fetch user profile for display_name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single();

      const { data, error } = await (supabase as any)
        .from('trip_chat_messages')
        .insert({
          trip_id: input.trip_id,
          channel_id: input.channel_id,
          user_id: user.id,
          content: input.content,
          author_name: profile?.display_name || user.email || 'Anonymous',
          attachments: input.attachments || []
        })
        .select()
        .single();

      if (error) throw error;
      return data as ChannelMessage;
    } catch (error) {
      console.error('Error sending channel message:', error);
      return null;
    }
  }

  /**
   * Create default role-based channels for a trip
   */
  async createDefaultRoleChannels(tripId: string): Promise<boolean> {
    try {
      const defaultChannels = [
        { name: 'Team Announcements', role_filter: null, channel_type: 'custom' as const },
        { name: 'General Discussion', role_filter: null, channel_type: 'custom' as const },
      ];

      for (const channel of defaultChannels) {
        await this.createChannel({
          trip_id: tripId,
          name: channel.name,
          channel_type: channel.channel_type,
          role_filter: channel.role_filter,
        });
      }

      return true;
    } catch (error) {
      console.error('Error creating default channels:', error);
      return false;
    }
  }

  /**
   * Invite users to a channel
   */
  async inviteUsers(request: ChannelInviteRequest): Promise<boolean> {
    return await this.addMembers(request.channel_id, request.user_ids);
  }
}

export const channelService = new ChannelService();
