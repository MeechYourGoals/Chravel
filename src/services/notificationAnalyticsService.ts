/**
 * Notification Analytics Service
 * 
 * Tracks notification delivery, interactions, and provides analytics data.
 * Used by the admin panel and for monitoring push notification health.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';

export type InteractionAction = 'clicked' | 'dismissed' | 'action_click' | 'view';

export interface NotificationDeliveryLog {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  notification_type: string;
  title: string;
  body: string | null;
  status: DeliveryStatus;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
  platform: string | null;
  trip_id: string | null;
  request_id: string | null;
}

export interface NotificationInteraction {
  id: string;
  delivery_log_id: string | null;
  user_id: string | null;
  action: InteractionAction;
  action_id: string | null;
  notification_type: string | null;
  trip_id: string | null;
  created_at: string;
  platform: string | null;
  user_agent: string | null;
}

export interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_clicked: number;
  delivery_rate: number;
  click_through_rate: number;
  avg_daily_sent: number;
}

export interface DailyAnalytics {
  date: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_clicked: number;
  delivery_rate: number;
  click_through_rate: number;
}

// ============================================================================
// Logging Functions
// ============================================================================

/**
 * Log a notification send attempt
 */
export async function logNotificationSend(params: {
  userId: string;
  subscriptionId?: string;
  notificationType: string;
  title: string;
  body?: string;
  status: DeliveryStatus;
  platform?: string;
  tripId?: string;
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_notification_send', {
      p_user_id: params.userId,
      p_subscription_id: params.subscriptionId || null,
      p_notification_type: params.notificationType,
      p_title: params.title,
      p_body: params.body || null,
      p_status: params.status,
      p_platform: params.platform || 'web',
      p_trip_id: params.tripId || null,
      p_request_id: params.requestId || null,
      p_error_code: params.errorCode || null,
      p_error_message: params.errorMessage || null,
    });

    if (error) {
      console.error('[NotificationAnalytics] Failed to log send:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[NotificationAnalytics] Error logging send:', err);
    return null;
  }
}

/**
 * Log a notification interaction (click, dismiss, etc.)
 */
export async function logNotificationInteraction(params: {
  userId: string;
  deliveryLogId?: string;
  action: InteractionAction;
  actionId?: string;
  notificationType?: string;
  tripId?: string;
  platform?: string;
  userAgent?: string;
}): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_notification_interaction', {
      p_user_id: params.userId,
      p_delivery_log_id: params.deliveryLogId || null,
      p_action: params.action,
      p_action_id: params.actionId || null,
      p_notification_type: params.notificationType || null,
      p_trip_id: params.tripId || null,
      p_platform: params.platform || 'web',
      p_user_agent: params.userAgent || null,
    });

    if (error) {
      console.error('[NotificationAnalytics] Failed to log interaction:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('[NotificationAnalytics] Error logging interaction:', err);
    return null;
  }
}

/**
 * Track when a notification is clicked (called from service worker via postMessage)
 */
export async function trackNotificationClick(params: {
  notificationType: string;
  actionId?: string;
  tripId?: string;
  messageId?: string;
}): Promise<void> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await logNotificationInteraction({
      userId: user.id,
      action: params.actionId ? 'action_click' : 'clicked',
      actionId: params.actionId,
      notificationType: params.notificationType,
      tripId: params.tripId,
      platform: 'web',
      userAgent: navigator.userAgent,
    });
  } catch (err) {
    console.error('[NotificationAnalytics] Error tracking click:', err);
  }
}

/**
 * Track when a notification is dismissed
 */
export async function trackNotificationDismiss(params: {
  notificationType: string;
  tripId?: string;
}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await logNotificationInteraction({
      userId: user.id,
      action: 'dismissed',
      notificationType: params.notificationType,
      tripId: params.tripId,
      platform: 'web',
      userAgent: navigator.userAgent,
    });
  } catch (err) {
    console.error('[NotificationAnalytics] Error tracking dismiss:', err);
  }
}

// ============================================================================
// Analytics Query Functions
// ============================================================================

/**
 * Get aggregated notification statistics
 */
export async function getNotificationStats(
  startDate?: Date,
  endDate?: Date
): Promise<NotificationStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_notification_stats', {
      p_start_date: startDate?.toISOString().split('T')[0] || null,
      p_end_date: endDate?.toISOString().split('T')[0] || null,
    });

    if (error) {
      console.error('[NotificationAnalytics] Failed to get stats:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        total_sent: 0,
        total_delivered: 0,
        total_failed: 0,
        total_clicked: 0,
        delivery_rate: 0,
        click_through_rate: 0,
        avg_daily_sent: 0,
      };
    }

    return data[0];
  } catch (err) {
    console.error('[NotificationAnalytics] Error getting stats:', err);
    return null;
  }
}

/**
 * Get daily analytics for charting
 */
export async function getDailyAnalytics(
  days: number = 30
): Promise<DailyAnalytics[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('notification_analytics_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error) {
      console.error('[NotificationAnalytics] Failed to get daily analytics:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[NotificationAnalytics] Error getting daily analytics:', err);
    return [];
  }
}

/**
 * Get recent delivery logs
 */
export async function getRecentDeliveryLogs(
  limit: number = 50
): Promise<NotificationDeliveryLog[]> {
  try {
    const { data, error } = await supabase
      .from('notification_delivery_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[NotificationAnalytics] Failed to get delivery logs:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[NotificationAnalytics] Error getting delivery logs:', err);
    return [];
  }
}

/**
 * Get failed notifications for debugging
 */
export async function getFailedNotifications(
  limit: number = 100
): Promise<NotificationDeliveryLog[]> {
  try {
    const { data, error } = await supabase
      .from('notification_delivery_logs')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[NotificationAnalytics] Failed to get failed notifications:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[NotificationAnalytics] Error getting failed notifications:', err);
    return [];
  }
}

/**
 * Get notification stats by type
 */
export async function getStatsByNotificationType(): Promise<
  { type: string; sent: number; clicked: number; ctr: number }[]
> {
  try {
    const { data: logs } = await supabase
      .from('notification_delivery_logs')
      .select('notification_type, status')
      .in('status', ['sent', 'delivered']);

    const { data: interactions } = await supabase
      .from('notification_interactions')
      .select('notification_type, action')
      .eq('action', 'clicked');

    if (!logs) return [];

    // Aggregate by type
    const typeStats: Record<string, { sent: number; clicked: number }> = {};

    logs.forEach(log => {
      const type = log.notification_type;
      if (!typeStats[type]) {
        typeStats[type] = { sent: 0, clicked: 0 };
      }
      typeStats[type].sent++;
    });

    interactions?.forEach(i => {
      const type = i.notification_type;
      if (type && typeStats[type]) {
        typeStats[type].clicked++;
      }
    });

    return Object.entries(typeStats).map(([type, stats]) => ({
      type,
      sent: stats.sent,
      clicked: stats.clicked,
      ctr: stats.sent > 0 ? Math.round((stats.clicked / stats.sent) * 100) : 0,
    }));
  } catch (err) {
    console.error('[NotificationAnalytics] Error getting stats by type:', err);
    return [];
  }
}

// ============================================================================
// Service Worker Communication
// ============================================================================

/**
 * Setup listener for service worker messages (notification interactions)
 */
export function setupServiceWorkerListener(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data?.type === 'NOTIFICATION_CLICK') {
      await trackNotificationClick({
        notificationType: event.data.notificationType,
        actionId: event.data.actionId,
        tripId: event.data.tripId,
        messageId: event.data.messageId,
      });
    }

    if (event.data?.type === 'NOTIFICATION_CLOSE') {
      await trackNotificationDismiss({
        notificationType: event.data.notificationType,
        tripId: event.data.tripId,
      });
    }
  });
}

// Initialize listener
if (typeof window !== 'undefined') {
  setupServiceWorkerListener();
}
