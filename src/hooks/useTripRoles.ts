import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TripRole } from '@/types/roleChannels';

interface UseTripRolesProps {
  tripId: string;
  enabled?: boolean;
}

export const useTripRoles = ({ tripId, enabled = true }: UseTripRolesProps) => {
  const [roles, setRoles] = useState<TripRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!enabled || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('trip_roles')
        .select(`
          *,
          trip_channels:trip_channels!required_role_id(
            id,
            channel_name,
            is_archived
          )
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Count members for each role
      const rolesWithCounts = await Promise.all(
        (data || []).map(async (role) => {
          const { count } = await supabase
            .from('user_trip_roles')
            .select('*', { count: 'exact', head: true })
            .eq('trip_id', tripId)
            .eq('role_id', role.id);

          return {
            id: role.id,
            tripId: role.trip_id,
            roleName: role.role_name,
            description: role.description || '',
            permissionLevel: role.permission_level as 'view' | 'edit' | 'admin',
            featurePermissions: role.feature_permissions as any,
            createdBy: role.created_by,
            createdAt: role.created_at,
            updatedAt: role.updated_at,
            memberCount: count || 0,
            channels: role.trip_channels || []
          };
        })
      );

      setRoles(rolesWithCounts);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, enabled]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!enabled || !tripId) return;

    const channel = supabase
      .channel(`trip_roles:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_roles',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          fetchRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, enabled, fetchRoles]);

  const createRole = useCallback(async (
    roleName: string,
    permissionLevel: 'view' | 'edit' | 'admin' = 'edit',
    featurePermissions?: any
  ) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc('create_trip_role' as any, {
        _trip_id: tripId,
        _role_name: roleName,
        _permission_level: permissionLevel,
        _feature_permissions: featurePermissions || null
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string; role_id?: string };
      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('✅ Role created successfully');
      await fetchRoles();
      
      return result;
    } catch (error) {
      console.error('Error creating role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create role');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [tripId, fetchRoles]);

  const deleteRole = useCallback(async (roleId: string) => {
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.rpc('delete_trip_role' as any, {
        _role_id: roleId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success('Role deleted successfully');
      await fetchRoles();
      
      return result;
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete role');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [fetchRoles]);

  return {
    roles,
    isLoading,
    isProcessing,
    createRole,
    deleteRole,
    refetch: fetchRoles
  };
};
