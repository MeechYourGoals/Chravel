import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTripVariant } from '../../contexts/TripVariantContext';

export const NotificationsSection = () => {
  const { user, updateNotificationSettings } = useAuth();
  const { accentColors } = useTripVariant();

  if (!user) return null;

  const handleNotificationToggle = (setting: string) => {
    updateNotificationSettings({
      [setting]: !user.notificationSettings[setting as keyof typeof user.notificationSettings],
    });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">Notification Preferences</h3>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">App Notifications</h4>
        <div className="space-y-3">
          {Object.entries(user.notificationSettings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-gray-400" />
                <span className="text-white capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
              <button
                onClick={() => handleNotificationToggle(key)}
                aria-checked={value}
                role="switch"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  value ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                    value ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
