import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { notificationService } from '@/services/notificationService';

interface RoleChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: {
    id: string;
    trip_id: string;
    user_id: string;
    role_id: string;
    is_primary: boolean;
    assigned_at: string;
  };
  old?: {
    id: string;
    trip_id: string;
    user_id: string;
    role_id: string;
    is_primary: boolean;
    assigned_at: string;
  };
}

interface UseRoleChangeNotificationsProps {
  tripId?: string;
  enabled?: boolean;
}

/**
 * Hook to listen for real-time role change notifications.
 * Notifies users when their role is updated by an admin.
 */
export const useRoleChangeNotifications = ({
  tripId,
  enabled = true
}: UseRoleChangeNotificationsProps = {}) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const lastNotificationRef = useRef<string | null>(null);

  const fetchRoleName = useCallback(async (roleId: string): Promise<string | null> => {
    if (!roleId) return null;

    try {
      const { data, error } = await supabase
        .from('trip_roles')
        .select('role_name')
        .eq('id', roleId)
        .single();

      if (error) throw error;
      return data?.role_name || null;
    } catch (error) {
      console.error('Error fetching role name:', error);
      return null;
    }
  }, []);

  const fetchTripName = useCallback(async (tripIdToFetch: string): Promise<string | null> => {
    if (!tripIdToFetch) return null;

    try {
      const { data, error } = await supabase
        .from('trips')
        .select('title')
        .eq('id', tripIdToFetch)
        .single();

      if (error) throw error;
      return data?.title || 'Trip';
    } catch (error) {
      console.error('Error fetching trip name:', error);
      return 'Trip';
    }
  }, []);

  const handleRoleChange = useCallback(async (payload: RoleChangePayload) => {
    if (!user?.id) return;

    const { eventType } = payload;
    const newRecord = payload.new;
    const oldRecord = payload.old;

    // Only notify the affected user
    const affectedUserId = newRecord?.user_id || oldRecord?.user_id;
    if (affectedUserId !== user.id) return;

    // Prevent duplicate notifications
    const notificationKey = `${eventType}-${newRecord?.id || oldRecord?.id}-${Date.now()}`;
    if (lastNotificationRef.current === notificationKey) return;
    lastNotificationRef.current = notificationKey;

    const tripIdForNotification = newRecord?.trip_id || oldRecord?.trip_id;
    const tripName = await fetchTripName(tripIdForNotification || '');

    if (eventType === 'INSERT' && newRecord) {
      // User was assigned a new role
      const roleName = await fetchRoleName(newRecord.role_id);
      const message = `You've been assigned the "${roleName || 'New'}" role on ${tripName}`;

      toast.success('🎉 New Role Assigned!', {
        description: message,
        duration: 5000,
      });

      // Also send browser notification if permitted
      notificationService.sendLocalNotification({
        title: '🎉 New Role Assigned!',
        body: message,
        data: { tripId: tripIdForNotification, type: 'role_assignment' }
      });

    } else if (eventType === 'UPDATE' && newRecord && oldRecord) {
      // User's role was updated (e.g., from one role to another)
      if (newRecord.role_id !== oldRecord.role_id) {
        const newRoleName = await fetchRoleName(newRecord.role_id);
        const oldRoleName = await fetchRoleName(oldRecord.role_id);
        const message = `Your role on ${tripName} has been changed from "${oldRoleName}" to "${newRoleName}"`;

        toast.info('🔄 Role Updated', {
          description: message,
          duration: 5000,
        });

        notificationService.sendLocalNotification({
          title: '🔄 Role Updated',
          body: message,
          data: { tripId: tripIdForNotification, type: 'role_change' }
        });
      }

      // Check if primary status changed
      if (newRecord.is_primary !== oldRecord.is_primary) {
        const roleName = await fetchRoleName(newRecord.role_id);
        const message = newRecord.is_primary
          ? `"${roleName}" is now your primary role on ${tripName}`
          : `"${roleName}" is no longer your primary role on ${tripName}`;

        toast.info('📌 Primary Role Changed', {
          description: message,
          duration: 4000,
        });
      }

    } else if (eventType === 'DELETE' && oldRecord) {
      // User was removed from a role
      const roleName = await fetchRoleName(oldRecord.role_id);
      const message = `You've been removed from the "${roleName}" role on ${tripName}`;

      toast.warning('Role Removed', {
        description: message,
        duration: 5000,
      });

      notificationService.sendLocalNotification({
        title: 'Role Removed',
        body: message,
        data: { tripId: tripIdForNotification, type: 'role_removal' }
      });
    }
  }, [user?.id, fetchRoleName, fetchTripName]);

  useEffect(() => {
    if (!enabled || !user?.id || isDemoMode) return;

    // Build the filter - either for a specific trip or for all the user's trips
    const filterConfig: {
      event: '*';
      schema: 'public';
      table: 'user_trip_roles';
      filter?: string;
    } = {
      event: '*',
      schema: 'public',
      table: 'user_trip_roles',
    };

    if (tripId) {
      filterConfig.filter = `trip_id=eq.${tripId}`;
    }

    const channel = supabase
      .channel(`role-notifications-${user.id}-${tripId || 'all'}`)
      .on(
        'postgres_changes',
        filterConfig,
        (payload) => {
          handleRoleChange(payload as unknown as RoleChangePayload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, tripId, isDemoMode, handleRoleChange]);

  return {
    // Expose a method to manually trigger a notification (useful for demo mode)
    notifyRoleChange: handleRoleChange,
  };
};
