
import React, { useState, useEffect } from 'react';
import { Bell, MessageCircle, Calendar, Radio, X, FilePlus, Image, BarChart2, UserPlus, Trash2, CheckSquare, DollarSign, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { mockNotifications } from '@/mockData/notifications';
import { formatDistanceToNow } from 'date-fns';
import { JoinRequestNotification } from './notifications/JoinRequestNotification';
import { useInboundJoinRequests } from '@/hooks/useInboundJoinRequests';

interface Notification {
  id: string;
  type: 'message' | 'broadcast' | 'calendar' | 'poll' | 'files' | 'photos' | 'chat' | 'mention' | 'task' | 'payment' | 'invite' | 'join_request' | 'system';
  title: string;
  description: string;
  tripId: string;
  tripName: string;
  timestamp: string;
  isRead: boolean;
  isHighPriority?: boolean;
  data?: any;
}

export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const { pendingCount: inboundRequestsCount } = useInboundJoinRequests();

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch real notifications from database
  useEffect(() => {
    if (!isDemoMode && user) {
      fetchNotifications();
      
      // Subscribe to real-time notifications
      const channel = supabase
        .channel('notification_updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as any;
            setNotifications(prev => [
              {
                id: newNotification.id,
                type: newNotification.type || 'system',
                title: newNotification.title,
                description: newNotification.message,
                tripId: newNotification.metadata?.trip_id || '',
                tripName: newNotification.metadata?.trip_name || '',
                timestamp: formatDistanceToNow(new Date(newNotification.created_at), { addSuffix: true }),
                isRead: newNotification.is_read || false,
                isHighPriority: newNotification.type === 'broadcast',
                data: newNotification.metadata
              },
              ...prev
            ]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (isDemoMode) {
      setNotifications(mockNotifications.map(n => ({
        id: n.id,
        type: n.type as any,
        title: n.title,
        description: n.message,
        tripId: n.tripId,
        tripName: (n as any).data?.trip_name || 'Spring Break Cancun',
        timestamp: formatDistanceToNow(new Date(n.timestamp), { addSuffix: true }),
        isRead: n.read,
        isHighPriority: n.type === 'broadcast',
        data: (n as any).data
      })));
    }
  }, [isDemoMode, user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    if (data) {
      setNotifications(
        data.map(n => ({
          id: n.id,
          type: (n.type || 'system') as any,
          title: n.title,
          description: n.message,
          tripId: (n.metadata as any)?.trip_id || '',
          tripName: (n.metadata as any)?.trip_name || '',
          timestamp: formatDistanceToNow(new Date(n.created_at || new Date()), { addSuffix: true }),
          isRead: n.is_read || false,
          isHighPriority: n.type === 'broadcast',
          data: n.metadata
        }))
      );
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read locally
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );

    // Mark as read in database (if not demo mode)
    if (!isDemoMode && user) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'message' || notification.type === 'chat' || notification.type === 'mention') {
      navigate(`/trip/${notification.tripId}?tab=chat`);
    } else if (notification.type === 'calendar') {
      navigate(`/trip/${notification.tripId}?tab=calendar`);
    } else if (notification.type === 'task') {
      navigate(`/trip/${notification.tripId}?tab=tasks`);
    } else if (notification.type === 'payment') {
      navigate(`/trip/${notification.tripId}?tab=payments`);
    } else {
      navigate(`/trip/${notification.tripId}`);
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
      case 'system':
        return <MapPin size={16} className="text-pink-400" />;
      default:
        return <Bell size={16} className={iconClass} />;
    }
  };

  const deleteNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Remove locally
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Delete from database (if not demo mode)
    if (!isDemoMode && user) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    }
  };

  const markAllAsRead = async () => {
    // Mark locally
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    // Mark in database (if not demo mode)
    if (!isDemoMode && user) {
      const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
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
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-glass-orange hover:text-glass-yellow transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  notification.type === 'join_request' ? (
                    <JoinRequestNotification
                      key={notification.id}
                      notification={notification}
                      isDemoMode={isDemoMode}
                      onAction={() => {
                        if (isDemoMode) {
                          setNotifications(prev => prev.filter(n => n.id !== notification.id));
                        } else {
                          fetchNotifications();
                        }
                      }}
                      onNavigate={() => setIsOpen(false)}
                    />
                  ) : (
                    <div
                      key={notification.id}
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
                            <p className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-gray-300'}`}>
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
                        {/* Delete button and timestamp - always visible */}
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <button
                            onClick={(e) => deleteNotification(notification.id, e)}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/20 transition-all"
                            title="Delete notification"
                          >
                            <Trash2 size={16} />
                          </button>
                          <p className="text-xs text-muted-foreground">{notification.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  )
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
