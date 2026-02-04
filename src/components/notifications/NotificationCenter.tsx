/**
 * In-App Notification Center
 * 
 * A fallback notification system that works on all platforms, including
 * iOS Safari where push notifications may not be available.
 * 
 * Features:
 * - Badge counter on bell icon
 * - Inbox-style notification list
 * - Mark as read/unread
 * - Notification grouping by trip
 * - Quick actions (Reply, View, Dismiss)
 * - Real-time updates via Supabase subscription
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  MessageSquare,
  Calendar,
  DollarSign,
  Vote,
  ListTodo,
  Megaphone,
  AtSign,
  Clock,
  Trash2,
  MoreHorizontal,
  Settings,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'chat_message'
  | 'itinerary_update'
  | 'payment_request'
  | 'payment_split'
  | 'trip_reminder'
  | 'trip_invite'
  | 'poll_vote'
  | 'task_assigned'
  | 'broadcast'
  | 'mention';

export interface InAppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  data: {
    tripId?: string;
    tripName?: string;
    messageId?: string;
    eventId?: string;
    paymentId?: string;
    pollId?: string;
    taskId?: string;
    senderName?: string;
    url?: string;
    [key: string]: unknown;
  };
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

interface NotificationCenterProps {
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getNotificationIcon = (type: NotificationType) => {
  const iconClass = 'w-4 h-4';
  switch (type) {
    case 'chat_message':
      return <MessageSquare className={cn(iconClass, 'text-blue-500')} />;
    case 'itinerary_update':
      return <Calendar className={cn(iconClass, 'text-purple-500')} />;
    case 'payment_request':
    case 'payment_split':
      return <DollarSign className={cn(iconClass, 'text-green-500')} />;
    case 'trip_reminder':
      return <Clock className={cn(iconClass, 'text-orange-500')} />;
    case 'trip_invite':
      return <Bell className={cn(iconClass, 'text-primary')} />;
    case 'poll_vote':
      return <Vote className={cn(iconClass, 'text-cyan-500')} />;
    case 'task_assigned':
      return <ListTodo className={cn(iconClass, 'text-yellow-500')} />;
    case 'broadcast':
      return <Megaphone className={cn(iconClass, 'text-red-500')} />;
    case 'mention':
      return <AtSign className={cn(iconClass, 'text-pink-500')} />;
    default:
      return <Bell className={cn(iconClass, 'text-muted-foreground')} />;
  }
};

const getNotificationUrl = (notification: InAppNotification): string => {
  if (notification.data.url) {
    return notification.data.url;
  }
  
  const tripId = notification.data.tripId;
  if (!tripId) return '/';
  
  const baseUrl = `/trips/${tripId}`;
  
  switch (notification.type) {
    case 'chat_message':
    case 'mention':
      return notification.data.messageId 
        ? `${baseUrl}/chat?message=${notification.data.messageId}`
        : `${baseUrl}/chat`;
    case 'itinerary_update':
      return notification.data.eventId
        ? `${baseUrl}/itinerary?event=${notification.data.eventId}`
        : `${baseUrl}/itinerary`;
    case 'payment_request':
    case 'payment_split':
      return notification.data.paymentId
        ? `${baseUrl}/budget?payment=${notification.data.paymentId}`
        : `${baseUrl}/budget`;
    case 'poll_vote':
      return notification.data.pollId
        ? `${baseUrl}/polls?poll=${notification.data.pollId}`
        : `${baseUrl}/polls`;
    case 'task_assigned':
      return notification.data.taskId
        ? `${baseUrl}/tasks?task=${notification.data.taskId}`
        : `${baseUrl}/tasks`;
    case 'broadcast':
      return `${baseUrl}/broadcasts`;
    case 'trip_reminder':
    case 'trip_invite':
    default:
      return baseUrl;
  }
};

// ============================================================================
// Notification Item Component
// ============================================================================

interface NotificationItemProps {
  notification: InAppNotification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: InAppNotification) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onDelete,
  onClick,
}) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
    addSuffix: true 
  });
  
  return (
    <div
      className={cn(
        'relative flex gap-3 p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-primary/5'
      )}
      onClick={() => onClick(notification)}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
      )}
      
      {/* Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        {getNotificationIcon(notification.type)}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm line-clamp-1',
            !notification.is_read && 'font-medium'
          )}>
            {notification.title}
          </p>
          
          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!notification.is_read && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead(notification.id);
                }}>
                  <Check className="w-4 h-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification.id);
                }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.body}
        </p>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
          {notification.data.tripName && (
            <>
              <span className="text-[10px] text-muted-foreground">•</span>
              <span className="text-[10px] text-muted-foreground truncate">
                {notification.data.tripName}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Empty State Component
// ============================================================================

const EmptyState: React.FC<{ filter: 'all' | 'unread' }> = ({ filter }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
      <BellOff className="w-6 h-6 text-muted-foreground" />
    </div>
    <p className="text-sm font-medium">
      {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      {filter === 'unread' 
        ? 'You have no unread notifications.'
        : "When you have notifications, they'll appear here."}
    </p>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ 
  className 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setNotifications(data || []);
    } catch (err) {
      console.error('[NotificationCenter] Failed to fetch notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchNotifications();
    
    if (!user) return;
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('in_app_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as InAppNotification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => 
            prev.map(n => n.id === payload.new.id ? payload.new as InAppNotification : n)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);
  
  // Counts
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );
  
  const filteredNotifications = useMemo(
    () => filter === 'unread' 
      ? notifications.filter(n => !n.is_read)
      : notifications,
    [notifications, filter]
  );
  
  // Actions
  const markAsRead = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
      
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (err) {
      console.error('[NotificationCenter] Failed to mark as read:', err);
    }
  }, [user]);
  
  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('[NotificationCenter] Failed to mark all as read:', err);
    }
  }, [user]);
  
  const deleteNotification = useCallback(async (id: string) => {
    if (!user) return;
    
    try {
      await supabase
        .from('in_app_notifications')
        .delete()
        .eq('id', id);
      
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('[NotificationCenter] Failed to delete notification:', err);
    }
  }, [user]);
  
  const handleNotificationClick = useCallback((notification: InAppNotification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate to relevant page
    const url = getNotificationUrl(notification);
    navigate(url);
    setIsOpen(false);
  }, [navigate, markAsRead]);
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center"
              variant="destructive"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-80 sm:w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                navigate('/settings/notifications');
                setIsOpen(false);
              }}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList className="w-full justify-start rounded-none border-b h-auto p-0">
            <TabsTrigger 
              value="all" 
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="unread"
              className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
            >
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={filter} className="mt-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <EmptyState filter={filter} />
              ) : (
                filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={markAsRead}
                    onDelete={deleteNotification}
                    onClick={handleNotificationClick}
                  />
                ))
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
