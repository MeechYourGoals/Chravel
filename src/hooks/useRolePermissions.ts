import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { FeaturePermissions, PermissionLevel } from '@/types/roleChannels';
import { isSuperAdminEmail } from '@/utils/isSuperAdmin';

/**
 * Hook to manage role-based permissions for Pro trips
 * Provides permission levels (View, Edit, Admin) and feature-specific access control
 */
export const useRolePermissions = (tripId: string) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('view');
  const [featurePermissions, setFeaturePermissions] = useState<FeaturePermissions | null>(null);
  const [isTripMember, setIsTripMember] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadPermissions = useCallback(async () => {
    // Super admin bypass — synchronous, no async queries needed
    if (isSuperAdminEmail(user?.email)) {
      setPermissionLevel('admin');
      setIsTripMember(true);
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

    // In Demo Mode, grant full permissions
    if (isDemoMode) {
      setPermissionLevel('admin');
      setIsTripMember(true);
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
      // First, check if user is a trip member (for consumer trips)
      const { data: memberData } = await supabase
        .from('trip_members')
        .select('id, role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .maybeSingle();

      const isUserTripMember = !!memberData;
      setIsTripMember(isUserTripMember);

      // Get user's primary role for this trip (Pro trips)
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
        .maybeSingle();

      if (error || !roleData?.trip_roles) {
        // No Pro trip role - but if user is a trip member, grant default edit permissions
        if (isUserTripMember) {
          setPermissionLevel('edit');
          // Grant default permissions for consumer trip members
          setFeaturePermissions({
            channels: { can_view: true, can_post: true, can_edit_messages: true, can_delete_messages: false, can_manage_members: false },
            calendar: { can_view: true, can_create_events: true, can_edit_events: true, can_delete_events: true },
            tasks: { can_view: true, can_create: true, can_assign: true, can_complete: true, can_delete: true },
            media: { can_view: true, can_upload: true, can_delete_own: true, can_delete_any: false },
            payments: { can_view: true, can_create: true, can_approve: false },
          });
        } else {
          setPermissionLevel('view');
          setFeaturePermissions(null);
        }
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
    
    // If user is a trip member but no explicit permissions, allow basic actions
    if (isTripMember && !featurePermissions) {
      // Default consumer trip permissions - allow most actions for members
      const defaultAllowedActions = [
        'can_view', 'can_create', 'can_edit', 
        'can_create_events', 'can_edit_events', 'can_delete_events',
        'can_post', 'can_upload', 'can_complete', 'can_assign', 'can_delete'
      ];
      return defaultAllowedActions.includes(action);
    }
    
    if (!featurePermissions) return false;
    const featurePerm = featurePermissions[feature] as any;
    return featurePerm?.[action] === true;
  }, [featurePermissions, isDemoMode, isTripMember]);

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
    isTripMember,
    isLoading,
    canPerformAction,
    isAdmin,
    canEdit,
    refreshPermissions: loadPermissions
  };
};
