import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  Radio,
  Calendar,
  DollarSign,
  CheckSquare,
  BarChart2,
  UserPlus,
  MapPin,
  X,
  Phone,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  userPreferencesService,
  NotificationPreferences,
} from '../../services/userPreferencesService';
import { notificationService } from '../../services/notificationService';
import { useToast } from '../../hooks/use-toast';
import { useNativePush } from '@/hooks/useNativePush';
import { useDemoMode } from '../../hooks/useDemoMode';
import { Button } from '../ui/button';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPreviewPanel } from '@/components/dev/NotificationPreviewPanel';

interface NotificationCategory {
  key: string;
  dbKey: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'broadcasts',
    dbKey: 'broadcasts',
    label: 'Broadcasts',
    description: 'Receive important announcements from trip organizers',
    icon: <Radio size={16} className="text-red-400" />,
  },
  {
    key: 'calendar',
    dbKey: 'calendar_events',
    label: 'Calendar Events',
    description: 'Get notified when events are added or updated',
    icon: <Calendar size={16} className="text-purple-400" />,
  },
  {
    key: 'payments',
    dbKey: 'payments',
    label: 'Payments',
    description: 'Get notified about payment requests and settlements',
    icon: <DollarSign size={16} className="text-green-400" />,
  },
  {
    key: 'tasks',
    dbKey: 'tasks',
    label: 'Tasks',
    description: 'Get notified when tasks are assigned or completed',
    icon: <CheckSquare size={16} className="text-yellow-400" />,
  },
  {
    key: 'polls',
    dbKey: 'polls',
    label: 'Polls',
    description: 'Get notified when new polls are created',
    icon: <BarChart2 size={16} className="text-cyan-400" />,
  },
  {
    key: 'joinRequests',
    dbKey: 'join_requests',
    label: 'Join Requests',
    description: 'Get notified when someone requests to join your trip',
    icon: <UserPlus size={16} className="text-orange-400" />,
  },
  {
    key: 'basecampUpdates',
    dbKey: 'basecamp_updates',
    label: 'Basecamp Updates',
    description: 'Get notified when trip basecamp location changes',
    icon: <MapPin size={16} className="text-pink-400" />,
  },
];

export const ConsumerNotificationsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isNative: isNativePush, registerForPush, unregisterFromPush } = useNativePush();
  const { showDemoContent } = useDemoMode();
  const { tier, isSuperAdmin } = useConsumerSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);

  // SMS phone number modal state
  const [showSmsPhoneModal, setShowSmsPhoneModal] = useState(false);
  const [smsPhoneNumber, setSmsPhoneNumber] = useState('');
  const [smsPhoneInput, setSmsPhoneInput] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [lastSmsStatus, setLastSmsStatus] = useState<{
    status: string;
    externalId?: string;
    errorMessage?: string;
    createdAt?: string;
  } | null>(null);

  // State for notification settings - matching database columns
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({
    broadcasts: true,
    calendar: true,
    payments: true,
    tasks: true,
    polls: true,
    joinRequests: true,
    basecampUpdates: true,
    email: false,
    push: true,
    sms: false,
    quietHours: false,
  });

  const [quietTimes, setQuietTimes] = useState({
    start: '22:00',
    end: '08:00',
  });

  const smsDeliveryEligible =
    isSuperAdmin || tier === 'frequent-chraveler' || tier.startsWith('pro-');

  const fetchLastSmsStatus = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notification_logs')
      .select('status, external_id, error_message, created_at')
      .eq('user_id', user.id)
      .eq('type', 'sms')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setLastSmsStatus({
        status: data.status ?? 'unknown',
        externalId: data.external_id ?? undefined,
        errorMessage: data.error_message ?? undefined,
        createdAt: data.created_at ?? undefined,
      });
    } else {
      setLastSmsStatus(null);
    }
  }, [user?.id]);

  // Phone number validation helper
  const validatePhoneNumber = useCallback((phone: string): boolean => {
    // Remove all non-numeric characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    // Must have at least 10 digits and optionally start with +
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(cleaned);
  }, []);

  // Format phone number for display
  const formatPhoneNumber = useCallback((phone: string): string => {
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  }, []);

  useEffect(() => {
    if (user?.id && smsPhoneNumber && smsDeliveryEligible) {
      void fetchLastSmsStatus();
    } else {
      setLastSmsStatus(null);
    }
  }, [user?.id, smsPhoneNumber, smsDeliveryEligible, fetchLastSmsStatus]);

  // Load notification preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const prefs = await userPreferencesService.getNotificationPreferences(user.id);
        setNotificationSettings({
          broadcasts: prefs.broadcasts ?? true,
          calendar: prefs.calendar_events ?? true,
          payments: prefs.payments ?? true,
          tasks: prefs.tasks ?? true,
          polls: prefs.polls ?? true,
          joinRequests: prefs.join_requests ?? true,
          basecampUpdates: prefs.basecamp_updates ?? true,
          email: prefs.email_enabled ?? false,
          push: prefs.push_enabled ?? true,
          sms: prefs.sms_enabled ?? false,
          quietHours: prefs.quiet_hours_enabled ?? false,
        });
        setQuietTimes({
          start: prefs.quiet_start || '22:00',
          end: prefs.quiet_end || '08:00',
        });
        // Load SMS phone number if it exists
        if (prefs.sms_phone_number) {
          setSmsPhoneNumber(prefs.sms_phone_number);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, [user?.id]);

  // Auto-disable SMS when entitlement is lost.
  useEffect(() => {
    const disableSmsIfIneligible = async () => {
      if (!user?.id || showDemoContent || smsDeliveryEligible || !notificationSettings.sms) return;

      setNotificationSettings(prev => ({ ...prev, sms: false }));
      try {
        await userPreferencesService.updateNotificationPreferences(user.id, { sms_enabled: false });
      } catch (error) {
        console.error('Failed to auto-disable SMS for ineligible user:', error);
      }
    };

    void disableSmsIfIneligible();
  }, [notificationSettings.sms, showDemoContent, smsDeliveryEligible, user?.id]);

  const handleNotificationToggle = async (setting: string) => {
    const newValue = !notificationSettings[setting];

    if (setting === 'sms' && !smsDeliveryEligible) {
      toast({
        title: 'Upgrade required',
        description: 'SMS notifications are available on Frequent Chraveler and Pro plans.',
      });
      return;
    }

    // In demo mode, just update local state without API calls
    if (showDemoContent) {
      setNotificationSettings(prev => ({
        ...prev,
        [setting]: newValue,
      }));
      return;
    }

    // Map local state keys to database column names
    const keyMap: Record<string, keyof NotificationPreferences> = {
      broadcasts: 'broadcasts',
      calendar: 'calendar_events',
      payments: 'payments',
      tasks: 'tasks',
      polls: 'polls',
      joinRequests: 'join_requests',
      basecampUpdates: 'basecamp_updates',
      email: 'email_enabled',
      push: 'push_enabled',
      sms: 'sms_enabled',
      quietHours: 'quiet_hours_enabled',
    };

    const dbKey = keyMap[setting];
    if (!dbKey) return;

    // SMS notifications: prompt for phone number when enabling if not already set
    if (setting === 'sms' && newValue && !smsPhoneNumber) {
      setSmsPhoneInput('');
      setPhoneError('');
      setShowSmsPhoneModal(true);
      return;
    }

    // Push notifications: request/register only when user explicitly enables (native only).
    if (setting === 'push' && user?.id && isNativePush) {
      setIsUpdatingPush(true);
      try {
        if (newValue) {
          const token = await registerForPush();
          if (!token) {
            toast({
              title: 'Push notifications not enabled',
              description: 'Allow notifications in iOS Settings to receive alerts.',
              variant: 'destructive',
            });
            return;
          }
        } else {
          await unregisterFromPush();
        }

        setNotificationSettings(prev => ({ ...prev, push: newValue }));
        await userPreferencesService.updateNotificationPreferences(user.id, { [dbKey]: newValue });
        return;
      } catch (error) {
        console.error('Error updating push notifications:', error);
        toast({
          title: 'Error',
          description: 'Failed to update push notifications. Please try again.',
          variant: 'destructive',
        });
        return;
      } finally {
        setIsUpdatingPush(false);
      }
    }

    // Default: update local state immediately for responsiveness
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: newValue,
    }));

    // Persist to database if user is authenticated
    if (user?.id) {
      try {
        await userPreferencesService.updateNotificationPreferences(user.id, { [dbKey]: newValue });
      } catch (error) {
        console.error('Error saving notification preference:', error);
        // Revert on error
        setNotificationSettings(prev => ({
          ...prev,
          [setting]: !newValue,
        }));
        toast({
          title: 'Error',
          description: 'Failed to save preference. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  // Send test SMS — truth-based: only show success when we have a valid Message SID
  const handleSendTestSms = useCallback(async () => {
    if (!user?.id || !smsPhoneNumber) return;
    if (!smsDeliveryEligible) {
      toast({
        title: 'Upgrade required',
        description: 'SMS is available on Frequent Chraveler and Pro plans.',
        variant: 'destructive',
      });
      return;
    }
    setIsSendingTestSms(true);
    try {
      const result = await notificationService.sendSMSNotification(
        user.id,
        'Chravel: Test message — SMS notifications are working!',
      );
      if (result.success && result.sid) {
        toast({
          title: 'Test SMS sent',
          description: `Queued (SID: ${result.sid}). Check ${formatPhoneNumber(smsPhoneNumber)} for the message.`,
        });
        void fetchLastSmsStatus();
      } else {
        const desc = result.errorMessage || 'Check your settings and try again.';
        const hint =
          result.errorCode === 21610
            ? ' Verify your phone number in the Twilio console (trial accounts).'
            : '';
        toast({
          title: 'Failed to send',
          description: desc + hint,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Test SMS error:', error);
      toast({ title: 'Error', description: 'Could not send test SMS.', variant: 'destructive' });
    } finally {
      setIsSendingTestSms(false);
    }
  }, [user?.id, smsPhoneNumber, smsDeliveryEligible, toast, formatPhoneNumber, fetchLastSmsStatus]);

  // Handle SMS phone number submission
  const handleSmsPhoneSubmit = async () => {
    if (!user?.id) return;

    if (!smsDeliveryEligible) {
      setPhoneError('Upgrade required to enable SMS notifications.');
      return;
    }

    // Validate phone number
    if (!validatePhoneNumber(smsPhoneInput)) {
      setPhoneError('Please enter a valid phone number (e.g., +1 555-123-4567)');
      return;
    }

    setIsSavingPhone(true);
    setPhoneError('');

    try {
      // Normalize to E.164 (required by DB constraint)
      const digits = smsPhoneInput.replace(/\D/g, '');
      let normalizedPhone: string;
      if (digits.length === 10 && digits[0] >= '2' && digits[0] <= '9') {
        normalizedPhone = `+1${digits}`; // US 10-digit
      } else if (digits.length === 11 && digits[0] === '1') {
        normalizedPhone = `+${digits}`; // US with country code
      } else if (smsPhoneInput.trim().startsWith('+') && digits.length >= 10) {
        normalizedPhone = `+${digits}`;
      } else {
        normalizedPhone = digits.length >= 10 ? `+${digits}` : smsPhoneInput.replace(/[^\d+]/g, '');
      }

      // Save phone number and enable SMS
      await userPreferencesService.updateNotificationPreferences(user.id, {
        sms_enabled: true,
        sms_phone_number: normalizedPhone,
      } as Partial<NotificationPreferences>);

      setSmsPhoneNumber(normalizedPhone);
      setNotificationSettings(prev => ({ ...prev, sms: true }));
      setShowSmsPhoneModal(false);

      toast({
        title: 'SMS notifications enabled',
        description: `You'll receive text messages at ${formatPhoneNumber(normalizedPhone)}`,
      });
    } catch (error) {
      console.error('Error saving SMS phone number:', error);
      setPhoneError('Failed to save phone number. Please try again.');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleQuietTimeChange = async (field: 'start' | 'end', value: string) => {
    setQuietTimes(prev => ({ ...prev, [field]: value }));

    // In demo mode, just update local state without API calls
    if (showDemoContent) {
      return;
    }

    if (user?.id) {
      try {
        const updates: Partial<NotificationPreferences> = {
          [field === 'start' ? 'quiet_start' : 'quiet_end']: value,
        };
        await userPreferencesService.updateNotificationPreferences(user.id, updates);
      } catch (error) {
        console.error('Error saving quiet time:', error);
      }
    }
  };

  const renderToggle = (key: string, isEnabled: boolean, isDisabled?: boolean) => (
    <button
      onClick={() => handleNotificationToggle(key)}
      disabled={isDisabled}
      aria-checked={isEnabled}
      role="switch"
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        isEnabled ? 'bg-green-500' : 'bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          isEnabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bell size={24} className="text-glass-orange" />
        Notification Preferences
      </h3>

      {/* App Notification Categories */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">App Notifications</h4>
        <p className="text-sm text-gray-400 mb-4">
          Choose which types of notifications you want to receive
        </p>

        <div className="space-y-3">
          {NOTIFICATION_CATEGORIES.map(category => (
            <div
              key={category.key}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {category.icon}
                <div>
                  <span className="text-white font-medium">{category.label}</span>
                  <p className="text-sm text-gray-400">{category.description}</p>
                </div>
              </div>
              {renderToggle(category.key, notificationSettings[category.key] ?? true)}
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Methods */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Delivery Methods</h4>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-glass-orange" />
              <div>
                <span className="text-white font-medium">Push Notifications</span>
                <p className="text-sm text-gray-400">Real-time notifications on your device</p>
              </div>
            </div>
            {renderToggle('push', notificationSettings.push, isUpdatingPush)}
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-blue-400" />
              <div>
                <span className="text-white font-medium">Email Notifications</span>
                <p className="text-sm text-gray-400">Receive notifications via email</p>
              </div>
            </div>
            {renderToggle('email', notificationSettings.email)}
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone size={16} className="text-green-400" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">SMS Notifications</span>
                  {!smsDeliveryEligible && <Lock size={12} className="text-amber-400" />}
                </div>
                <p className="text-sm text-gray-400">
                  {!smsDeliveryEligible
                    ? 'Upgrade required for SMS delivery'
                    : smsPhoneNumber
                      ? `Texts sent to ${formatPhoneNumber(smsPhoneNumber)}`
                      : 'Get text messages for urgent updates'}
                </p>
                {smsPhoneNumber && notificationSettings.sms && smsDeliveryEligible && (
                  <div className="mt-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSmsPhoneInput(smsPhoneNumber);
                          setPhoneError('');
                          setShowSmsPhoneModal(true);
                        }}
                        className="text-xs text-glass-orange hover:text-glass-yellow"
                      >
                        Change number
                      </button>
                      <span className="text-gray-500">•</span>
                      <button
                        onClick={handleSendTestSms}
                        disabled={isSendingTestSms}
                        className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                      >
                        {isSendingTestSms ? 'Sending...' : 'Send test SMS'}
                      </button>
                    </div>
                    {lastSmsStatus && (
                      <p className="text-xs text-gray-500">
                        Last test:{' '}
                        {lastSmsStatus.status === 'sent' || lastSmsStatus.status === 'queued' ? (
                          <>
                            <span className="text-green-400">
                              {lastSmsStatus.status}
                              {lastSmsStatus.externalId
                                ? ` (SID: ${lastSmsStatus.externalId})`
                                : ''}
                            </span>
                          </>
                        ) : (
                          <span className="text-amber-400">
                            {lastSmsStatus.status}
                            {lastSmsStatus.errorMessage
                              ? ` — ${lastSmsStatus.errorMessage.substring(0, 80)}${lastSmsStatus.errorMessage.length > 80 ? '…' : ''}`
                              : ''}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                )}
                {!smsDeliveryEligible && (
                  <p className="text-xs text-amber-400 mt-1">
                    Upgrade to Frequent Chraveler to unlock SMS
                  </p>
                )}
              </div>
            </div>
            {renderToggle('sms', notificationSettings.sms, !smsDeliveryEligible)}
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Quiet Hours</h4>

        <div className="space-y-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-medium">Enable Quiet Hours</div>
              {renderToggle('quietHours', notificationSettings.quietHours)}
            </div>
            {notificationSettings.quietHours && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={quietTimes.start}
                    onChange={e => handleQuietTimeChange('start', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">End Time</label>
                  <input
                    type="time"
                    value={quietTimes.end}
                    onChange={e => handleQuietTimeChange('end', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dev-only Notification Preview */}
      {import.meta.env.DEV && <NotificationPreviewPanel />}

      {/* SMS Phone Number Modal */}
      {showSmsPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSmsPhoneModal(false)}
          />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <button
              onClick={() => setShowSmsPhoneModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Phone size={24} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Enable SMS Notifications</h3>
                <p className="text-sm text-gray-400">
                  Enter your mobile number to receive text alerts
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="sms-phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Mobile Phone Number
                </label>
                <input
                  id="sms-phone"
                  type="tel"
                  value={smsPhoneInput}
                  onChange={e => {
                    setSmsPhoneInput(e.target.value);
                    setPhoneError('');
                  }}
                  placeholder="+1 (555) 123-4567"
                  className={`w-full bg-gray-800 border ${
                    phoneError ? 'border-red-500' : 'border-gray-600'
                  } text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500/50 placeholder-gray-500`}
                  autoFocus
                />
                {phoneError && <p className="text-sm text-red-400 mt-2">{phoneError}</p>}
                <p className="text-xs text-gray-500 mt-2">
                  Standard messaging rates may apply. You can disable SMS anytime.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowSmsPhoneModal(false)}
                  className="flex-1"
                  disabled={isSavingPhone}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSmsPhoneSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isSavingPhone || !smsPhoneInput.trim()}
                >
                  {isSavingPhone ? 'Saving...' : 'Enable SMS'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
