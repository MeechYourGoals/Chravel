import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TripRole } from '@/types/roleChannels';
import { useDemoMode } from './useDemoMode';
import { MockRolesService } from '@/services/mockRolesService';
import { useAuth } from './useAuth';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';

interface UseTripRolesProps {
  tripId: string;
  enabled?: boolean;
}

async function fetchTripRoles(tripId: string, isDemoMode: boolean): Promise<TripRole[]> {
  if (isDemoMode) {
    const mockRoles = MockRolesService.getRolesForTrip(tripId);
    return mockRoles || [];
  }

  const { data, error } = await supabase
    .from('trip_roles')
    .select(
      `
      *,
      trip_channels:trip_channels!required_role_id(
        id,
        channel_name,
        is_archived
      )
    `,
    )
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const rolesWithCounts = await Promise.all(
    (data || []).map(async role => {
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
        featurePermissions: role.feature_permissions as TripRole['featurePermissions'],
        createdBy: role.created_by,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
        memberCount: count || 0,
        channels: role.trip_channels || [],
      };
    }),
  );

  return rolesWithCounts;
}

export const useTripRoles = ({ tripId, enabled = true }: UseTripRolesProps) => {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    data: roles = [],
    isLoading,
    refetch,
    isError,
    error,
  } = useQuery({
    queryKey: tripKeys.tripRoles(tripId),
    queryFn: () => fetchTripRoles(tripId, isDemoMode),
    enabled: enabled && !!tripId,
    staleTime: QUERY_CACHE_CONFIG.tripRoles.staleTime,
    gcTime: QUERY_CACHE_CONFIG.tripRoles.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.tripRoles.refetchOnWindowFocus,
  });

  useEffect(() => {
    if (isError && error) {
      toast.error('Failed to load roles');
    }
  }, [isError, error]);

  // Subscribe to realtime updates (skip in demo mode)
  useEffect(() => {
    if (!enabled || !tripId || isDemoMode) return;

    const channel = supabase
      .channel(`trip_roles:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_roles',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: tripKeys.tripRoles(tripId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, enabled, isDemoMode, queryClient]);

  const promoteInvalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: tripKeys.tripRoles(tripId) });
  }, [tripId, queryClient]);

  const createRole = useCallback(
    async (
      roleName: string,
      permissionLevel: 'view' | 'edit' | 'admin' = 'edit',
      featurePermissions?: TripRole['featurePermissions'],
    ) => {
      setIsProcessing(true);

      try {
        if (isDemoMode) {
          const existingRoles = MockRolesService.getRolesForTrip(tripId) || [];
          const newRole: TripRole = {
            id: `mock-role-${tripId}-${Date.now()}`,
            tripId,
            roleName,
            description: '',
            permissionLevel,
            featurePermissions: featurePermissions ?? {},
            createdBy: user?.id || 'demo-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            memberCount: 0,
          };

          const updatedRoles = [...existingRoles, newRole];
          localStorage.setItem(
            'demo_pro_trip_roles',
            JSON.stringify({
              ...JSON.parse(localStorage.getItem('demo_pro_trip_roles') || '{}'),
              [tripId]: updatedRoles,
            }),
          );

          toast.success('✅ Role created successfully');
          await promoteInvalidate();
          return { success: true, message: 'Role created', role_id: newRole.id };
        }

        const { data, error } = await supabase.rpc('create_trip_role' as 'create_trip_role', {
          _trip_id: tripId,
          _role_name: roleName,
          _permission_level: permissionLevel,
          _feature_permissions: featurePermissions || null,
        });

        if (error) throw error;

        const result = data as { success: boolean; message: string; role_id?: string };
        if (!result.success) throw new Error(result.message);

        toast.success('✅ Role created successfully');
        await promoteInvalidate();
        return result;
      } catch (err) {
        console.error('Error creating role:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to create role');
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [tripId, isDemoMode, user?.id, promoteInvalidate],
  );

  const deleteRole = useCallback(
    async (roleId: string) => {
      setIsProcessing(true);

      try {
        if (isDemoMode) {
          const existingRoles = MockRolesService.getRolesForTrip(tripId) || [];
          const updatedRoles = existingRoles.filter(r => r.id !== roleId);

          localStorage.setItem(
            'demo_pro_trip_roles',
            JSON.stringify({
              ...JSON.parse(localStorage.getItem('demo_pro_trip_roles') || '{}'),
              [tripId]: updatedRoles,
            }),
          );

          toast.success('Role deleted successfully');
          await promoteInvalidate();
          return { success: true, message: 'Role deleted' };
        }

        const { data, error } = await supabase.rpc('delete_trip_role' as 'delete_trip_role', {
          _role_id: roleId,
        });

        if (error) throw error;

        const result = data as { success: boolean; message: string };
        if (!result.success) throw new Error(result.message);

        toast.success('Role deleted successfully');
        await promoteInvalidate();
        return result;
      } catch (err) {
        console.error('Error deleting role:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete role');
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [tripId, isDemoMode, promoteInvalidate],
  );

  return {
    roles,
    isLoading,
    isProcessing,
    createRole,
    deleteRole,
    refetch,
  };
};
