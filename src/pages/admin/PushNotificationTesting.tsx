/**
 * Push Notification Testing Admin Page
 * 
 * Admin panel for testing and monitoring push notifications.
 * Only visible to authorized admin users.
 * 
 * Features:
 * - Send test notifications to yourself
 * - View all active subscriptions
 * - Send notifications to specific users/trips
 * - Test different notification types
 * - View delivery logs and analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Monitor,
  RefreshCw,
  Send,
  Smartphone,
  Tablet,
  Trash2,
  Users,
  XCircle,
  Activity,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

// Authorized admin user IDs - add your user ID here
const ADMIN_USER_IDS = [
  // Add authorized admin user IDs
  // e.g., 'your-user-uuid-here'
];

// ============================================================================
// Types
// ============================================================================

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  device_name: string | null;
  user_agent: string | null;
  is_active: boolean;
  last_used_at: string;
  failed_count: number;
  created_at: string;
  user_email?: string;
}

interface DeliveryLog {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  status: string;
  error_message: string | null;
  created_at: string;
  platform: string | null;
}

interface TestLog {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  status: string;
  subscriptions_targeted: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
}

interface AnalyticsData {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_clicked: number;
  delivery_rate: number;
  click_through_rate: number;
}

type NotificationType = 
  | 'chat_message'
  | 'itinerary_update'
  | 'payment_request'
  | 'trip_reminder'
  | 'poll_vote'
  | 'task_assigned'
  | 'broadcast'
  | 'mention';

// ============================================================================
// Helper Components
// ============================================================================

const DeviceIcon: React.FC<{ userAgent: string | null; className?: string }> = ({ 
  userAgent, 
  className 
}) => {
  if (!userAgent) return <Monitor className={className} />;
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('android') && ua.includes('mobile')) {
    return <Smartphone className={className} />;
  }
  if (ua.includes('ipad') || ua.includes('tablet')) {
    return <Tablet className={className} />;
  }
  return <Monitor className={className} />;
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    sent: { variant: 'default', label: 'Sent' },
    delivered: { variant: 'default', label: 'Delivered' },
    pending: { variant: 'secondary', label: 'Pending' },
    failed: { variant: 'destructive', label: 'Failed' },
    partial: { variant: 'outline', label: 'Partial' },
  };
  
  const { variant, label } = config[status] || { variant: 'secondary', label: status };
  
  return <Badge variant={variant}>{label}</Badge>;
};

// ============================================================================
// Send Test Notification Component
// ============================================================================

const SendTestNotification: React.FC<{ userId: string; onSent: () => void }> = ({ 
  userId, 
  onSent 
}) => {
  const [type, setType] = useState<NotificationType>('chat_message');
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification from Chravel.');
  const [targetType, setTargetType] = useState<'self' | 'user' | 'trip'>('self');
  const [targetId, setTargetId] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const handleSend = async () => {
    setIsSending(true);
    
    try {
      // Determine target
      let userIds: string[] = [];
      let tripId: string | undefined;
      
      if (targetType === 'self') {
        userIds = [userId];
      } else if (targetType === 'user') {
        userIds = [targetId];
      } else if (targetType === 'trip') {
        tripId = targetId;
      }
      
      // Send via Edge Function
      const { data, error } = await supabase.functions.invoke('web-push-send', {
        body: {
          userIds: userIds.length > 0 ? userIds : undefined,
          tripId,
          type,
          title,
          body,
          data: {
            test: true,
            timestamp: Date.now(),
          },
        },
      });
      
      if (error) throw error;
      
      // Log the test
      await supabase.from('notification_test_log').insert({
        admin_user_id: userId,
        target_user_id: targetType === 'user' ? targetId : (targetType === 'self' ? userId : null),
        target_trip_id: targetType === 'trip' ? targetId : null,
        target_type: targetType,
        notification_type: type,
        title,
        body,
        status: data.failed === 0 ? 'sent' : (data.sent > 0 ? 'partial' : 'failed'),
        subscriptions_targeted: (data.sent || 0) + (data.failed || 0),
        successful_sends: data.sent || 0,
        failed_sends: data.failed || 0,
        errors: data.errors || [],
        completed_at: new Date().toISOString(),
      });
      
      toast.success(`Notification sent! (${data.sent} delivered, ${data.failed} failed)`);
      onSent();
    } catch (err) {
      console.error('Failed to send test notification:', err);
      toast.error('Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };
  
  const notificationTypes: { value: NotificationType; label: string; emoji: string }[] = [
    { value: 'chat_message', label: 'Chat Message', emoji: '💬' },
    { value: 'itinerary_update', label: 'Itinerary Update', emoji: '📅' },
    { value: 'payment_request', label: 'Payment Request', emoji: '💰' },
    { value: 'trip_reminder', label: 'Trip Reminder', emoji: '🧳' },
    { value: 'poll_vote', label: 'Poll Vote', emoji: '📊' },
    { value: 'task_assigned', label: 'Task Assigned', emoji: '📋' },
    { value: 'broadcast', label: 'Broadcast', emoji: '📢' },
    { value: 'mention', label: 'Mention', emoji: '@' },
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send Test Notification
        </CardTitle>
        <CardDescription>
          Send a test push notification to verify delivery
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Target Selection */}
        <div className="space-y-2">
          <Label>Target</Label>
          <Select value={targetType} onValueChange={(v) => setTargetType(v as 'self' | 'user' | 'trip')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="self">Send to Myself</SelectItem>
              <SelectItem value="user">Specific User ID</SelectItem>
              <SelectItem value="trip">All Trip Members</SelectItem>
            </SelectContent>
          </Select>
          
          {targetType !== 'self' && (
            <Input
              placeholder={targetType === 'user' ? 'User UUID' : 'Trip UUID'}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            />
          )}
        </div>
        
        {/* Notification Type */}
        <div className="space-y-2">
          <Label>Notification Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as NotificationType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {notificationTypes.map(nt => (
                <SelectItem key={nt.value} value={nt.value}>
                  {nt.emoji} {nt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Title */}
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
          />
        </div>
        
        {/* Body */}
        <div className="space-y-2">
          <Label>Body</Label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Notification body"
            rows={3}
          />
        </div>
        
        {/* Send Button */}
        <Button 
          onClick={handleSend} 
          disabled={isSending || !title}
          className="w-full"
        >
          {isSending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Test Notification
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Subscriptions Viewer Component
// ============================================================================

const SubscriptionsViewer: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('web_push_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      toast.error('Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);
  
  const handleDeactivate = async (id: string) => {
    try {
      await supabase
        .from('web_push_subscriptions')
        .update({ is_active: false })
        .eq('id', id);
      
      toast.success('Subscription deactivated');
      fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to deactivate subscription');
    }
  };
  
  const activeCount = subscriptions.filter(s => s.is_active).length;
  const webCount = subscriptions.filter(s => s.user_agent?.includes('Chrome') || s.user_agent?.includes('Firefox')).length;
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Subscriptions
            </CardTitle>
            <CardDescription>
              {activeCount} active of {subscriptions.length} total subscriptions
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchSubscriptions}>
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No subscriptions found
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Failures</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DeviceIcon 
                          userAgent={sub.user_agent} 
                          className="w-4 h-4 text-muted-foreground" 
                        />
                        <span className="text-sm truncate max-w-[150px]">
                          {sub.device_name || 'Unknown Device'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {sub.user_id.slice(0, 8)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {sub.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(sub.last_used_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {sub.failed_count > 0 ? (
                        <Badge variant="destructive">{sub.failed_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {sub.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivate(sub.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Test History Component
// ============================================================================

const TestHistory: React.FC<{ userId: string; refreshKey: number }> = ({ 
  userId, 
  refreshKey 
}) => {
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('notification_test_log')
          .select('*')
          .eq('admin_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20);
        
        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.error('Failed to fetch test logs:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
  }, [userId, refreshKey]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Test History
        </CardTitle>
        <CardDescription>
          Recent test notifications you've sent
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No test notifications sent yet
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {logs.map(log => (
                <div 
                  key={log.id}
                  className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.notification_type}</Badge>
                      <StatusBadge status={log.status} />
                    </div>
                    <p className="font-medium text-sm">{log.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {log.body}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.successful_sends}/{log.subscriptions_targeted} delivered • {' '}
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    {log.status === 'sent' && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {log.status === 'failed' && (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                    {log.status === 'partial' && (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Analytics Dashboard Component
// ============================================================================

const AnalyticsDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentLogs, setRecentLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch aggregated stats
        const { data: statsData } = await supabase.rpc('get_notification_stats');
        if (statsData && statsData.length > 0) {
          setAnalytics(statsData[0]);
        }
        
        // Fetch recent delivery logs
        const { data: logsData } = await supabase
          .from('notification_delivery_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        setRecentLogs(logsData || []);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'neutral';
  }> = ({ title, value, subtitle, icon, trend }) => (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Sent"
          value={analytics?.total_sent || 0}
          subtitle="Last 30 days"
          icon={<Send className="w-6 h-6 text-primary" />}
        />
        <StatCard
          title="Delivered"
          value={analytics?.total_delivered || 0}
          subtitle={`${analytics?.delivery_rate || 0}% delivery rate`}
          icon={<CheckCircle2 className="w-6 h-6 text-green-500" />}
        />
        <StatCard
          title="Clicked"
          value={analytics?.total_clicked || 0}
          subtitle={`${analytics?.click_through_rate || 0}% CTR`}
          icon={<Activity className="w-6 h-6 text-blue-500" />}
        />
        <StatCard
          title="Failed"
          value={analytics?.total_failed || 0}
          subtitle="Check logs for details"
          icon={<XCircle className="w-6 h-6 text-destructive" />}
        />
      </div>
      
      {/* Recent Delivery Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Recent Delivery Logs
          </CardTitle>
          <CardDescription>
            Latest notification delivery attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No delivery logs yet
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM d, HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.notification_type}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.platform || 'web'}</Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                        {log.error_message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// Testing Checklist Component
// ============================================================================

const TestingChecklist: React.FC = () => {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('push_notification_checklist');
    return saved ? JSON.parse(saved) : {};
  });
  
  const toggleCheck = (key: string) => {
    const newChecks = { ...checks, [key]: !checks[key] };
    setChecks(newChecks);
    localStorage.setItem('push_notification_checklist', JSON.stringify(newChecks));
  };
  
  const checklistItems = [
    { key: 'permission_timing', label: 'Permission request appears at right time (not on first load)' },
    { key: 'subscription_saves', label: 'Subscription saves to database correctly' },
    { key: 'locked_screen', label: 'Notification appears on locked screen (mobile)' },
    { key: 'click_navigation', label: 'Clicking notification opens correct trip/page' },
    { key: 'unsubscribe_works', label: 'Unsubscribe flow works (revoke permission)' },
    { key: 'android_chrome', label: 'Works on Android Chrome (primary target)' },
    { key: 'ios_degradation', label: 'Gracefully degrades on iOS Safari' },
    { key: 'offline_queue', label: 'Notifications queue when offline' },
    { key: 'action_buttons', label: 'Action buttons work (Reply, View Trip, etc.)' },
    { key: 'quiet_hours', label: 'Quiet hours respected' },
  ];
  
  const completedCount = Object.values(checks).filter(Boolean).length;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          Testing Checklist
        </CardTitle>
        <CardDescription>
          {completedCount} of {checklistItems.length} checks completed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checklistItems.map(item => (
            <div
              key={item.key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                checks[item.key] ? 'bg-green-500/10' : 'bg-muted/50 hover:bg-muted'
              )}
              onClick={() => toggleCheck(item.key)}
            >
              <div className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                checks[item.key] 
                  ? 'bg-green-500 border-green-500' 
                  : 'border-muted-foreground'
              )}>
                {checks[item.key] && (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                )}
              </div>
              <span className={cn(
                'text-sm',
                checks[item.key] && 'line-through text-muted-foreground'
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
        
        <Separator className="my-4" />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setChecks({});
            localStorage.removeItem('push_notification_checklist');
          }}
        >
          Reset Checklist
        </Button>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Page Component
// ============================================================================

export const PushNotificationTesting: React.FC = () => {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Check if user is authorized admin
  const isAdmin = user && (
    ADMIN_USER_IDS.includes(user.id) || 
    // Allow any authenticated user for now (in dev)
    import.meta.env.DEV
  );
  
  if (!user) {
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Authentication Required</h1>
        <p className="text-muted-foreground mt-2">
          Please sign in to access this page.
        </p>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground mt-2">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }
  
  const handleNotificationSent = () => {
    setRefreshKey(prev => prev + 1);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Push Notification Testing
        </h1>
        <p className="text-muted-foreground mt-1">
          Admin panel for testing and monitoring push notifications
        </p>
      </div>
      
      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">
            <Send className="w-4 h-4 mr-2" />
            Send Test
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Users className="w-4 h-4 mr-2" />
            Subscriptions
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Checklist
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="send" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SendTestNotification 
              userId={user.id} 
              onSent={handleNotificationSent} 
            />
            <TestHistory 
              userId={user.id} 
              refreshKey={refreshKey} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="subscriptions">
          <SubscriptionsViewer />
        </TabsContent>
        
        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
        
        <TabsContent value="checklist">
          <TestingChecklist />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PushNotificationTesting;
