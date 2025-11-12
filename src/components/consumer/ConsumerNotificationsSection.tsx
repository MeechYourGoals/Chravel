
import React, { useState } from 'react';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const ConsumerNotificationsSection = () => {
  const { user } = useAuth();
  const [isTesting, setIsTesting] = useState<string | null>(null);
  
  // Local state for notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    messages: true,
    broadcasts: true,
    tripUpdates: true,
    email: true,
    push: false,
    sms: false,
    quietHours: true,
    vibration: true,
    badgeCount: true
  });

  // Create mock user for demo mode when no real user is authenticated
  const mockUser = {
    id: 'demo-user-123',
    email: 'demo@example.com',
    displayName: 'Demo User'
  };

  const currentUser = user || mockUser;

  const handleNotificationToggle = (setting: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting as keyof typeof prev]
    }));
  };

  const handleTestNotification = async (type: string) => {
    setIsTesting(type);

    try {
      // Mock test notification
      if (type === 'push' && 'Notification' in window) {
        new Notification('Test Notification', {
          body: 'This is a test push notification from your travel app!',
          icon: '/chravel-logo.png'
        });
      }
    } catch (error) {
      console.error('Test notification error:', error);
    } finally {
      setTimeout(() => setIsTesting(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
        <Bell size={24} className="text-glass-orange" />
        Notification Preferences
      </h3>

      {/* Basic Notification Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">App Notifications</h4>
        
        <div className="space-y-4">
          {Object.entries(notificationSettings).filter(([key]) => 
            ['messages', 'broadcasts', 'tripUpdates'].includes(key)
          ).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-gray-400" />
                <div>
                  <span className="text-white capitalize font-medium">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <p className="text-sm text-gray-400">
                    {key === 'messages' && 'Get notified when someone sends you a message'}
                    {key === 'broadcasts' && 'Receive important announcements from trip organizers'}
                    {key === 'tripUpdates' && 'Stay informed about changes to your trips'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleNotificationToggle(key)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  value ? 'bg-glass-orange' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  value ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Methods */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Delivery Methods</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-glass-orange" />
              <div>
                <span className="text-white font-medium">Push Notifications</span>
                <p className="text-sm text-gray-400">Real-time notifications on your device</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTestNotification('push')}
                disabled={isTesting === 'push'}
                className="bg-glass-orange/20 hover:bg-glass-orange/30 disabled:opacity-50 text-glass-orange px-3 py-1 rounded-lg text-sm transition-colors"
              >
                {isTesting === 'push' ? 'Testing...' : 'Test'}
              </button>
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
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-blue-400" />
              <div>
                <span className="text-white font-medium">Email Notifications</span>
                <p className="text-sm text-gray-400">Receive notifications via email</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTestNotification('email')}
                disabled={isTesting === 'email'}
                className="bg-blue-400/20 hover:bg-blue-400/30 disabled:opacity-50 text-blue-400 px-3 py-1 rounded-lg text-sm transition-colors"
              >
                {isTesting === 'email' ? 'Testing...' : 'Test'}
              </button>
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
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone size={16} className="text-green-400" />
              <div>
                <span className="text-white font-medium">SMS Notifications</span>
                <p className="text-sm text-gray-400">Get text messages for urgent updates</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleTestNotification('sms')}
                disabled={isTesting === 'sms'}
                className="bg-green-400/20 hover:bg-green-400/30 disabled:opacity-50 text-green-400 px-3 py-1 rounded-lg text-sm transition-colors"
              >
                {isTesting === 'sms' ? 'Testing...' : 'Test'}
              </button>
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
      </div>

      {/* Notification Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-4">Notification Settings</h4>
        
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-3">
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
          
          <div className="p-4 bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-medium">Notification Sound</div>
              <button
                onClick={() => handleTestNotification('sound')}
                disabled={isTesting === 'sound'}
                className="bg-glass-orange/20 hover:bg-glass-orange/30 disabled:opacity-50 text-glass-orange px-3 py-1 rounded-lg text-sm transition-colors"
              >
                {isTesting === 'sound' ? 'Playing...' : 'Test Sound'}
              </button>
            </div>
            <select className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50">
              <option>Default</option>
              <option>Chime</option>
              <option>Bell</option>
              <option>Ping</option>
              <option>Silent</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
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
          
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
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
