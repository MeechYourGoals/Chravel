import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { userPreferencesService, NotificationPreferences } from '@/services/userPreferencesService';
import { useToast } from '@/hooks/use-toast';

interface EnterpriseNotificationSetting {
  key: string;
  dbKey: keyof NotificationPreferences;
  label: string;
  desc: string;
}

const ENTERPRISE_SETTINGS: EnterpriseNotificationSetting[] = [
  {
    key: 'tripInvites',
    dbKey: 'trip_invites',
    label: 'Trip Invitations',
    desc: 'When you are invited to join a trip',
  },
];

export const EnterpriseNotificationsSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<Record<string, boolean>>({
    tripInvites: true,
  });

  const loadPreferences = useCallback(async () => {
    if (!user?.id) return;
    try {
      const prefs = await userPreferencesService.getNotificationPreferences(user.id);
      setSettings({
        tripInvites: prefs.trip_invites ?? true,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error loading enterprise notification preferences:', error);
      }
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = useCallback(
    async (setting: EnterpriseNotificationSetting, newValue: boolean) => {
      setSettings(prev => ({ ...prev, [setting.key]: newValue }));

      if (!user?.id) return;

      try {
        await userPreferencesService.updateNotificationPreferences(user.id, {
          [setting.dbKey]: newValue,
        });
        toast({
          title: 'Saved',
          description: `${setting.label} ${newValue ? 'enabled' : 'disabled'}.`,
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error saving notification preference:', error);
        }
        setSettings(prev => ({ ...prev, [setting.key]: !newValue }));
        toast({
          title: 'Error',
          description: 'Failed to save preference. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [user?.id, toast],
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-2xl font-bold text-white">Notification Preferences</h3>
        <div className="space-y-3">
          {ENTERPRISE_SETTINGS.map(setting => (
            <div
              key={setting.key}
              className="flex items-center justify-between p-3 bg-white/5 rounded-xl animate-pulse"
            >
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-gray-400" />
                <div>
                  <span className="text-white font-medium">{setting.label}</span>
                  <p className="text-sm text-gray-400">{setting.desc}</p>
                </div>
              </div>
              <div className="w-12 h-6 bg-white/10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">Notification Preferences</h3>

      <div className="space-y-3">
        {ENTERPRISE_SETTINGS.map(setting => {
          const isOn = settings[setting.key] ?? true;
          return (
            <div
              key={setting.key}
              className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-gray-400" />
                <div>
                  <span className="text-white font-medium">{setting.label}</span>
                  <p className="text-sm text-gray-400">{setting.desc}</p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`${setting.label}: ${isOn ? 'on' : 'off'}`}
                onClick={() => handleToggle(setting, !isOn)}
                className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-glass-orange focus:ring-offset-2 focus:ring-offset-transparent ${
                  isOn ? 'bg-glass-orange' : 'bg-white/20'
                }`}
              >
                <div
                  className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                    isOn ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
