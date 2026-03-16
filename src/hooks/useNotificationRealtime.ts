/**
 * Shared notification realtime hook — ONE subscription for TripActionBar.
 * Deduplicates channels: both components share the same Supabase subscription and state.
 *
 * Features:
 * - Singleton realtime subscription per user (refCount pattern)
 * - INSERT + UPDATE event handling for multi-device read state propagation
 * - Reconnect correction: re-fetches from DB on channel reconnect
 * - Logout cleanup: clears Zustand store when user becomes null
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { useNotificationRealtimeStore } from '@/store/notificationRealtimeStore';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationItem } from '@/store/notificationRealtimeStore';

const NOTIFICATION_COLUMNS = 'id, type, title, message, is_read, is_visible, metadata, created_at';

function mapRowToNotification(row: Record<string, unknown>): NotificationItem {
  const metadata = (row.metadata as Record<string, unknown>) || {};
  return {
    id: row.id as string,
    type: (row.type || 'system') as NotificationItem['type'],
    title: (row.title as string) || '',
    description: (row.message as string) || '',
    tripId: (metadata.trip_id as string) || '',
    tripName: (metadata.trip_name as string) || '',
    timestamp: formatDistanceToNow(new Date((row.created_at as string) || Date.now()), {
      addSuffix: true,
    }),
    isRead: (row.is_read as boolean) || false,
    isHighPriority: row.type === 'broadcast',
    data: metadata,
  };
}

// Singleton: one subscription per user, refCount for cleanup
const subscriptionRefs = new Map<
  string,
  { refCount: number; channel: ReturnType<typeof supabase.channel> }
>();

interface SubscriptionCallbacks {
  onInsert: (row: Record<string, unknown>) => void;
  onUpdate: (row: Record<string, unknown>) => void;
  onReconnect: () => void;
}

function ensureSubscription(userId: string, callbacks: SubscriptionCallbacks) {
  const existing = subscriptionRefs.get(userId);
  if (existing) {
    existing.refCount++;
    return () => {
      existing.refCount--;
      if (existing.refCount <= 0) {
        supabase.removeChannel(existing.channel);
        subscriptionRefs.delete(userId);
      }
    };
  }

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      payload => {
        callbacks.onInsert(payload.new as Record<string, unknown>);
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      payload => {
        callbacks.onUpdate(payload.new as Record<string, unknown>);
      },
    )
    .subscribe((status, err) => {
      if (err && import.meta.env.DEV) {
        console.error('[useNotificationRealtime] Subscription error:', err);
      }
      // Re-fetch from DB on reconnect to correct any drift from gaps
      if (status === 'SUBSCRIBED') {
        // Channel just (re)connected — re-fetch to fill any gap
        callbacks.onReconnect();
      }
    });

  subscriptionRefs.set(userId, { refCount: 1, channel });

  return () => {
    const entry = subscriptionRefs.get(userId);
    if (entry) {
      entry.refCount--;
      if (entry.refCount <= 0) {
        supabase.removeChannel(entry.channel);
        subscriptionRefs.delete(userId);
      }
    }
  };
}

export function useNotificationRealtime() {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const {
    notifications,
    unreadCount,
    setNotifications,
    setUnreadCount,
    addNotification,
    updateNotification,
    removeNotification,
    markAllRead,
    clearAll: storeClearAll,
  } = useNotificationRealtimeStore();

  // Track whether initial fetch has completed to avoid double-fetch on SUBSCRIBED
  const initialFetchDone = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select(NOTIFICATION_COLUMNS)
      .eq('user_id', user.id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      if (import.meta.env.DEV) {
        console.error('[useNotificationRealtime] Error fetching notifications:', error);
      }
      return;
    }

    if (data) {
      const mapped = data.map(row => mapRowToNotification(row as Record<string, unknown>));
      setNotifications(mapped);
    }
  }, [user, setNotifications]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('is_visible', true);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  }, [user, setUnreadCount]);

  // Clear notification state on logout (user becomes null)
  useEffect(() => {
    if (!user) {
      storeClearAll();
      initialFetchDone.current = false;
    }
  }, [user, storeClearAll]);

  // Single realtime subscription — shared by all consumers
  useEffect(() => {
    if (isDemoMode || !user) return;

    initialFetchDone.current = false;
    fetchNotifications();
    fetchUnreadCount();
    initialFetchDone.current = true;

    const cleanup = ensureSubscription(user.id, {
      onInsert: (newRow: Record<string, unknown>) => {
        const item = mapRowToNotification(newRow);
        addNotification(item);
      },
      onUpdate: (updatedRow: Record<string, unknown>) => {
        const id = updatedRow.id as string;
        if (!id) return;

        // If notification was cleared (is_visible=false), remove it from the store
        if (updatedRow.is_visible === false) {
          removeNotification(id);
          return;
        }

        // Propagate read state changes from other devices
        updateNotification(id, {
          isRead: (updatedRow.is_read as boolean) || false,
        });
      },
      onReconnect: () => {
        // Only re-fetch on reconnect, not on initial subscription
        if (initialFetchDone.current) {
          fetchNotifications();
          fetchUnreadCount();
        }
      },
    });

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- user object is unstable; user?.id already in deps
  }, [
    user?.id,
    isDemoMode,
    fetchNotifications,
    fetchUnreadCount,
    addNotification,
    updateNotification,
    removeNotification,
  ]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      updateNotification(notificationId, { isRead: true });

      if (user) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
        fetchUnreadCount();
      }
    },
    [user, updateNotification, fetchUnreadCount],
  );

  const markAllAsRead = useCallback(
    async (currentNotifications: NotificationItem[]) => {
      markAllRead();

      if (user) {
        const unreadIds = currentNotifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length > 0) {
          await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
        }
      }
    },
    [user, markAllRead],
  );

  const clearAll = useCallback(
    async (currentNotifications: NotificationItem[]) => {
      const ids = currentNotifications.map(n => n.id);
      storeClearAll();

      if (user && ids.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_visible: false, cleared_at: new Date().toISOString() })
          .in('id', ids);
      }
    },
    [user, storeClearAll],
  );

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      removeNotification(notificationId);

      if (user) {
        await supabase
          .from('notifications')
          .update({ is_visible: false, cleared_at: new Date().toISOString() })
          .eq('id', notificationId);
      }
    },
    [user, removeNotification],
  );

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  };
}
