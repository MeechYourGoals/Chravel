import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Permission = 
  | 'view_trip'
  | 'edit_calendar'
  | 'edit_payments'
  | 'manage_members'
  | 'send_broadcasts'
  | 'view_media'
  | 'upload_media'
  | 'delete_media'
  | 'view_chat'
  | 'send_messages'
  | 'manage_settings';

export type PermissionLevel = 'none' | 'view' | 'edit' | 'admin';

interface PermissionMatrix {
  [key: string]: PermissionLevel;
}

interface TripMemberPermissions {
  userId: string;
  role: string;
  permissions: PermissionMatrix;
}

/**
 * useTripPermissions Hook
 * 
 * Manages granular permissions for trip members.
 * Supports role-based permissions with override capabilities.
 * 
 * Permission Levels:
 * - none: No access
 * - view: Read-only access
 * - edit: Can modify
 * - admin: Full control
 * 
 * Default Roles:
 * - admin: All permissions
 * - member: Limited permissions (view most, edit calendar/payments)
 * - viewer: View-only permissions
 */
export const useTripPermissions = (tripId: string, userId?: string) => {
  const [permissions, setPermissions] = useState<PermissionMatrix>({});
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Default permission sets by role
  const defaultPermissions: Record<string, PermissionMatrix> = {
    admin: {
      view_trip: 'admin',
      edit_calendar: 'admin',
      edit_payments: 'admin',
      manage_members: 'admin',
      send_broadcasts: 'admin',
      view_media: 'admin',
      upload_media: 'admin',
      delete_media: 'admin',
      view_chat: 'admin',
      send_messages: 'admin',
      manage_settings: 'admin'
    },
    member: {
      view_trip: 'view',
      edit_calendar: 'edit',
      edit_payments: 'edit',
      manage_members: 'none',
      send_broadcasts: 'edit',
      view_media: 'view',
      upload_media: 'edit',
      delete_media: 'none',
      view_chat: 'view',
      send_messages: 'edit',
      manage_settings: 'none'
    },
    viewer: {
      view_trip: 'view',
      edit_calendar: 'none',
      edit_payments: 'none',
      manage_members: 'none',
      send_broadcasts: 'none',
      view_media: 'view',
      upload_media: 'none',
      delete_media: 'none',
      view_chat: 'view',
      send_messages: 'none',
      manage_settings: 'none'
    }
  };

  useEffect(() => {
    if (!tripId || !userId) {
      setLoading(false);
      return;
    }

    loadPermissions();
  }, [tripId, userId]);

  const loadPermissions = async () => {
    if (!tripId || !userId) return;

    setLoading(true);
    try {
      // Get member role
      // @ts-ignore - permissions column not yet in generated types
      const { data: member, error } = await supabase
        .from('trip_members')
        .select('role, permissions')
        .eq('trip_id', tripId)
        .eq('user_id', userId)
        .single() as { data: { role: string; permissions?: Record<string, any> } | null; error: any };

      if (error || !member) {
        // Not a member - no permissions
        setPermissions({});
        setRole('');
        setLoading(false);
        return;
      }

      setRole(member.role || 'member');

      // Check if custom permissions exist (stored as JSONB)
      if (member.permissions && typeof member.permissions === 'object') {
        // Custom permissions override defaults
        const customPerms = member.permissions as PermissionMatrix;
        setPermissions(customPerms);
      } else {
        // Use default permissions for role
        const defaultPerms = defaultPermissions[member.role] || defaultPermissions.member;
        setPermissions(defaultPerms);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user has a specific permission at a minimum level
   */
  const hasPermission = (permission: Permission, minLevel: PermissionLevel = 'view'): boolean => {
    const userLevel = permissions[permission] || 'none';
    
    const levelHierarchy: Record<PermissionLevel, number> = {
      none: 0,
      view: 1,
      edit: 2,
      admin: 3
    };

    return levelHierarchy[userLevel] >= levelHierarchy[minLevel];
  };

  /**
   * Update permissions for a member
   */
  const updatePermissions = async (
    targetUserId: string,
    newPermissions: Partial<PermissionMatrix>
  ): Promise<boolean> => {
    if (!hasPermission('manage_members', 'admin')) {
      console.error('Insufficient permissions to update member permissions');
      return false;
    }

    try {
      // Get current permissions
      const { data: member } = await supabase
        .from('trip_members')
        .select('permissions')
        .eq('trip_id', tripId)
        .eq('user_id', targetUserId)
        .single();

      const currentPerms = (member?.permissions as PermissionMatrix) || {};
      const updatedPerms = { ...currentPerms, ...newPermissions };

      // @ts-ignore - permissions column not yet in generated types
      const { error } = await supabase
        .from('trip_members')
        .update({ permissions: updatedPerms } as any)
        .eq('trip_id', tripId)
        .eq('user_id', targetUserId);

      if (error) throw error;

      // Reload if updating own permissions
      if (targetUserId === userId) {
        await loadPermissions();
      }

      return true;
    } catch (error) {
      console.error('Error updating permissions:', error);
      return false;
    }
  };

  /**
   * Update member role (resets to default permissions for that role)
   */
  const updateRole = async (targetUserId: string, newRole: string): Promise<boolean> => {
    if (!hasPermission('manage_members', 'admin')) {
      console.error('Insufficient permissions to update member role');
      return false;
    }

    try {
      const defaultPerms = defaultPermissions[newRole] || defaultPermissions.member;

      // @ts-ignore - permissions column not yet in generated types
      const { error } = await supabase
        .from('trip_members')
        .update({
          role: newRole,
          permissions: defaultPerms
        } as any)
        .eq('trip_id', tripId)
        .eq('user_id', targetUserId);

      if (error) throw error;

      // Reload if updating own role
      if (targetUserId === userId) {
        await loadPermissions();
      }

      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      return false;
    }
  };

  return {
    permissions,
    role,
    loading,
    hasPermission,
    updatePermissions,
    updateRole,
    refreshPermissions: loadPermissions
  };
};
