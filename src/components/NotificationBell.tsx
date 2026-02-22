import React, { useState } from 'react';
import {
  Bell,
  MessageCircle,
  Calendar,
  Radio,
  X,
  FilePlus,
  Image,
  BarChart2,
  UserPlus,
  Trash2,
  CheckSquare,
  DollarSign,
  MapPin,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime';
import { mockNotifications } from '@/mockData/notifications';
import { formatDistanceToNow } from 'date-fns';
import { JoinRequestNotification } from './notifications/JoinRequestNotification';
import { SwipeableNotificationRow } from './notifications/SwipeableNotificationRow';
import { useInboundJoinRequests } from '@/hooks/useInboundJoinRequests';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';

interface Notification {
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

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const { pendingCount: inboundRequestsCount } = useInboundJoinRequests();
  const isMobile = useMobilePortrait();

  const {
    notifications: realtimeNotifications,
    unreadCount: realtimeUnreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    deleteNotification,
  } = useNotificationRealtime();

  const allNotifications = isDemoMode
    ? mockNotifications.map(n => ({
        id: n.id,
        type: n.type as Notification['type'],
        title: n.title,
        description: n.message,
        tripId: n.tripId,
        tripName: n.data?.trip_name || 'Demo Trip',
        timestamp: formatDistanceToNow(new Date(n.timestamp), { addSuffix: true }),
        isRead: n.read,
        isHighPriority: n.type === 'broadcast',
        data: { ...n.data, tripType: n.tripType },
      }))
    : realtimeNotifications;

  const notifications = isDemoMode
    ? allNotifications.filter(n => !deletedIds.has(n.id))
    : allNotifications;

  const unreadCount = isDemoMode
    ? notifications.filter(n => !n.isRead).length
    : realtimeUnreadCount;

  const handleNotificationClick = async (notification: Notification) => {
    if (!isDemoMode && user) {
      await markAsRead(notification.id);
    }

    // Determine base route based on trip type
    const tripType = notification.data?.tripType || notification.data?.trip_type;
    let baseRoute = `/trip/${notification.tripId}`;
    if (tripType === 'pro') {
      baseRoute = `/pro-trip/${notification.tripId}`;
    } else if (tripType === 'event') {
      baseRoute = `/events/${notification.tripId}`;
    }

    // Navigate based on notification type with appropriate tab
    const tabMap: Record<string, string> = {
      message: 'chat',
      chat: 'chat',
      mention: 'chat',
      broadcast: 'broadcasts',
      calendar: 'calendar',
      task: 'tasks',
      payment: 'payments',
      poll: 'polls',
      photos: 'media',
      join_request: 'collaborators',
      basecamp: 'places',
    };

    const tab = tabMap[notification.type];
    if (tab) {
      navigate(`${baseRoute}?tab=${tab}`);
    } else {
      navigate(baseRoute);
    }

    setIsOpen(false);
  };

  const getNotificationIcon = (type: string, isHighPriority?: boolean) => {
    const iconClass = isHighPriority ? 'text-red-400' : 'text-gray-400';

    switch (type) {
      case 'message':
      case 'chat':
        return <MessageCircle size={16} className="text-blue-400" />;
      case 'broadcast':
        return <Radio size={16} className="text-red-400" />;
      case 'calendar':
        return <Calendar size={16} className="text-purple-400" />;
      case 'poll':
        return <BarChart2 size={16} className="text-cyan-400" />;
      case 'task':
        return <CheckSquare size={16} className="text-yellow-400" />;
      case 'payment':
        return <DollarSign size={16} className="text-green-400" />;
      case 'files':
        return <FilePlus size={16} className={iconClass} />;
      case 'photos':
        return <Image size={16} className={iconClass} />;
      case 'join_request':
        return <UserPlus size={16} className="text-orange-400" />;
      case 'basecamp':
        return <MapPin size={16} className="text-pink-400" />;
      case 'system':
        return <MapPin size={16} className="text-gray-400" />;
      default:
        return <Bell size={16} className={iconClass} />;
    }
  };

  const handleDeleteNotification = async (notificationId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (isDemoMode) {
      setDeletedIds(prev => new Set(prev).add(notificationId));
      return;
    }
    await deleteNotification(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    if (!isDemoMode && user) {
      await markAllAsRead(notifications);
    }
  };

  const handleClearAll = async () => {
    if (!isDemoMode && user) {
      await clearAll(notifications);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-900/80 backdrop-blur-md border border-gray-700 hover:bg-gray-800/80 hover:border-gray-600 text-white p-3 rounded-2xl transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl relative"
      >
        <Bell size={20} />
        {/* Yellow badge for pending join requests (top-left) */}
        {inboundRequestsCount > 0 && (
          <div className="absolute -top-2 -left-2 bg-yellow-500 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold animate-pulse">
            {inboundRequestsCount > 9 ? '9+' : inboundRequestsCount}
          </div>
        )}
        {/* Red badge for unread notifications (top-right) */}
        {unreadCount > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-lg"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
              {notifications.length > 0 && (
                <div className="flex items-center gap-3 mt-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-sm text-glass-orange hover:text-glass-yellow transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={handleClearAll}
                    className="text-sm text-gray-400 hover:text-red-400 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map(notification => {
                  if (notification.type === 'join_request') {
                    return (
                      <JoinRequestNotification
                        key={notification.id}
                        notification={notification}
                        isDemoMode={isDemoMode}
                        onAction={() => {
                          if (isDemoMode) {
                            setDeletedIds(prev => new Set(prev).add(notification.id));
                          } else {
                            fetchNotifications();
                          }
                        }}
                        onNavigate={() => setIsOpen(false)}
                      />
                    );
                  }

                  const notificationContent = (
                    <div
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 border-b border-gray-700/50 hover:bg-gray-800/50 cursor-pointer transition-colors group ${
                        !notification.isRead ? 'bg-gray-800/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type, notification.isHighPriority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p
                              className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}
                            >
                              {notification.title}
                            </p>
                            {notification.isHighPriority && (
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            )}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-glass-orange rounded-full"></div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mb-1 truncate">
                            {notification.description}
                          </p>
                          <p className="text-xs text-muted-foreground">{notification.tripName}</p>
                        </div>
                        {/* Delete button and timestamp - only on desktop */}
                        {!isMobile && (
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <button
                              onClick={e => handleDeleteNotification(notification.id, e)}
                              className="p-1.5 rounded-lg text-destructive hover:bg-destructive/20 transition-all"
                              title="Delete notification"
                            >
                              <Trash2 size={16} />
                            </button>
                            <p className="text-xs text-muted-foreground">
                              {notification.timestamp}
                            </p>
                          </div>
                        )}
                        {/* Timestamp only on mobile (swipe to delete) */}
                        {isMobile && (
                          <p className="text-xs text-muted-foreground shrink-0">
                            {notification.timestamp}
                          </p>
                        )}
                      </div>
                    </div>
                  );

                  // Wrap in swipeable row for mobile
                  if (isMobile) {
                    return (
                      <SwipeableNotificationRow
                        key={notification.id}
                        onDelete={() => handleDeleteNotification(notification.id)}
                      >
                        {notificationContent}
                      </SwipeableNotificationRow>
                    );
                  }

                  return <div key={notification.id}>{notificationContent}</div>;
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
