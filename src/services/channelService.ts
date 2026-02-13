import { supabase } from '../integrations/supabase/client';
import {
  TripRole,
  UserRoleAssignment,
  TripChannel,
  ChannelMessage,
  CreateRoleRequest,
  AssignRoleRequest,
  CreateChannelRequest,
  SendMessageRequest,
} from '../types/roleChannels';

interface AdminPermissions {
  can_manage_roles: boolean;
  can_manage_channels: boolean;
  can_designate_admins: boolean;
}

class ChannelService {
  async isAdmin(tripId: string, userId?: string): Promise<boolean> {
    try {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) return false;
      const { data } = await supabase
        .from('trip_admins')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', uid)
        .single();
      return !!data;
    } catch {
      return false;
    }
  }

  async hasAdminPermission(
    tripId: string,
    permission: keyof AdminPermissions,
    userId?: string,
  ): Promise<boolean> {
    try {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) return false;
      const { data } = await supabase
        .from('trip_admins')
        .select('permissions')
        .eq('trip_id', tripId)
        .eq('user_id', uid)
        .single();
      if (!data) return false;
      const permissions = data.permissions as unknown as AdminPermissions;
      return permissions?.[permission] === true;
    } catch {
      return false;
    }
  }

  async getUserPrimaryRole(tripId: string, userId?: string): Promise<TripRole | null> {
    try {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) return null;

      const { data } = await supabase
        .from('user_trip_roles')
        .select('role_id, trip_roles(*)')
        .eq('trip_id', tripId)
        .eq('user_id', uid)
        .eq('is_primary', true)
        .single();

      if (!data?.trip_roles) return null;

      const r = data.trip_roles as any;
      return {
        id: r.id,
        tripId: r.trip_id,
        roleName: r.role_name,
        description: r.description,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    } catch {
      return null;
    }
  }

  async createRole(request: CreateRoleRequest): Promise<TripRole | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('trip_roles')
        .insert({
          trip_id: request.tripId,
          role_name: request.roleName,
          description: request.description,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        tripId: data.trip_id,
        roleName: data.role_name,
        description: data.description,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async getRoles(tripId: string): Promise<TripRole[]> {
    try {
      const { data } = await supabase
        .from('trip_roles')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at');
      return (data || []).map(d => ({
        id: d.id,
        tripId: d.trip_id,
        roleName: d.role_name,
        description: d.description,
        createdBy: d.created_by,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return [];
    }
  }

  async deleteRole(roleId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('trip_roles').delete().eq('id', roleId);
      return !error;
    } catch {
      return false;
    }
  }

  async assignUserToRole(request: AssignRoleRequest & { isPrimary?: boolean }): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if assigning as primary role and if user already has a primary role
      if (request.isPrimary !== false) {
        // Default to primary if not specified
        // Check for existing primary role
        const { data: existingPrimary } = await supabase
          .from('user_trip_roles')
          .select('id')
          .eq('trip_id', request.tripId)
          .eq('user_id', request.userId)
          .eq('is_primary', true)
          .single();

        if (existingPrimary) {
          // User already has a primary role, cannot assign another
          throw new Error('User already has a primary role for this trip');
        }
      }

      const { error } = await supabase.from('user_trip_roles').insert({
        trip_id: request.tripId,
        user_id: request.userId,
        role_id: request.roleId,
        assigned_by: user.id,
        is_primary: request.isPrimary !== false,
      });
      return !error;
    } catch {
      return false;
    }
  }

  async revokeUserFromRole(tripId: string, userId: string, roleId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_trip_roles')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .eq('role_id', roleId);
      return !error;
    } catch {
      return false;
    }
  }

  async getUserRoles(tripId: string, userId: string): Promise<TripRole[]> {
    try {
      const { data } = await supabase
        .from('user_trip_roles')
        .select('role_id, trip_roles(*)')
        .eq('trip_id', tripId)
        .eq('user_id', userId);
      return (data || [])
        .filter(d => d.trip_roles)
        .map(d => {
          const r = d.trip_roles as any;
          return {
            id: r.id,
            tripId: r.trip_id,
            roleName: r.role_name,
            description: r.description,
            createdBy: r.created_by,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          };
        });
    } catch {
      return [];
    }
  }

  async getRoleAssignments(tripId: string): Promise<UserRoleAssignment[]> {
    try {
      const { data } = await supabase
        .from('user_trip_roles')
        .select('*, trip_roles(role_name)')
        .eq('trip_id', tripId);
      return (data || []).map(d => ({
        id: d.id,
        tripId: d.trip_id,
        userId: d.user_id,
        roleId: d.role_id,
        roleName: (d.trip_roles as any)?.role_name,
        assignedBy: d.assigned_by,
        assignedAt: d.assigned_at,
      }));
    } catch {
      return [];
    }
  }

  async createChannel(request: CreateChannelRequest): Promise<TripChannel | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('trip_channels')
        .insert({
          trip_id: request.tripId,
          channel_name: request.channelName,
          channel_slug: request.channelSlug,
          description: request.description,
          required_role_id: request.requiredRoleId,
          is_private: request.isPrivate ?? true,
          created_by: user.id,
        })
        .select()
        .single();

      if (error || !data) return null;

      // Also populate channel_role_access junction table for multi-role support
      if (request.requiredRoleId) {
        await supabase.from('channel_role_access').insert({
          channel_id: data.id,
          role_id: request.requiredRoleId,
        });
      }

      // Ensure the creator is added as a channel member (DB trigger handles this too,
      // but we add it here for immediate consistency on the client side)
      if (user) {
        await supabase.from('channel_members').upsert(
          { channel_id: data.id, user_id: user.id },
          { onConflict: 'channel_id,user_id' },
        );
      }

      return {
        id: data.id,
        tripId: data.trip_id,
        channelName: data.channel_name,
        channelSlug: data.channel_slug,
        description: data.description,
        requiredRoleId: data.required_role_id,
        isPrivate: data.is_private,
        isArchived: data.is_archived,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async createChannelWithRoles(
    tripId: string,
    channelName: string,
    channelSlug: string,
    roleIds: string[],
    description?: string,
  ): Promise<TripChannel | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // 1. Create the channel (use first role as required_role_id for backward compatibility)
      const { data: channelData, error: channelError } = await supabase
        .from('trip_channels')
        .insert({
          trip_id: tripId,
          channel_name: channelName,
          channel_slug: channelSlug,
          description: description,
          required_role_id: roleIds.length > 0 ? roleIds[0] : null,
          is_private: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (channelError || !channelData) {
        throw channelError;
      }

      // 2. Grant access to all specified roles via channel_role_access table
      if (roleIds.length > 0) {
        const accessRecords = roleIds.map(roleId => ({
          channel_id: channelData.id,
          role_id: roleId,
        }));

        const { error: accessError } = await supabase
          .from('channel_role_access')
          .insert(accessRecords);

        if (accessError) {
          console.error('Error granting role access:', accessError);
          // Don't fail the whole operation, channel is created
        }
      }

      return {
        id: channelData.id,
        tripId: channelData.trip_id,
        channelName: channelData.channel_name,
        channelSlug: channelData.channel_slug,
        description: channelData.description,
        requiredRoleId: channelData.required_role_id,
        isPrivate: channelData.is_private,
        isArchived: channelData.is_archived,
        createdBy: channelData.created_by,
        createdAt: channelData.created_at,
        updatedAt: channelData.updated_at,
      };
    } catch (error) {
      console.error('Error creating channel with roles:', error);
      return null;
    }
  }

  async getAccessibleChannels(tripId: string): Promise<TripChannel[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // Check if user is trip creator or admin (always has full access to all channels)
      const { data: trip } = await supabase
        .from('trips')
        .select('created_by')
        .eq('id', tripId)
        .single();

      const isTripCreator = trip?.created_by === user.id;
      const isAdmin = await this.isAdmin(tripId, user.id);

      // If trip creator or admin, return all channels for this trip
      if (isTripCreator || isAdmin) {
        const { data: allChannels } = await supabase
          .from('trip_channels')
          .select('*, trip_roles(role_name)')
          .eq('trip_id', tripId)
          .eq('is_archived', false)
          .order('created_at');

        const channels = (allChannels || []).map(c => this.mapChannelData(c));

        // Compute member counts for admin-returned channels
        // Count from channel_members (explicit membership) first, then fall back to role-based count
        const channelIds = channels.map(c => c.id);
        if (channelIds.length > 0) {
          // Get explicit channel_members counts
          const { data: memberData } = await supabase
            .from('channel_members')
            .select('channel_id, user_id')
            .in('channel_id', channelIds);

          // Build a map of channel_id -> Set<user_id> for deduplication
          const channelMemberMap = new Map<string, Set<string>>();
          (memberData || []).forEach(row => {
            if (!channelMemberMap.has(row.channel_id)) {
              channelMemberMap.set(row.channel_id, new Set());
            }
            channelMemberMap.get(row.channel_id)!.add(row.user_id);
          });

          // Also count role-based members (from user_trip_roles + channel_role_access)
          for (const channel of channels) {
            const memberSet = channelMemberMap.get(channel.id) || new Set<string>();

            // Get roles that grant access to this channel
            const { data: roleAccessData } = await supabase
              .from('channel_role_access')
              .select('role_id')
              .eq('channel_id', channel.id);

            const roleIds = (roleAccessData || []).map(r => r.role_id);
            // Also include legacy required_role_id
            if (channel.requiredRoleId) {
              roleIds.push(channel.requiredRoleId);
            }

            if (roleIds.length > 0) {
              const uniqueRoleIds = [...new Set(roleIds)];
              const { data: roleMembers } = await supabase
                .from('user_trip_roles')
                .select('user_id')
                .eq('trip_id', tripId)
                .in('role_id', uniqueRoleIds);

              (roleMembers || []).forEach(r => memberSet.add(r.user_id));
            }

            channel.memberCount = memberSet.size;
          }
        }

        return channels;
      }

      // Get ALL user roles for the trip (not just primary)
      const userRoles = await this.getUserRoles(tripId, user.id);
      if (userRoles.length === 0) return [];

      const roleIds = userRoles.map(r => r.id);
      const uniqueChannels = new Map<string, TripChannel>();

      // Method 1: Find channels via channel_role_access junction table (multi-role support)
      const { data: junctionChannels } = await supabase
        .from('trip_channels')
        .select(
          `
          *,
          trip_roles(role_name),
          channel_role_access!inner(role_id)
        `,
        )
        .eq('trip_id', tripId)
        .eq('is_archived', false)
        .in('channel_role_access.role_id', roleIds);

      (junctionChannels || []).forEach(d => {
        if (!uniqueChannels.has(d.id)) {
          uniqueChannels.set(d.id, this.mapChannelData(d));
        }
      });

      // Method 2: Find channels via legacy required_role_id field (backward compatibility)
      const { data: legacyChannels } = await supabase
        .from('trip_channels')
        .select(
          `
          *,
          trip_roles!required_role_id(role_name)
        `,
        )
        .eq('trip_id', tripId)
        .eq('is_archived', false)
        .in('required_role_id', roleIds);

      (legacyChannels || []).forEach(d => {
        if (!uniqueChannels.has(d.id)) {
          uniqueChannels.set(d.id, this.mapChannelData(d));
        }
      });

      // Fetch member counts for all accessible channels
      // Must consider BOTH channel_role_access junction table AND legacy required_role_id
      const channelIds = Array.from(uniqueChannels.keys());
      if (channelIds.length > 0) {
        // Step 1: Get roles from channel_role_access junction table
        const { data: junctionRoles } = await supabase
          .from('channel_role_access')
          .select('channel_id, role_id')
          .in('channel_id', channelIds);

        // Step 2: Build a map of channel_id -> Set of role_ids (including legacy required_role_id)
        const channelRoleMap = new Map<string, Set<string>>();

        // Initialize with legacy required_role_id from each channel
        for (const [channelId, channel] of uniqueChannels) {
          const roleSet = new Set<string>();
          // Include legacy required_role_id if present
          if (channel.requiredRoleId) {
            roleSet.add(channel.requiredRoleId);
          }
          channelRoleMap.set(channelId, roleSet);
        }

        // Add roles from junction table
        if (junctionRoles) {
          junctionRoles.forEach(cr => {
            const roleSet = channelRoleMap.get(cr.channel_id);
            if (roleSet) {
              roleSet.add(cr.role_id);
            }
          });
        }

        // Step 3: For each channel, count DISTINCT users with any of its granted roles
        // A user with multiple roles granting access should only be counted once
        for (const [channelId, roleSet] of channelRoleMap) {
          if (roleSet.size === 0) continue;

          const roleArray = Array.from(roleSet);
          // Fetch user_ids instead of just counting rows to allow deduplication
          const { data: userRoleData } = await supabase
            .from('user_trip_roles')
            .select('user_id')
            .eq('trip_id', tripId)
            .in('role_id', roleArray);

          // Use a Set to count distinct users (handles multi-role users correctly)
          const distinctUserIds = new Set((userRoleData || []).map(row => row.user_id));

          const channel = uniqueChannels.get(channelId);
          if (channel) {
            channel.memberCount = distinctUserIds.size;
          }
        }
      }

      return Array.from(uniqueChannels.values());
    } catch {
      return [];
    }
  }

  private mapChannelData(d: any): TripChannel {
    return {
      id: d.id,
      tripId: d.trip_id,
      channelName: d.channel_name,
      channelSlug: d.channel_slug,
      description: d.description,
      requiredRoleId: d.required_role_id,
      requiredRoleName: (d.trip_roles as any)?.role_name,
      isPrivate: d.is_private,
      isArchived: d.is_archived,
      memberCount: d.member_count || 0,
      createdBy: d.created_by,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    };
  }

  async sendMessage(
    request: SendMessageRequest & {
      messageType?: 'regular' | 'broadcast';
      broadcastCategory?: 'chill' | 'logistics' | 'urgent';
    },
  ): Promise<ChannelMessage> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw Object.assign(new Error('You must be logged in to send messages.'), {
        code: 'AUTH_REQUIRED',
      });
    }

    if (!request.channelId) {
      throw Object.assign(new Error('No channel selected.'), {
        code: 'MISSING_CHANNEL',
      });
    }

    const insertData: Record<string, unknown> = {
      channel_id: request.channelId,
      sender_id: user.id,
      content: request.content,
      message_type:
        request.messageType === 'broadcast' ? 'broadcast' : request.messageType || 'text',
      metadata: request.metadata || {},
    };

    if (request.messageType === 'broadcast' && request.broadcastCategory) {
      insertData.broadcast_category = request.broadcastCategory;
      insertData.metadata = { ...(insertData.metadata as Record<string, unknown>), category: request.broadcastCategory };
    }

    const { data, error } = await supabase
      .from('channel_messages')
      .insert(insertData as any)
      .select()
      .single();

    if (error) {
      console.error('[channelService.sendMessage] Supabase error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned after inserting message.');
    }

    return {
      id: data.id,
      channelId: data.channel_id,
      senderId: data.sender_id,
      content: data.content,
      messageType: data.message_type as 'text' | 'file' | 'system',
      metadata: (data.metadata || {}) as Record<string, unknown>,
      createdAt: data.created_at,
    };
  }

  async getMessages(channelId: string, limit = 50): Promise<ChannelMessage[]> {
    try {
      // Join with profiles to get sender names
      const { data } = await supabase
        .from('channel_messages')
        .select(
          `
          *,
          profiles!channel_messages_sender_id_fkey(display_name, avatar_url)
        `,
        )
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at')
        .limit(limit);

      return (data || []).map(d => {
        const profile = d.profiles as any;
        return {
          id: d.id,
          channelId: d.channel_id,
          senderId: d.sender_id,
          senderName: profile?.display_name || 'Unknown',
          senderAvatar: profile?.avatar_url,
          content: d.content,
          messageType: d.message_type as 'text' | 'file' | 'system',
          metadata: (d.metadata || {}) as Record<string, any>,
          createdAt: d.created_at,
        };
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async getAllChannelsForAdmin(tripId: string): Promise<TripChannel[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      // Check if user is admin
      const isAdmin = await this.isAdmin(tripId, user.id);
      if (!isAdmin) return [];

      const { data } = await supabase
        .from('trip_channels')
        .select(
          `
          *,
          trip_roles(role_name)
        `,
        )
        .eq('trip_id', tripId)
        .eq('is_archived', false)
        .order('created_at');

      return (data || []).map(d => ({
        id: d.id,
        tripId: d.trip_id,
        channelName: d.channel_name,
        channelSlug: d.channel_slug,
        description: d.description,
        requiredRoleId: d.required_role_id,
        requiredRoleName: (d.trip_roles as any)?.role_name,
        isPrivate: d.is_private,
        isArchived: d.is_archived,
        createdBy: d.created_by,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return [];
    }
  }

  subscribeToChannel(
    channelId: string,
    onMessage: (msg: ChannelMessage) => void,
    onMessageDeleted?: (messageId: string) => void,
  ): () => void {
    const ch = supabase
      .channel(`chan_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        p => {
          onMessage({
            id: p.new.id,
            channelId: p.new.channel_id,
            senderId: p.new.sender_id,
            content: p.new.content,
            messageType: p.new.message_type,
            metadata: p.new.metadata,
            createdAt: p.new.created_at,
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'channel_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        p => {
          // If message was deleted, notify the callback
          if (p.new.deleted_at && onMessageDeleted) {
            onMessageDeleted(p.new.id as string);
          }
        },
      )
      .subscribe();
    return () => ch.unsubscribe();
  }

  async designateAdmin(
    tripId: string,
    userId: string,
    permissions?: Partial<AdminPermissions>,
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if current user can designate admins
      const canDesignate = await this.hasAdminPermission(tripId, 'can_designate_admins', user.id);
      if (!canDesignate) {
        throw new Error('Insufficient permissions to designate admins');
      }

      const defaultPermissions: AdminPermissions = {
        can_manage_roles: true,
        can_manage_channels: true,
        can_designate_admins: false,
      };

      const finalPermissions = { ...defaultPermissions, ...permissions };

      const { error } = await supabase.from('trip_admins').insert({
        trip_id: tripId,
        user_id: userId,
        granted_by: user.id,
        permissions: finalPermissions,
      });

      return !error;
    } catch (error) {
      console.error('Error designating admin:', error);
      return false;
    }
  }

  async revokeAdmin(tripId: string, userId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if current user can designate (and revoke) admins
      const canRevoke = await this.hasAdminPermission(tripId, 'can_designate_admins', user.id);
      if (!canRevoke) {
        throw new Error('Insufficient permissions to revoke admin access');
      }

      const { error } = await supabase
        .from('trip_admins')
        .delete()
        .eq('trip_id', tripId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error revoking admin:', error);
      return false;
    }
  }

  async updateAdminPermissions(
    tripId: string,
    userId: string,
    permissions: Partial<AdminPermissions>,
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if current user can designate admins
      const canUpdate = await this.hasAdminPermission(tripId, 'can_designate_admins', user.id);
      if (!canUpdate) {
        throw new Error('Insufficient permissions to update admin permissions');
      }

      // Get current permissions
      const { data: currentAdmin } = await supabase
        .from('trip_admins')
        .select('permissions')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single();

      if (!currentAdmin) {
        throw new Error('Admin not found');
      }

      const updatedPermissions = {
        ...(currentAdmin.permissions as unknown as AdminPermissions),
        ...permissions,
      };

      const { error } = await supabase
        .from('trip_admins')
        .update({ permissions: updatedPermissions })
        .eq('trip_id', tripId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error updating admin permissions:', error);
      return false;
    }
  }

  async getAdmins(tripId: string): Promise<
    Array<{
      userId: string;
      permissions: AdminPermissions;
      grantedBy?: string;
      grantedAt: string;
    }>
  > {
    try {
      const { data } = await supabase.from('trip_admins').select('*').eq('trip_id', tripId);

      return (data || []).map(d => ({
        userId: d.user_id,
        permissions: d.permissions as unknown as AdminPermissions,
        grantedBy: d.granted_by,
        grantedAt: d.granted_at,
      }));
    } catch {
      return [];
    }
  }
}

export const channelService = new ChannelService();
