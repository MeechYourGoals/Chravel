import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { roleNotificationService } from '@/services/roleNotificationService';

export interface RoleAssignment {
  id: string;
  trip_id: string;
  user_id: string;
  role_id: string;
  is_primary: boolean;
  assigned_at: string;
  assigned_by?: string;
  user_profile?: {
    display_name: string;
    avatar_url?: string;
  };
  role?: {
    id: string;
    roleName: string;
    permissionLevel: string;
  };
}

interface UseRoleAssignmentsProps {
  tripId: string;
  enabled?: boolean;
}

export const useRoleAssignments = ({ tripId, enabled = true }: UseRoleAssignmentsProps) => {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!enabled || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // 🆕 DEMO MODE: Load from localStorage
      if (isDemoMode) {
        const stored = localStorage.getItem('demo_pro_trip_assignments');
        const allAssignments = stored ? JSON.parse(stored) : {};
        setAssignments(allAssignments[tripId] || []);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_trip_roles')
        .select('*')
        .eq('trip_id', tripId)
        .order('assigned_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles and roles separately
      const assignmentsWithDetails = await Promise.all(
        (data || []).map(async (assignment) => {
          const [profileResult, roleResult] = await Promise.all([
            supabase
              .from('profiles_public')
              .select('display_name, avatar_url')
              .eq('user_id', assignment.user_id)
              .single(),
            supabase
              .from('trip_roles')
              .select('id, role_name, permission_level')
              .eq('id', assignment.role_id)
              .single()
          ]);

          return {
            ...assignment,
            user_profile: profileResult.data || undefined,
            role: roleResult.data ? {
              id: roleResult.data.id,
              roleName: roleResult.data.role_name,
              permissionLevel: roleResult.data.permission_level
            } : undefined
          };
        })
      );

      setAssignments(assignmentsWithDetails as RoleAssignment[]);
    } catch (error) {
      console.error('Error fetching role assignments:', error);
      toast.error('Failed to load role assignments');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, enabled, isDemoMode]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Subscribe to realtime updates (skip in demo mode)
  useEffect(() => {
    if (!enabled || !tripId || isDemoMode) return;

    const channel = supabase
      .channel(`user_trip_roles:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_trip_roles',
          filter: `trip_id=eq.${tripId}`
        },
        () => {
          fetchAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, enabled, isDemoMode, fetchAssignments]);

  const assignRole = useCallback(async (userId: string, roleId: string) => {
    setIsProcessing(true);
    
    try {
      // 🆕 DEMO MODE: Add to localStorage
      if (isDemoMode) {
        const stored = localStorage.getItem('demo_pro_trip_assignments');
        const allAssignments = stored ? JSON.parse(stored) : {};
        const tripAssignments = allAssignments[tripId] || [];
        
        const newAssignment: RoleAssignment = {
          id: `mock-assignment-${Date.now()}`,
          trip_id: tripId,
          user_id: userId,
          role_id: roleId,
          is_primary: true,
          assigned_at: new Date().toISOString(),
          assigned_by: user?.id,
        };
        
        allAssignments[tripId] = [...tripAssignments, newAssignment];
        localStorage.setItem('demo_pro_trip_assignments', JSON.stringify(allAssignments));
        
        toast.success('✅ Role assigned successfully');
        await fetchAssignments();
        return { success: true, message: 'Role assigned' };
      }

      const { data, error } = await supabase.rpc('assign_trip_role' as any, {
        _trip_id: tripId,
        _user_id: userId,
        _role_id: roleId,
        _set_as_primary: false
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (!result.success) {
        throw new Error(result.message);
      }

      // Get role name for notification
      const { data: roleData } = await supabase
        .from('trip_roles')
        .select('role_name')
        .eq('id', roleId)
        .single();

      // Send notification to the affected user (real-time will handle in-app)
      if (roleData && user?.id) {
        roleNotificationService.recordRoleChange({
          tripId,
          userId,
          newRole: roleData.role_name,
          changedBy: user.id,
          changeType: 'assigned'
        });
      }

      toast.success('✅ Role assigned successfully');
      await fetchAssignments();

      return result;
    } catch (error) {
      console.error('Error assigning role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign role');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [tripId, fetchAssignments, isDemoMode, user?.id]);

  const removeRole = useCallback(async (userId: string, roleId: string) => {
    setIsProcessing(true);
    
    try {
      // 🆕 DEMO MODE: Remove from localStorage
      if (isDemoMode) {
        const stored = localStorage.getItem('demo_pro_trip_assignments');
        const allAssignments = stored ? JSON.parse(stored) : {};
        const tripAssignments = allAssignments[tripId] || [];
        
        allAssignments[tripId] = tripAssignments.filter(
          (a: RoleAssignment) => !(a.user_id === userId && a.role_id === roleId)
        );
        localStorage.setItem('demo_pro_trip_assignments', JSON.stringify(allAssignments));
        
        toast.success('Role removed successfully');
        await fetchAssignments();
        return { success: true, message: 'Role removed' };
      }

      // Get role name before removal for notification
      const { data: roleData } = await supabase
        .from('trip_roles')
        .select('role_name')
        .eq('id', roleId)
        .single();

      const { data, error } = await supabase.rpc('remove_user_from_role' as any, {
        _trip_id: tripId,
        _user_id: userId,
        _role_id: roleId
      });

      if (error) throw error;

      const result = data as { success: boolean; message: string };
      if (!result.success) {
        throw new Error(result.message);
      }

      // Send notification to the affected user
      if (roleData && user?.id) {
        roleNotificationService.recordRoleChange({
          tripId,
          userId,
          oldRole: roleData.role_name,
          newRole: '',
          changedBy: user.id,
          changeType: 'removed'
        });
      }

      toast.success('Role removed successfully');
      await fetchAssignments();

      return result;
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove role');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [tripId, fetchAssignments, isDemoMode]);

  return {
    assignments,
    isLoading,
    isProcessing,
    assignRole,
    removeRole,
    refetch: fetchAssignments
  };
};
