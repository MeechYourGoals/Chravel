import React, { useState, useEffect } from 'react';
import { Settings, Plus, Search, Bell, MessageCircle, Calendar, Radio, BarChart2, FilePlus, Image, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { mockNotifications } from '@/mockData/notifications';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

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

interface TripActionBarProps {
  onSettings: () => void;
  onCreateTrip: () => void;
  onSearch: (query: string) => void;
  onNotifications: () => void;
  className?: string;
  isNotificationsOpen?: boolean;
  setIsNotificationsOpen?: (open: boolean) => void;
}

export const TripActionBar = ({ 
  onSettings, 
  onCreateTrip, 
  onSearch,
  onNotifications: _onNotifications,
  className,
  isNotificationsOpen,
  setIsNotificationsOpen
}: TripActionBarProps) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Fetch notifications and count
  useEffect(() => {
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

    if (!isDemoMode && user) {
      fetchNotifications();
      fetchUnreadCount();
      
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
            fetchUnreadCount();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else if (isDemoMode) {
      const mockNotifs = mockNotifications.map(n => ({
        id: n.id,
        type: n.type as any,
        title: n.title,
        description: n.message,
        tripId: n.tripId,
        tripName: 'Spring Break Cancun',
        timestamp: '2 minutes ago',
        isRead: n.read,
        isHighPriority: n.type === 'broadcast'
      }));
      setNotifications(mockNotifs);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
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

  const fetchUnreadCount = async () => {
    if (!user) return;

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

    setIsNotificationsOpen?.(false);
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

  const getNotificationIcon = (type: string, isHighPriority?: boolean) => {
    const iconClass = isHighPriority ? 'text-red-400' : 'text-gray-400';
    
    switch (type) {
      case 'message':
        return <MessageCircle size={16} className={iconClass} />;
      case 'broadcast':
        return <Radio size={16} className={iconClass} />;
      case 'calendar':
        return <Calendar size={16} className={iconClass} />;
      case 'poll':
        return <BarChart2 size={16} className={iconClass} />;
      case 'files':
        return <FilePlus size={16} className={iconClass} />;
      case 'photos':
        return <Image size={16} className={iconClass} />;
      default:
        return <Bell size={16} className={iconClass} />;
    }
  };

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

    setIsNotificationsOpen?.(false);
  };

  const getNotificationIcon = (type: string, isHighPriority?: boolean) => {
    const iconClass = isHighPriority ? 'text-red-400' : 'text-gray-400';
    
    switch (type) {
      case 'message':
        return <MessageCircle size={16} className={iconClass} />;
      case 'broadcast':
        return <Radio size={16} className={iconClass} />;
      case 'calendar':
        return <Calendar size={16} className={iconClass} />;
      case 'poll':
        return <BarChart2 size={16} className={iconClass} />;
      case 'files':
        return <FilePlus size={16} className={iconClass} />;
      case 'photos':
        return <Image size={16} className={iconClass} />;
      default:
        return <Bell size={16} className={iconClass} />;
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
    fetchUnreadCount();
  };
  
  return (
    <div className={cn("relative", className)}>
      <div className="bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg">
        <div className="grid grid-cols-4 w-full h-16 gap-1.5">
          
          {/* Settings */}
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl text-white hover:bg-white/5 transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap"
          >
            <Settings size={18} className="flex-shrink-0" />
            <span className="hidden md:inline text-xs lg:text-sm font-medium">Settings</span>
          </button>

          {/* Notifications with Badge */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen?.(!isNotificationsOpen);
                onNotifications();
              }}
              aria-label="Notifications"
              className="relative h-full w-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl text-white hover:bg-white/5 transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap"
            >
              <Bell size={18} className="flex-shrink-0" />
              <span className="hidden md:inline text-xs lg:text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <div className="absolute top-0.5 right-0.5 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            {isNotificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen?.(false)} />
                
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
                      <button onClick={() => setIsNotificationsOpen?.(false)} className="text-gray-400 hover:text-white transition-colors">
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
                        <div
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`p-4 border-b border-gray-700/50 hover:bg-gray-800/50 cursor-pointer transition-colors ${
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
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500">{notification.tripName}</p>
                                <p className="text-xs text-gray-500">{notification.timestamp}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* New Trip */}
          <button
            onClick={onCreateTrip}
            aria-label="Create New Trip"
            className="h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl text-white hover:bg-white/5 transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap"
          >
            <Plus size={18} className="flex-shrink-0" />
            <span className="hidden md:inline text-xs lg:text-sm font-medium">New Trip</span>
          </button>

          {/* Search - Fixed Height & Padding */}
          <div className="h-full flex items-center px-2 rounded-xl">
            <div className="relative w-full h-full flex items-center">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                className="w-full h-12 pl-8 pr-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-background/80 transition-all"
              />
            </div>
          </div>
          
        </div>
      </div>

      {/* Notification Dropdown */}
      {isNotificationsOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen?.(false)} />
          
          <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-orange-500 hover:text-yellow-500 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsNotificationsOpen?.(false)} className="text-gray-400 hover:text-white transition-colors">
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
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-700/50 hover:bg-gray-800/50 cursor-pointer transition-colors ${
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
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mb-1 truncate">
                          {notification.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">{notification.tripName}</p>
                          <p className="text-xs text-gray-500">{notification.timestamp}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
