import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  MessageCircle,
  Radio,
  Calendar,
  CheckSquare,
  BarChart2,
  UserPlus,
  X,
  Phone,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { userPreferencesService, NotificationPreferences } from '@/services/userPreferencesService';
import { notificationService } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import { useNativePush } from '@/hooks/useNativePush';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Button } from '@/components/ui/button';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';

interface EventNotificationCategory {
  key: string;
  dbKey: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const EVENT_NOTIFICATION_CATEGORIES: EventNotificationCategory[] = [
  {
    key: 'chatMessages',
    dbKey: 'chat_messages',
    label: 'Event Chat Messages',
    description: 'Get notified when someone sends a message in event chat',
    icon: <MessageCircle size={16} className="text-blue-400" />,
  },
  {
    key: 'broadcasts',
    dbKey: 'broadcasts',
    label: 'Event Announcements',
    description: 'Receive important announcements from event organizers',
    icon: <Radio size={16} className="text-red-400" />,
  },
  {
    key: 'calendar',
    dbKey: 'calendar_events',
    label: 'Agenda & Reminders',
    description: 'Get notified when the schedule changes or event reminders',
    icon: <Calendar size={16} className="text-purple-400" />,
  },
  {
    key: 'joinRequests',
    dbKey: 'join_requests',
    label: 'RSVP & New Attendees',
    description: 'Get notified when attendees RSVP or join the event',
    icon: <UserPlus size={16} className="text-orange-400" />,
  },
  {
    key: 'tasks',
    dbKey: 'tasks',
    label: 'Task Assignments',
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
];

export const EventNotificationsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isNative: isNativePush, registerForPush, unregisterFromPush } = useNativePush();
  const { showDemoContent } = useDemoMode();
  const { tier, isSuperAdmin } = useConsumerSubscription();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);

  const [showSmsPhoneModal, setShowSmsPhoneModal] = useState(false);
  const [smsPhoneNumber, setSmsPhoneNumber] = useState('');
  const [smsPhoneInput, setSmsPhoneInput] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [isSendingTestSms, setIsSendingTestSms] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({
    chatMessages: true,
    broadcasts: true,
    calendar: true,
    joinRequests: true,
    tasks: true,
    polls: true,
    email: false,
    push: true,
    sms: false,
  });

  const smsDeliveryEligible =
    isSuperAdmin || tier === 'frequent-chraveler' || tier.startsWith('pro-');

  const validatePhoneNumber = useCallback((phone: string): boolean => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    return /^\+?[1-9]\d{9,14}$/.test(cleaned);
  }, []);

  const formatPhoneNumber = useCallback((phone: string): string => {
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 11 && cleaned[0] === '1') {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  }, []);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const prefs = await userPreferencesService.getNotificationPreferences(user.id);
        setNotificationSettings({
          chatMessages: prefs.chat_messages ?? true,
          broadcasts: prefs.broadcasts ?? true,
          calendar: prefs.calendar_events ?? true,
          joinRequests: prefs.join_requests ?? true,
          tasks: prefs.tasks ?? true,
          polls: prefs.polls ?? true,
          email: prefs.email_enabled ?? false,
          push: prefs.push_enabled ?? true,
          sms: prefs.sms_enabled ?? false,
        });
        if (prefs.sms_phone_number) {
          setSmsPhoneNumber(prefs.sms_phone_number);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error loading notification preferences:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, [user?.id]);

  useEffect(() => {
    const disableSmsIfIneligible = async () => {
      if (!user?.id || showDemoContent || smsDeliveryEligible || !notificationSettings.sms) return;
      setNotificationSettings(prev => ({ ...prev, sms: false }));
      try {
        await userPreferencesService.updateNotificationPreferences(user.id, { sms_enabled: false });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to auto-disable SMS for ineligible user:', error);
        }
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

    if (showDemoContent) {
      setNotificationSettings(prev => ({ ...prev, [setting]: newValue }));
      return;
    }

    const categoryMap: Record<string, keyof NotificationPreferences> = {
      chatMessages: 'chat_messages',
      broadcasts: 'broadcasts',
      calendar: 'calendar_events',
      joinRequests: 'join_requests',
      tasks: 'tasks',
      polls: 'polls',
      email: 'email_enabled',
      push: 'push_enabled',
      sms: 'sms_enabled',
    };

    const dbKey = categoryMap[setting];
    if (!dbKey) return;

    if (setting === 'sms' && newValue && !smsPhoneNumber) {
      setSmsPhoneInput('');
      setPhoneError('');
      setShowSmsPhoneModal(true);
      return;
    }

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
        if (import.meta.env.DEV) {
          console.error('Error updating push notifications:', error);
        }
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

    setNotificationSettings(prev => ({ ...prev, [setting]: newValue }));

    if (user?.id) {
      try {
        await userPreferencesService.updateNotificationPreferences(user.id, { [dbKey]: newValue });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error saving notification preference:', error);
        }
        setNotificationSettings(prev => ({ ...prev, [setting]: !newValue }));
        toast({
          title: 'Error',
          description: 'Failed to save preference. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

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
        'Chravel Events: Test message — SMS notifications are working!',
      );
      if (result.success) {
        toast({
          title: 'Test SMS sent',
          description: `Check ${formatPhoneNumber(smsPhoneNumber)} for the message.`,
        });
      } else {
        toast({
          title: 'Failed to send',
          description: result.errorMessage || 'Check your settings and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Test SMS error:', error);
      }
      toast({ title: 'Error', description: 'Could not send test SMS.', variant: 'destructive' });
    } finally {
      setIsSendingTestSms(false);
    }
  }, [user?.id, smsPhoneNumber, smsDeliveryEligible, formatPhoneNumber]);

  const handleSmsPhoneSubmit = async () => {
    if (!user?.id) return;

    if (!smsDeliveryEligible) {
      setPhoneError('Upgrade required to enable SMS notifications.');
      return;
    }

    if (!validatePhoneNumber(smsPhoneInput)) {
      setPhoneError('Please enter a valid phone number (e.g., +1 555-123-4567)');
      return;
    }

    setIsSavingPhone(true);
    setPhoneError('');

    try {
      const digits = smsPhoneInput.replace(/\D/g, '');
      let normalizedPhone: string;
      if (digits.length === 10 && digits[0] >= '2' && digits[0] <= '9') {
        normalizedPhone = `+1${digits}`;
      } else if (digits.length === 11 && digits[0] === '1') {
        normalizedPhone = `+${digits}`;
      } else if (smsPhoneInput.trim().startsWith('+') && digits.length >= 10) {
        normalizedPhone = `+${digits}`;
      } else {
        normalizedPhone = digits.length >= 10 ? `+${digits}` : smsPhoneInput.replace(/[^\d+]/g, '');
      }

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
      if (import.meta.env.DEV) {
        console.error('Error saving SMS phone number:', error);
      }
      setPhoneError('Failed to save phone number. Please try again.');
    } finally {
      setIsSavingPhone(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-glass-orange border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bell size={24} className="text-glass-orange" />
        Event Notifications
      </h3>
      <p className="text-gray-300">
        Manage how you receive updates about events you attend or organize
      </p>

      {/* Event Categories */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Event Notifications</h4>
        <p className="text-sm text-gray-400 mb-4">
          Choose which types of event updates you want to receive
        </p>

        <div className="space-y-3">
          {EVENT_NOTIFICATION_CATEGORIES.map(category => (
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
        <p className="text-sm text-gray-400 mb-4">
          Choose how you receive event notifications (Push, Email, SMS)
        </p>

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
                <p className="text-sm text-gray-400">Receive event notifications via email</p>
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
                      : 'Get text messages for urgent event updates'}
                </p>
                {smsPhoneNumber && notificationSettings.sms && smsDeliveryEligible && (
                  <div className="flex items-center gap-2 mt-1">
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
                  Enter your mobile number to receive text alerts for events
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
