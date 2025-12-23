
import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, MessageCircle, Radio, Calendar, DollarSign, CheckSquare, BarChart2, UserPlus, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { userPreferencesService, NotificationPreferences } from '../../services/userPreferencesService';
import { useToast } from '../../hooks/use-toast';
import { useNativePush } from '@/hooks/useNativePush';

interface NotificationCategory {
  key: string;
  dbKey: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    key: 'messages',
    dbKey: 'chat_messages',
    label: 'Messages',
    description: 'Get notified when someone sends you a message',
    icon: <MessageCircle size={16} className="text-blue-400" />
  },
  {
    key: 'broadcasts',
    dbKey: 'broadcasts',
    label: 'Broadcasts',
    description: 'Receive important announcements from trip organizers',
    icon: <Radio size={16} className="text-red-400" />
  },
  {
    key: 'calendar',
    dbKey: 'calendar_events',
    label: 'Calendar Events',
    description: 'Get notified when events are added or updated',
    icon: <Calendar size={16} className="text-purple-400" />
  },
  {
    key: 'payments',
    dbKey: 'payments',
    label: 'Payments',
    description: 'Get notified about payment requests and settlements',
    icon: <DollarSign size={16} className="text-green-400" />
  },
  {
    key: 'tasks',
    dbKey: 'tasks',
    label: 'Tasks',
    description: 'Get notified when tasks are assigned or completed',
    icon: <CheckSquare size={16} className="text-yellow-400" />
  },
  {
    key: 'polls',
    dbKey: 'polls',
    label: 'Polls',
    description: 'Get notified when new polls are created',
    icon: <BarChart2 size={16} className="text-cyan-400" />
  },
  {
    key: 'joinRequests',
    dbKey: 'join_requests',
    label: 'Join Requests',
    description: 'Get notified when someone requests to join your trip',
    icon: <UserPlus size={16} className="text-orange-400" />
  },
  {
    key: 'basecampUpdates',
    dbKey: 'basecamp_updates',
    label: 'Basecamp Updates',
    description: 'Get notified when trip basecamp location changes',
    icon: <MapPin size={16} className="text-pink-400" />
  }
];

export const ConsumerNotificationsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isNative: isNativePush, registerForPush, unregisterFromPush } = useNativePush();
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  
  // State for notification settings - matching database columns
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>({
    messages: true,
    broadcasts: true,
    calendar: true,
    payments: true,
    tasks: true,
    polls: true,
    joinRequests: true,
    basecampUpdates: true,
    email: true,
    push: false,
    sms: false,
    quietHours: false
  });

  const [quietTimes, setQuietTimes] = useState({
    start: '22:00',
    end: '08:00'
  });

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
          messages: prefs.chat_messages ?? false,
          broadcasts: prefs.broadcasts ?? true,
          calendar: prefs.calendar_events ?? true,
          payments: prefs.payments ?? true,
          tasks: prefs.tasks ?? true,
          polls: prefs.polls ?? true,
          joinRequests: prefs.join_requests ?? true,
          basecampUpdates: prefs.basecamp_updates ?? true,
          email: prefs.email_enabled ?? true,
          push: prefs.push_enabled ?? false,
          sms: prefs.sms_enabled ?? false,
          quietHours: prefs.quiet_hours_enabled ?? false
        });
        setQuietTimes({
          start: prefs.quiet_start || '22:00',
          end: prefs.quiet_end || '08:00'
        });
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPreferences();
  }, [user?.id]);

  const handleNotificationToggle = async (setting: string) => {
    const newValue = !notificationSettings[setting];

    // Map local state keys to database column names
    const keyMap: Record<string, keyof NotificationPreferences> = {
      messages: 'chat_messages',
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

  const handleQuietTimeChange = async (field: 'start' | 'end', value: string) => {
    setQuietTimes(prev => ({ ...prev, [field]: value }));
    
    if (user?.id) {
      try {
        const updates: Partial<NotificationPreferences> = {
          [field === 'start' ? 'quiet_start' : 'quiet_end']: value
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
      className={`relative w-12 h-6 rounded-full transition-colors ${
        isEnabled ? 'bg-glass-orange' : 'bg-gray-600'
      }`}
    >
      <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
        isEnabled ? 'translate-x-6' : 'translate-x-0.5'
      }`} />
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
        <p className="text-sm text-gray-400 mb-4">Choose which types of notifications you want to receive</p>
        
        <div className="space-y-3">
          {NOTIFICATION_CATEGORIES.map((category) => (
            <div key={category.key} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
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
                <span className="text-white font-medium">SMS Notifications</span>
                <p className="text-sm text-gray-400">Get text messages for urgent updates</p>
              </div>
            </div>
            {renderToggle('sms', notificationSettings.sms)}
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
                    onChange={(e) => handleQuietTimeChange('start', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">End Time</label>
                  <input 
                    type="time" 
                    value={quietTimes.end}
                    onChange={(e) => handleQuietTimeChange('end', e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
