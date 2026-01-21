import { supabase } from '@/integrations/supabase/client';

export interface RoleChangeNotificationData {
  tripId: string;
  userId: string;
  oldRole?: string;
  newRole: string;
  changedBy: string;
  changeType: 'assigned' | 'updated' | 'removed';
}

/**
 * Service for managing role change notifications.
 * Records notifications in the database and triggers real-time updates.
 */
export const roleNotificationService = {
  /**
   * Record a role change notification in the database.
   * This will trigger real-time notifications to the affected user.
   */
  async recordRoleChange(data: RoleChangeNotificationData): Promise<boolean> {
    try {
      const { tripId, userId, oldRole, newRole, changedBy, changeType } = data;

      // Get trip name for the notification
      const { data: tripData } = await supabase
        .from('trips')
        .select('title')
        .eq('id', tripId)
        .single();

      const tripName = tripData?.title || 'Trip';

      // Create notification content based on change type
      let title: string;
      let body: string;

      switch (changeType) {
        case 'assigned':
          title = 'New Role Assigned';
          body = `You've been assigned the "${newRole}" role on ${tripName}`;
          break;
        case 'updated':
          title = 'Role Updated';
          body = `Your role on ${tripName} has been changed from "${oldRole}" to "${newRole}"`;
          break;
        case 'removed':
          title = 'Role Removed';
          body = `You've been removed from the "${oldRole}" role on ${tripName}`;
          break;
        default:
          title = 'Role Change';
          body = `Your role on ${tripName} has been updated`;
      }

      // Insert into notification_history table if it exists
      // This also triggers real-time subscriptions for the user
      const { error } = await supabase
        .from('notification_history')
        .insert({
          user_id: userId,
          category: 'role_change',
          title,
          body,
          payload: {
            trip_id: tripId,
            trip_name: tripName,
            old_role: oldRole,
            new_role: newRole,
            changed_by: changedBy,
            change_type: changeType
          },
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        // If table doesn't exist or other error, log but don't fail
        console.warn('Could not record notification in history:', error.message);
        return true; // Real-time will still work via user_trip_roles subscription
      }

      return true;
    } catch (error) {
      console.error('Error recording role change notification:', error);
      return false;
    }
  },

  /**
   * Get unread role change notifications for a user.
   */
  async getUnreadNotifications(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notification_history')
        .select('*')
        .eq('user_id', userId)
        .eq('category', 'role_change')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch notifications:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  },

  /**
   * Mark all role change notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_history')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('category', 'role_change')
        .eq('is_read', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }
};

export default roleNotificationService;
