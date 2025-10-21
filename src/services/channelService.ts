import { supabase } from '../integrations/supabase/client';
import {
  TripAdmin,
  TripRole,
  UserRoleAssignment,
  TripChannel,
  ChannelMessage,
  CreateRoleRequest,
  AssignRoleRequest,
  CreateChannelRequest,
  SendMessageRequest
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
      const { data } = await supabase.from('trip_admins').select('id').eq('trip_id', tripId).eq('user_id', uid).single();
      return !!data;
    } catch { return false; }
  }

  async hasAdminPermission(tripId: string, permission: keyof AdminPermissions, userId?: string): Promise<boolean> {
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
      const permissions = data.permissions as AdminPermissions;
      return permissions?.[permission] === true;
    } catch { return false; }
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
        updatedAt: r.updated_at
      };
    } catch { return null; }
  }

  async createRole(request: CreateRoleRequest): Promise<TripRole | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase.from('trip_roles').insert({
        trip_id: request.tripId, role_name: request.roleName, description: request.description, created_by: user.id
      }).select().single();
      if (error) throw error;
      return { id: data.id, tripId: data.trip_id, roleName: data.role_name, description: data.description, createdBy: data.created_by, createdAt: data.created_at, updatedAt: data.updated_at };
    } catch { return null; }
  }

  async getRoles(tripId: string): Promise<TripRole[]> {
    try {
      const { data } = await supabase.from('trip_roles').select('*').eq('trip_id', tripId).order('created_at');
      return (data || []).map(d => ({ id: d.id, tripId: d.trip_id, roleName: d.role_name, description: d.description, createdBy: d.created_by, createdAt: d.created_at, updatedAt: d.updated_at }));
    } catch { return []; }
  }

  async deleteRole(roleId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('trip_roles').delete().eq('id', roleId);
      return !error;
    } catch { return false; }
  }

  async assignUserToRole(request: AssignRoleRequest & { isPrimary?: boolean }): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if assigning as primary role and if user already has a primary role
      if (request.isPrimary !== false) { // Default to primary if not specified
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
        is_primary: request.isPrimary !== false
      });
      return !error;
    } catch {
      return false;
    }
  }

  async revokeUserFromRole(tripId: string, userId: string, roleId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('user_trip_roles').delete().eq('trip_id', tripId).eq('user_id', userId).eq('role_id', roleId);
      return !error;
    } catch { return false; }
  }

  async getUserRoles(tripId: string, userId: string): Promise<TripRole[]> {
    try {
      const { data } = await supabase.from('user_trip_roles').select('role_id, trip_roles(*)').eq('trip_id', tripId).eq('user_id', userId);
      return (data || []).filter(d => d.trip_roles).map(d => {
        const r = d.trip_roles as any;
        return { id: r.id, tripId: r.trip_id, roleName: r.role_name, description: r.description, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at };
      });
    } catch { return []; }
  }

  async getRoleAssignments(tripId: string): Promise<UserRoleAssignment[]> {
    try {
      const { data } = await supabase.from('user_trip_roles').select('*, trip_roles(role_name)').eq('trip_id', tripId);
      return (data || []).map(d => ({ id: d.id, tripId: d.trip_id, userId: d.user_id, roleId: d.role_id, roleName: (d.trip_roles as any)?.role_name, assignedBy: d.assigned_by, assignedAt: d.assigned_at }));
    } catch { return []; }
  }

  async createChannel(request: CreateChannelRequest): Promise<TripChannel | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('trip_channels').insert({ trip_id: request.tripId, channel_name: request.channelName, channel_slug: request.channelSlug, description: request.description, required_role_id: request.requiredRoleId, is_private: request.isPrivate ?? true, created_by: user.id }).select().single();
      return { id: data.id, tripId: data.trip_id, channelName: data.channel_name, channelSlug: data.channel_slug, description: data.description, requiredRoleId: data.required_role_id, isPrivate: data.is_private, isArchived: data.is_archived, createdBy: data.created_by, createdAt: data.created_at, updatedAt: data.updated_at };
    } catch { return null; }
  }

  async createChannelWithRoles(
    tripId: string,
    channelName: string,
    channelSlug: string,
    roleIds: string[],
    description?: string
  ): Promise<TripChannel | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
          created_by: user.id
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
          role_id: roleId
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
        updatedAt: channelData.updated_at
      };
    } catch (error) {
      console.error('Error creating channel with roles:', error);
      return null;
    }
  }

  async getAccessibleChannels(tripId: string): Promise<TripChannel[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's PRIMARY role for the trip
      const primaryRole = await this.getUserPrimaryRole(tripId, user.id);
      if (!primaryRole) return [];

      // Find channels where user's primary role has access via channel_role_access
      const { data } = await supabase
        .from('trip_channels')
        .select(`
          *,
          trip_roles!inner(role_name),
          channel_role_access!inner(role_id)
        `)
        .eq('trip_id', tripId)
        .eq('is_archived', false)
        .eq('channel_role_access.role_id', primaryRole.id);

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
        updatedAt: d.updated_at
      }));
    } catch {
      return [];
    }
  }

  async sendMessage(request: SendMessageRequest & { 
    messageType?: 'regular' | 'broadcast';
    broadcastCategory?: 'chill' | 'logistics' | 'urgent';
  }): Promise<ChannelMessage | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const insertData: any = {
        channel_id: request.channelId,
        sender_id: user.id,
        content: request.content,
        message_type: request.messageType === 'broadcast' ? 'broadcast' : (request.messageType || 'text'),
        metadata: request.metadata || {}
      };
      
      if (request.messageType === 'broadcast' && request.broadcastCategory) {
        insertData.broadcast_category = request.broadcastCategory;
        insertData.metadata = { ...insertData.metadata, category: request.broadcastCategory };
      }
      
      const { data } = await supabase.from('channel_messages').insert(insertData).select().single();
      return { 
        id: data.id, 
        channelId: data.channel_id, 
        senderId: data.sender_id, 
        content: data.content, 
        messageType: data.message_type as 'text' | 'file' | 'system', 
        metadata: (data.metadata || {}) as Record<string, any>, 
        createdAt: data.created_at 
      };
    } catch { return null; }
  }

  async getMessages(channelId: string, limit = 50): Promise<ChannelMessage[]> {
    try {
      const { data } = await supabase.from('channel_messages').select('*').eq('channel_id', channelId).is('deleted_at', null).order('created_at').limit(limit);
      return (data || []).map(d => ({ id: d.id, channelId: d.channel_id, senderId: d.sender_id, content: d.content, messageType: d.message_type as 'text' | 'file' | 'system', metadata: (d.metadata || {}) as Record<string, any>, createdAt: d.created_at }));
    } catch { return []; }
  }

  subscribeToChannel(channelId: string, onMessage: (msg: ChannelMessage) => void): () => void {
    const ch = supabase.channel(`chan_${channelId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${channelId}` }, (p) => {
      onMessage({ id: p.new.id, channelId: p.new.channel_id, senderId: p.new.sender_id, content: p.new.content, messageType: p.new.message_type, metadata: p.new.metadata, createdAt: p.new.created_at });
    }).subscribe();
    return () => ch.unsubscribe();
  }

  async designateAdmin(
    tripId: string,
    userId: string,
    permissions?: Partial<AdminPermissions>
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if current user can designate admins
      const canDesignate = await this.hasAdminPermission(tripId, 'can_designate_admins', user.id);
      if (!canDesignate) {
        throw new Error('Insufficient permissions to designate admins');
      }

      const defaultPermissions: AdminPermissions = {
        can_manage_roles: true,
        can_manage_channels: true,
        can_designate_admins: false
      };

      const finalPermissions = { ...defaultPermissions, ...permissions };

      const { error } = await supabase.from('trip_admins').insert({
        trip_id: tripId,
        user_id: userId,
        granted_by: user.id,
        permissions: finalPermissions
      });

      return !error;
    } catch (error) {
      console.error('Error designating admin:', error);
      return false;
    }
  }

  async revokeAdmin(tripId: string, userId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
    permissions: Partial<AdminPermissions>
  ): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
        ...(currentAdmin.permissions as AdminPermissions),
        ...permissions
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

  async getAdmins(tripId: string): Promise<Array<{
    userId: string;
    permissions: AdminPermissions;
    grantedBy?: string;
    grantedAt: string;
  }>> {
    try {
      const { data } = await supabase
        .from('trip_admins')
        .select('*')
        .eq('trip_id', tripId);

      return (data || []).map(d => ({
        userId: d.user_id,
        permissions: d.permissions as AdminPermissions,
        grantedBy: d.granted_by,
        grantedAt: d.granted_at
      }));
    } catch {
      return [];
    }
  }
}

export const channelService = new ChannelService();
