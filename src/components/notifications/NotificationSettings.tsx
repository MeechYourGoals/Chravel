/**
 * Notification Settings Component
 * 
 * Allows users to configure their notification preferences across platforms.
 * Shows platform-specific status and options.
 * 
 * Features:
 * - Platform detection and status display
 * - Push, email, SMS toggle controls
 * - Notification type preferences
 * - Quiet hours configuration
 * - iOS-specific guidance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  BellOff,
  Mail,
  MessageSquare,
  Smartphone,
  Moon,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  Calendar,
  DollarSign,
  AtSign,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformNotifications } from '@/hooks/usePlatformNotifications';
import { IOSAddToHomeModal } from './IOSAddToHomeModal';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

interface TimeOption {
  value: string;
  label: string;
}

// Time options for quiet hours
const timeOptions: TimeOption[] = [
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: '23:00', label: '11:00 PM' },
  { value: '00:00', label: '12:00 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
];

// ============================================================================
// Platform Status Component
// ============================================================================

const PlatformStatus: React.FC<{
  platform: string;
  status: 'enabled' | 'disabled' | 'unavailable' | 'action_required';
  message: string;
  onAction?: () => void;
  actionLabel?: string;
}> = ({ platform, status, message, onAction, actionLabel }) => {
  const statusConfig = {
    enabled: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      badge: 'Enabled',
      badgeVariant: 'default' as const,
    },
    disabled: {
      icon: XCircle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      badge: 'Disabled',
      badgeVariant: 'secondary' as const,
    },
    unavailable: {
      icon: AlertCircle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      badge: 'Unavailable',
      badgeVariant: 'outline' as const,
    },
    action_required: {
      icon: Info,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      badge: 'Action Required',
      badgeVariant: 'secondary' as const,
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-lg',
      config.bgColor
    )}>
      <div className="flex items-center gap-3">
        <Icon className={cn('w-5 h-5', config.color)} />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{platform}</span>
            <Badge variant={config.badgeVariant} className="text-xs">
              {config.badge}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
      </div>
      
      {onAction && actionLabel && (
        <Button size="sm" variant="outline" onClick={onAction}>
          {actionLabel}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
};

// ============================================================================
// Notification Type Toggle
// ============================================================================

const NotificationTypeToggle: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ icon, title, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        {icon}
      </div>
      <div>
        <Label className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={enabled} onCheckedChange={onChange} />
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const {
    platform,
    pushSupport,
    canUsePush,
    isSubscribed,
    showIOSInstructions,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    updatePreferences,
    showIOSModal,
    hideIOSModal,
    enableEmailFallback,
    preferences,
  } = usePlatformNotifications();
  
  // Local state for form
  const [pushEnabled, setPushEnabled] = useState(preferences?.pushEnabled ?? true);
  const [emailEnabled, setEmailEnabled] = useState(preferences?.emailEnabled ?? true);
  const [smsEnabled, setSmsEnabled] = useState(preferences?.smsEnabled ?? false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  
  // Notification types
  const [chatMessages, setChatMessages] = useState(true);
  const [tripUpdates, setTripUpdates] = useState(true);
  const [calendarReminders, setCalendarReminders] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [mentions, setMentions] = useState(true);
  const [broadcasts, setBroadcasts] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  
  // Sync local state with preferences
  useEffect(() => {
    if (preferences) {
      setPushEnabled(preferences.pushEnabled);
      setEmailEnabled(preferences.emailEnabled);
      setSmsEnabled(preferences.smsEnabled);
    }
  }, [preferences]);
  
  // Save preferences
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = await updatePreferences({
        pushEnabled,
        emailEnabled,
        smsEnabled,
      });
      
      if (success) {
        toast.success('Notification preferences saved');
      } else {
        toast.error('Failed to save preferences');
      }
    } catch (err) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  }, [pushEnabled, emailEnabled, smsEnabled, updatePreferences]);
  
  // Handle push toggle
  const handlePushToggle = useCallback(async (enabled: boolean) => {
    if (enabled) {
      // Try to subscribe
      if (pushSupport.requiresHomeScreen) {
        showIOSModal();
        return;
      }
      
      if (!canUsePush) {
        toast.error(pushSupport.explanation);
        return;
      }
      
      const success = await subscribeToPush();
      if (success) {
        setPushEnabled(true);
        toast.success('Push notifications enabled');
      }
    } else {
      await unsubscribeFromPush();
      setPushEnabled(false);
      toast.success('Push notifications disabled');
    }
  }, [canUsePush, pushSupport, subscribeToPush, unsubscribeFromPush, showIOSModal]);
  
  // Determine push status
  const getPushStatus = () => {
    if (pushSupport.unsupportedReason === 'ios_too_old') {
      return {
        status: 'unavailable' as const,
        message: `iOS ${platform.iosVersion} doesn't support push. Update to iOS 16.4+.`,
      };
    }
    
    if (pushSupport.requiresHomeScreen) {
      return {
        status: 'action_required' as const,
        message: 'Add to Home Screen to enable push notifications.',
        action: showIOSModal,
        actionLabel: 'Set Up',
      };
    }
    
    if (!canUsePush) {
      return {
        status: 'unavailable' as const,
        message: pushSupport.explanation,
      };
    }
    
    if (isSubscribed && pushEnabled) {
      return {
        status: 'enabled' as const,
        message: 'You will receive push notifications.',
      };
    }
    
    return {
      status: 'disabled' as const,
      message: 'Push notifications are turned off.',
    };
  };
  
  const pushStatus = getPushStatus();
  
  return (
    <div className="space-y-6">
      {/* Platform Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Configure how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Push Notifications */}
          <PlatformStatus
            platform="Push Notifications"
            status={pushStatus.status}
            message={pushStatus.message}
            onAction={pushStatus.status === 'action_required' ? pushStatus.action : undefined}
            actionLabel={pushStatus.status === 'action_required' ? 'Set Up' : undefined}
          />
          
          {/* Push Toggle (only if supported) */}
          {canUsePush && !pushSupport.requiresHomeScreen && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive instant alerts on your device
                  </p>
                </div>
              </div>
              <Switch
                checked={isSubscribed && pushEnabled}
                onCheckedChange={handlePushToggle}
              />
            </div>
          )}
          
          <Separator />
          
          {/* Email Notifications */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  {user?.email || 'No email configured'}
                </p>
              </div>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>
          
          {/* In-App Notifications */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-muted-foreground" />
              <div>
                <Label>In-App Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  Always shown in the notification center
                </p>
              </div>
            </div>
            <Badge variant="secondary">Always On</Badge>
          </div>
        </CardContent>
      </Card>
      
      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <NotificationTypeToggle
            icon={<MessageSquare className="w-4 h-4 text-blue-500" />}
            title="Chat Messages"
            description="New messages in trip chats"
            enabled={chatMessages}
            onChange={setChatMessages}
          />
          
          <Separator />
          
          <NotificationTypeToggle
            icon={<Calendar className="w-4 h-4 text-purple-500" />}
            title="Trip Updates"
            description="Itinerary changes and trip reminders"
            enabled={tripUpdates}
            onChange={setTripUpdates}
          />
          
          <Separator />
          
          <NotificationTypeToggle
            icon={<DollarSign className="w-4 h-4 text-green-500" />}
            title="Payment Alerts"
            description="Payment requests and expense splits"
            enabled={paymentAlerts}
            onChange={setPaymentAlerts}
          />
          
          <Separator />
          
          <NotificationTypeToggle
            icon={<AtSign className="w-4 h-4 text-pink-500" />}
            title="Mentions"
            description="When someone @mentions you"
            enabled={mentions}
            onChange={setMentions}
          />
          
          <Separator />
          
          <NotificationTypeToggle
            icon={<Megaphone className="w-4 h-4 text-red-500" />}
            title="Broadcasts"
            description="Important announcements from trip organizers"
            enabled={broadcasts}
            onChange={setBroadcasts}
          />
        </CardContent>
      </Card>
      
      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause notifications during specific times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Quiet Hours</Label>
              <p className="text-xs text-muted-foreground">
                Silence notifications during set hours
              </p>
            </div>
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={setQuietHoursEnabled}
            />
          </div>
          
          {quietHoursEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Select value={quietStart} onValueChange={setQuietStart}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.filter(t => parseInt(t.value) >= 20 || parseInt(t.value) === 0).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Select value={quietEnd} onValueChange={setQuietEnd}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.filter(t => parseInt(t.value) <= 9).map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
      
      {/* iOS Instructions Modal */}
      <IOSAddToHomeModal
        open={showIOSInstructions}
        onClose={hideIOSModal}
        onEmailFallback={enableEmailFallback}
        userEmail={user?.email}
      />
    </div>
  );
};

export default NotificationSettings;
