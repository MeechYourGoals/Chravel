
import React, { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { userPreferencesService, NotificationPreferences } from '../../services/userPreferencesService';
import { useToast } from '../../hooks/use-toast';

export const ConsumerNotificationsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  // State for notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    messages: true,
    broadcasts: true,
    email: true,
    push: false,
    sms: false,
    quietHours: true,
    vibration: true,
    badgeCount: true,
    quietStart: '22:00',
    quietEnd: '08:00'
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
          messages: prefs.chat_messages,
          broadcasts: prefs.broadcasts,
          email: prefs.email_enabled,
          push: prefs.push_enabled,
          sms: prefs.sms_enabled,
          quietHours: prefs.quiet_hours_enabled,
          vibration: true,
          badgeCount: true,
          quietStart: prefs.quiet_start,
          quietEnd: prefs.quiet_end
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
    const newValue = !notificationSettings[setting as keyof typeof notificationSettings];
    
    // Update local state immediately for responsiveness
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: newValue
    }));

    // Persist to database if user is authenticated
    if (user?.id) {
      try {
        const updates: Partial<NotificationPreferences> = {};
        
        switch (setting) {
          case 'messages':
            updates.chat_messages = newValue as boolean;
            break;
          case 'broadcasts':
            updates.broadcasts = newValue as boolean;
            break;
          case 'email':
            updates.email_enabled = newValue as boolean;
            break;
          case 'push':
            updates.push_enabled = newValue as boolean;
            break;
          case 'sms':
            updates.sms_enabled = newValue as boolean;
            break;
          case 'quietHours':
            updates.quiet_hours_enabled = newValue as boolean;
            break;
        }

        await userPreferencesService.updateNotificationPreferences(user.id, updates);
      } catch (error) {
        console.error('Error saving notification preference:', error);
        // Revert on error
        setNotificationSettings(prev => ({
          ...prev,
          [setting]: !newValue
        }));
        toast({
          title: 'Error',
          description: 'Failed to save preference. Please try again.',
          variant: 'destructive'
        });
      }
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bell size={24} className="text-glass-orange" />
        Notification Preferences
      </h3>

      {/* Basic Notification Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">App Notifications</h4>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-gray-400" />
              <div>
                <span className="text-white font-medium">Messages</span>
                <p className="text-sm text-gray-400">Get notified when someone sends you a message</p>
              </div>
            </div>
            <button
              onClick={() => handleNotificationToggle('messages')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.messages ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                notificationSettings.messages ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-gray-400" />
              <div>
                <span className="text-white font-medium">Broadcasts</span>
                <p className="text-sm text-gray-400">Receive important announcements from trip organizers</p>
              </div>
            </div>
            <button
              onClick={() => handleNotificationToggle('broadcasts')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.broadcasts ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                notificationSettings.broadcasts ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
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
            <button
              onClick={() => handleNotificationToggle('push')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.push ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                notificationSettings.push ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-blue-400" />
              <div>
                <span className="text-white font-medium">Email Notifications</span>
                <p className="text-sm text-gray-400">Receive notifications via email</p>
              </div>
            </div>
            <button
              onClick={() => handleNotificationToggle('email')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.email ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                notificationSettings.email ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone size={16} className="text-green-400" />
              <div>
                <span className="text-white font-medium">SMS Notifications</span>
                <p className="text-sm text-gray-400">Get text messages for urgent updates</p>
              </div>
            </div>
            <button
              onClick={() => handleNotificationToggle('sms')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.sms ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                notificationSettings.sms ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Notification Settings</h4>
        
        <div className="space-y-3">
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-medium">Quiet Hours</div>
              <button
                onClick={() => handleNotificationToggle('quietHours')}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notificationSettings.quietHours ? 'bg-glass-orange' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  notificationSettings.quietHours ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Start Time</label>
                <input 
                  type="time" 
                  defaultValue="22:00"
                  className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">End Time</label>
                <input 
                  type="time" 
                  defaultValue="08:00"
                  className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
                />
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white font-medium">Notification Sound</div>
            </div>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>Default</option>
              <option>Chime</option>
              <option>Bell</option>
              <option>Ping</option>
              <option>Silent</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Vibration</div>
              <div className="text-sm text-gray-400">Enable vibration for mobile notifications</div>
            </div>
            <button
              onClick={() => handleNotificationToggle('vibration')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.vibration ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                notificationSettings.vibration ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Badge Count</div>
              <div className="text-sm text-gray-400">Show unread count on app icon</div>
            </div>
            <button
              onClick={() => handleNotificationToggle('badgeCount')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                notificationSettings.badgeCount ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                notificationSettings.badgeCount ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
