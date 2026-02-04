/**
 * Push Notification Testing Page
 * 
 * Simple admin panel for testing push notifications.
 * Only accessible in development or to admin users.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Bell,
  RefreshCw,
  Send,
  Smartphone,
  Monitor,
  Users,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// Add your admin user IDs here for production
const ADMIN_USER_IDS: string[] = [];

// ============================================================================
// Types
// ============================================================================

interface Subscription {
  id: string;
  user_id: string;
  device_name: string | null;
  user_agent: string | null;
  is_active: boolean;
  last_used_at: string;
  failed_count: number;
  created_at: string;
}

type NotificationType = 
  | 'chat_message'
  | 'itinerary_update'
  | 'payment_request'
  | 'trip_reminder'
  | 'broadcast';

// ============================================================================
// Send Test Component
// ============================================================================

const SendTest: React.FC<{ userId: string }> = ({ userId }) => {
  const [type, setType] = useState<NotificationType>('chat_message');
  const [title, setTitle] = useState('Test Notification');
  const [body, setBody] = useState('This is a test notification from Chravel.');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('web-push-send', {
        body: {
          userIds: [userId],
          type,
          title,
          body,
          data: { test: true },
        },
      });

      if (error) throw error;
      toast.success(`Sent! ${data.sent} delivered, ${data.failed} failed`);
    } catch (err) {
      console.error('Send failed:', err);
      toast.error('Failed to send notification');
    } finally {
      setIsSending(false);
    }
  };

  const types: { value: NotificationType; label: string }[] = [
    { value: 'chat_message', label: '💬 Chat Message' },
    { value: 'itinerary_update', label: '📅 Itinerary Update' },
    { value: 'payment_request', label: '💰 Payment Request' },
    { value: 'trip_reminder', label: '🧳 Trip Reminder' },
    { value: 'broadcast', label: '📢 Broadcast' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Send Test Notification
        </CardTitle>
        <CardDescription>Send a test push to yourself</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as NotificationType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {types.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} />
        </div>

        <Button onClick={handleSend} disabled={isSending || !title} className="w-full">
          {isSending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          {isSending ? 'Sending...' : 'Send Test'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Subscriptions Viewer
// ============================================================================

const SubscriptionsViewer: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('web_push_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      toast.error('Failed to load subscriptions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const deactivate = async (id: string) => {
    await supabase.from('web_push_subscriptions').update({ is_active: false }).eq('id', id);
    toast.success('Deactivated');
    fetch();
  };

  const DeviceIcon = ({ ua }: { ua: string | null }) => {
    if (ua?.toLowerCase().includes('mobile') || ua?.toLowerCase().includes('iphone')) {
      return <Smartphone className="w-4 h-4" />;
    }
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Subscriptions
            </CardTitle>
            <CardDescription>
              {subscriptions.filter(s => s.is_active).length} active
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetch}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : subscriptions.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No subscriptions</p>
        ) : (
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map(sub => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <DeviceIcon ua={sub.user_agent} />
                        <span className="text-sm truncate max-w-[120px]">
                          {sub.device_name || 'Unknown'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{sub.user_id.slice(0, 8)}...</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sub.is_active ? 'default' : 'secondary'}>
                        {sub.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(sub.last_used_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {sub.is_active && (
                        <Button variant="ghost" size="icon" onClick={() => deactivate(sub.id)}>
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
// Main Page
// ============================================================================

export const PushNotificationTesting: React.FC = () => {
  const { user } = useAuth();

  // Allow in dev mode or for admin users
  const isAllowed = import.meta.env.DEV || (user && ADMIN_USER_IDS.includes(user.id));

  if (!user) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">Please sign in to access this page.</p>
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="container mx-auto py-12 text-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          Push Notification Testing
        </h1>
        <p className="text-muted-foreground">Test and monitor push notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SendTest userId={user.id} />
        <SubscriptionsViewer />
      </div>
    </div>
  );
};

export default PushNotificationTesting;
