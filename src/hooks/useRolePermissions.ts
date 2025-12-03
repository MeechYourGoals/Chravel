import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { FeaturePermissions, PermissionLevel } from '@/types/roleChannels';

/**
 * Hook to manage role-based permissions for Pro trips
 * Provides permission levels (View, Edit, Admin) and feature-specific access control
 */
export const useRolePermissions = (tripId: string) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('view');
  const [featurePermissions, setFeaturePermissions] = useState<FeaturePermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    // In Demo Mode, grant full permissions
    if (isDemoMode) {
      setPermissionLevel('admin');
      setFeaturePermissions({
        channels: { can_view: true, can_post: true, can_edit_messages: true, can_delete_messages: true, can_manage_members: true },
        calendar: { can_view: true, can_create_events: true, can_edit_events: true, can_delete_events: true },
        tasks: { can_view: true, can_create: true, can_assign: true, can_complete: true, can_delete: true },
        media: { can_view: true, can_upload: true, can_delete_own: true, can_delete_any: true },
        payments: { can_view: true, can_create: true, can_approve: true },
      });
      setIsLoading(false);
      return;
    }

    if (!user?.id || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      // Get user's primary role for this trip
      const { data: roleData, error } = await supabase
        .from('user_trip_roles')
        .select(`
          role_id,
          trip_roles:role_id (
            permission_level,
            feature_permissions
          )
        `)
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();

      if (error || !roleData?.trip_roles) {
        setPermissionLevel('view');
        setFeaturePermissions(null);
        return;
      }

      const role = roleData.trip_roles as any;
      setPermissionLevel(role.permission_level || 'view');
      setFeaturePermissions(role.feature_permissions || null);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissionLevel('view');
      setFeaturePermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tripId, isDemoMode]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  /**
   * Check if user can perform a specific action on a feature
   * @param feature - The feature to check (channels, calendar, tasks, etc.)
   * @param action - The action to check (can_view, can_create, can_edit, etc.)
   * @returns boolean indicating if the action is allowed
   */
  const canPerformAction = useCallback((
    feature: keyof FeaturePermissions,
    action: string
  ): boolean => {
    // In Demo Mode, always allow actions
    if (isDemoMode) return true;
    
    if (!featurePermissions) return false;
    const featurePerm = featurePermissions[feature] as any;
    return featurePerm?.[action] === true;
  }, [featurePermissions, isDemoMode]);

  /**
   * Check if user has admin-level permissions
   */
  const isAdmin = permissionLevel === 'admin';

  /**
   * Check if user can edit (admin or edit level)
   */
  const canEdit = permissionLevel === 'admin' || permissionLevel === 'edit';

  return {
    permissionLevel,
    featurePermissions,
    isLoading,
    canPerformAction,
    isAdmin,
    canEdit,
    refreshPermissions: loadPermissions
  };
};
