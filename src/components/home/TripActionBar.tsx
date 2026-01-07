import React, { useState, useEffect } from 'react';
import { Settings, Plus, Search, Bell, MessageCircle, Calendar, Radio, BarChart2, FilePlus, Image, X, CheckSquare, DollarSign, UserPlus, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { mockNotifications } from '@/mockData/notifications';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Notification {
  id: string;
  type: 'message' | 'broadcast' | 'calendar' | 'poll' | 'files' | 'photos' | 'chat' | 'mention' | 'task' | 'payment' | 'invite' | 'join_request' | 'basecamp' | 'system';
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
  isSettingsActive?: boolean;
  isNotificationsActive?: boolean;
  isNewTripActive?: boolean;
  isSearchActive?: boolean;
  requireAuth?: boolean;
  onAuthRequired?: () => void;
}

export const TripActionBar = ({ 
  onSettings, 
  onCreateTrip, 
  onSearch,
  onNotifications: _onNotifications,
  className,
  isNotificationsOpen,
  setIsNotificationsOpen,
  isSettingsActive = false,
  isNotificationsActive = false,
  isNewTripActive = false,
  isSearchActive = false,
  requireAuth = false,
  onAuthRequired
}: TripActionBarProps) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUnreadCount = async () => {
    if (!user) return;
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error && count !== null) {
      setUnreadCount(count);
    }
  };

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
      fetchUnreadCount();
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
      basecamp: 'places'
    };

    const tab = tabMap[notification.type];
    if (tab) {
      navigate(`${baseRoute}?tab=${tab}`);
    } else {
      navigate(baseRoute);
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
    fetchUnreadCount();
  };

  const getNotificationIcon = (type: string, isHighPriority?: boolean) => {
    const iconClass = isHighPriority ? 'text-destructive' : 'text-muted-foreground';
    
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
        return <Image size={16} className="text-pink-400" />;
      case 'join_request':
        return <UserPlus size={16} className="text-orange-400" />;
      case 'basecamp':
        return <MapPin size={16} className="text-pink-400" />;
      default:
        return <Bell size={16} className={iconClass} />;
    }
  };

  // Fetch notifications and count
  useEffect(() => {
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
        tripName: n.data?.trip_name || 'Demo Trip',
        timestamp: formatDistanceToNow(new Date(n.timestamp), { addSuffix: true }),
        isRead: n.read,
        isHighPriority: n.type === 'broadcast',
        data: { ...n.data, tripType: n.tripType }
      }));
      setNotifications(mockNotifs);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    }
  }, [isDemoMode, user]);
  
  return (
    <div className={cn("bg-card/50 backdrop-blur-xl border-2 border-border/50 rounded-2xl p-1 shadow-lg grid grid-cols-4 w-full h-12 sm:h-16 gap-1 sm:gap-1.5 min-w-0", className)}>
          
          {/* New Trip */}
          <button
            onClick={() => {
              if (requireAuth) {
                onAuthRequired?.();
              } else {
                onCreateTrip();
              }
            }}
            aria-label="Create New Trip"
            className={cn(
              "h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap",
              isNewTripActive
                ? "bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] text-black shadow-lg shadow-primary/30"
                : "text-white hover:text-foreground"
            )}
          >
            <span className="inline lg:hidden text-sm">+ Trip</span>
            <span className="hidden lg:inline text-base">New Trip</span>
          </button>

          {/* Alerts with Badge */}
          <button
            onClick={() => {
              if (requireAuth) {
                onAuthRequired?.();
              } else {
                setIsNotificationsOpen?.(!isNotificationsOpen);
                _onNotifications();
              }
            }}
            aria-label="Alerts"
            className={cn(
              "relative h-full w-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap",
              isNotificationsActive
                ? "bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] text-black shadow-lg shadow-primary/30"
                : "text-white hover:text-foreground"
            )}
          >
            <span className="text-sm lg:text-base">Alerts</span>
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg">
                {unreadCount > 9 ? '9+' : unreadCount}
              </div>
            )}
          </button>

          {/* Notifications Modal */}
          <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] bg-card/95 backdrop-blur-xl border-2 border-border/50 text-foreground p-0">
              <DialogHeader className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold">Notifications</DialogTitle>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </DialogHeader>

              <div className="max-h-[calc(80vh-8rem)] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Bell size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "p-4 border-b border-border/50 hover:bg-accent/10 cursor-pointer transition-colors",
                        !notification.isRead && "bg-accent/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getNotificationIcon(notification.type, notification.isHighPriority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={cn(
                              "text-sm font-medium",
                              !notification.isRead ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {notification.title}
                            </p>
                            {notification.isHighPriority && (
                              <div className="w-2 h-2 bg-destructive rounded-full"></div>
                            )}
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full"></div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1 truncate">
                            {notification.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground/70">{notification.tripName}</p>
                            <p className="text-xs text-muted-foreground/70">{notification.timestamp}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Settings */}
          <button
            onClick={() => {
              // Settings is the dedicated entry point for auth when logged out.
              // Keep it accessible even when other actions are gated behind authentication.
              onSettings();
            }}
            aria-label="Settings"
            className={cn(
              "h-full flex items-center justify-center gap-2 px-2 sm:px-3 lg:px-4 py-0 rounded-xl transition-all duration-300 font-bold text-base tracking-wide whitespace-nowrap min-w-0 overflow-hidden",
              isSettingsActive
                ? "bg-gradient-to-r from-[hsl(45,95%,58%)] to-[hsl(45,90%,65%)] text-black shadow-lg shadow-primary/30"
                : "text-white hover:text-foreground"
            )}
          >
            <span className="text-sm lg:text-base truncate">Settings</span>
          </button>

          {/* Search */}
          <div className={cn(
            "h-full flex items-center px-2 rounded-xl transition-all duration-300",
            isSearchActive 
              ? "bg-gradient-to-r from-[hsl(45,95%,58%)]/10 to-[hsl(45,90%,65%)]/10 ring-1 ring-primary/30"
              : ""
          )}>
            <div className="relative w-full h-full flex items-center py-2">
              <Search 
                className={cn(
                  "absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none",
                  isSearchActive ? "text-primary" : "text-muted-foreground"
                )} 
                size={16} 
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  onSearch(e.target.value);
                }}
                onFocus={() => onSearch(searchQuery)}
                className="w-full h-full pl-8 pr-2 bg-background/50 border border-border/50 rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:bg-background/80 transition-all"
              />
            </div>
          </div>
    </div>
  );
};
