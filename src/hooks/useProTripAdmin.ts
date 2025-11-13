import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AdminPermissions {
  can_manage_roles: boolean;
  can_manage_channels: boolean;
  can_designate_admins: boolean;
}

/**
 * Hook to check Pro trip admin status and permissions
 */
export const useProTripAdmin = (tripId: string) => {
  const { user } = useAuth();
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

      // Check if user is trip admin
      const { data: adminData, error } = await supabase
        .from('trip_admins')
        .select('permissions')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();

      if (error || !adminData) {
        setIsAdmin(false);
        setPermissions(null);
        return;
      }

      setIsAdmin(true);
      setPermissions(adminData.permissions as any as AdminPermissions);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tripId]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  /**
   * Check if admin has a specific permission
   */
  const hasPermission = useCallback((permission: keyof AdminPermissions): boolean => {
    if (!isAdmin || !permissions) return false;
    return permissions[permission] === true;
  }, [isAdmin, permissions]);

  return {
    isAdmin,
    permissions,
    isLoading,
    hasPermission,
    refreshAdminStatus: checkAdminStatus
  };
};
