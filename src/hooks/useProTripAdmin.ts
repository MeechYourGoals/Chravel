import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';

export interface AdminPermissions {
  can_manage_roles: boolean;
  can_manage_channels: boolean;
  can_designate_admins: boolean;
}

interface TripAdminPermissionsResult {
  is_admin: boolean;
  can_manage_roles: boolean;
  can_manage_channels: boolean;
  can_designate_admins: boolean;
}

/**
 * Hook to check Pro trip admin status and permissions.
 * Admin status is verified server-side via get_trip_admin_permissions() RPC
 * (which handles super-admin logic through is_super_admin()).
 */
export const useProTripAdmin = (tripId: string) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    if (!user?.id || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Demo mode: grant full admin UI (Stage C will isolate this to demo trips only)
      if (isDemoMode) {
        setIsAdmin(true);
        setPermissions({
          can_manage_roles: true,
          can_manage_channels: true,
          can_designate_admins: true,
        });
        setIsLoading(false);
        return;
      }

      // Server-side verification: RPC handles super-admin + trip-admin checks
      const { data, error } = await supabase.rpc('get_trip_admin_permissions', {
        p_trip_id: tripId,
      });

      if (error || !data) {
        setIsAdmin(false);
        setPermissions(null);
        return;
      }

      const result = data as unknown as TripAdminPermissionsResult;

      if (!result.is_admin) {
        setIsAdmin(false);
        setPermissions(null);
        return;
      }

      setIsAdmin(true);
      setPermissions({
        can_manage_roles: result.can_manage_roles,
        can_manage_channels: result.can_manage_channels,
        can_designate_admins: result.can_designate_admins,
      });
    } catch (err) {
      setIsAdmin(false);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tripId, isDemoMode]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  /**
   * Check if admin has a specific permission
   */
  const hasPermission = useCallback(
    (permission: keyof AdminPermissions): boolean => {
      if (!isAdmin || !permissions) return false;
      return permissions[permission] === true;
    },
    [isAdmin, permissions],
  );

  return {
    isAdmin,
    permissions,
    isLoading,
    hasPermission,
    refreshAdminStatus: checkAdminStatus,
  };
};
