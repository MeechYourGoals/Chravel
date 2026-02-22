/**
 * Shared notification state for useNotificationRealtime.
 * Ensures TripActionBar (and any future notification consumers) share ONE subscription and state.
 */

import { create } from 'zustand';

export interface NotificationItem {
  id: string;
  type:
    | 'message'
    | 'broadcast'
    | 'calendar'
    | 'poll'
    | 'files'
    | 'photos'
    | 'chat'
    | 'mention'
    | 'task'
    | 'payment'
    | 'invite'
    | 'join_request'
    | 'basecamp'
    | 'system';
  title: string;
  description: string;
  tripId: string;
  tripName: string;
  timestamp: string;
  isRead: boolean;
  isHighPriority?: boolean;
  data?: Record<string, unknown>;
}

interface NotificationRealtimeState {
  notifications: NotificationItem[];
  unreadCount: number;
  setNotifications: (notifications: NotificationItem[]) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (n: NotificationItem) => void;
  updateNotification: (id: string, updates: Partial<NotificationItem>) => void;
  removeNotification: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationRealtimeStore = create<NotificationRealtimeState>(set => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: notifications =>
    set({
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length,
    }),
  setUnreadCount: unreadCount => set({ unreadCount }),
  addNotification: n =>
    set(state => ({
      notifications: [n, ...state.notifications],
      unreadCount: n.isRead ? state.unreadCount : state.unreadCount + 1,
    })),
  updateNotification: (id, updates) =>
    set(state => {
      const wasUnread = state.notifications.find(x => x.id === id)?.isRead === false;
      const nowUnread = updates.isRead === false;
      const unreadDelta =
        wasUnread && updates.isRead === true ? -1 : nowUnread && !wasUnread ? 1 : 0;
      return {
        notifications: state.notifications.map(x => (x.id === id ? { ...x, ...updates } : x)),
        unreadCount: Math.max(0, state.unreadCount + unreadDelta),
      };
    }),
  removeNotification: id =>
    set(state => {
      const removed = state.notifications.find(x => x.id === id);
      const wasUnread = removed?.isRead === false;
      return {
        notifications: state.notifications.filter(x => x.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    }),
  markAllRead: () =>
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
