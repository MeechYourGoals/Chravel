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

class ChannelService {
  async isAdmin(tripId: string, userId?: string): Promise<boolean> {
    try {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) return false;
      const { data } = await supabase.from('trip_admins').select('id').eq('trip_id', tripId).eq('user_id', uid).single();
      return !!data;
    } catch { return false; }
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

  async assignUserToRole(request: AssignRoleRequest): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { error } = await supabase.from('user_trip_roles').insert({ trip_id: request.tripId, user_id: request.userId, role_id: request.roleId, assigned_by: user.id });
      return !error;
    } catch { return false; }
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

  async getAccessibleChannels(tripId: string): Promise<TripChannel[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const roles = await this.getUserRoles(tripId, user.id);
      if (roles.length === 0) return [];
      const { data } = await supabase.from('trip_channels').select('*, trip_roles(role_name)').eq('trip_id', tripId).eq('is_archived', false).in('required_role_id', roles.map(r => r.id));
      return (data || []).map(d => ({ id: d.id, tripId: d.trip_id, channelName: d.channel_name, channelSlug: d.channel_slug, description: d.description, requiredRoleId: d.required_role_id, requiredRoleName: (d.trip_roles as any)?.role_name, isPrivate: d.is_private, isArchived: d.is_archived, createdBy: d.created_by, createdAt: d.created_at, updatedAt: d.updated_at }));
    } catch { return []; }
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
}

export const channelService = new ChannelService();
