import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const EnterprisePrivacySection = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    useRealName: false,
    showJobTitle: false,
    sharePhoneNumber: false,
  });
  const [jobTitle, setJobTitle] = useState('');

  useEffect(() => {
    if (user) {
      setSettings({
        useRealName: user.namePreference === 'real',
        showJobTitle: user.showJobTitle ?? false,
        sharePhoneNumber: user.showPhone ?? false,
      });
      setJobTitle(user.jobTitle ?? '');
    }
  }, [user]);

  const handleToggle = useCallback(
    async (setting: keyof typeof settings) => {
      const newValue = !settings[setting];
      const prev = { ...settings };

      setSettings(s => ({ ...s, [setting]: newValue }));

      if (!user?.id) return;

      try {
        const updates: Record<string, unknown> = {};
        if (setting === 'useRealName') {
          updates.name_preference = newValue ? 'real' : 'display';
        } else if (setting === 'showJobTitle') {
          updates.show_job_title = newValue;
        } else if (setting === 'sharePhoneNumber') {
          updates.show_phone = newValue;
        }

        const { error } = await updateProfile(updates as Parameters<typeof updateProfile>[0]);

        if (error) throw error;

        toast({
          title: 'Saved',
          description: 'Your privacy settings have been updated.',
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error saving privacy settings:', error);
        }
        setSettings(prev);
        toast({
          title: 'Error',
          description: 'Failed to save settings. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [user?.id, settings, updateProfile, toast],
  );

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">Privacy & Security</h3>

      {/* Display Name Privacy */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Display Name Settings</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Use Real Name</div>
              <div className="text-sm text-gray-400">Show your real name to organization members</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.useRealName}
              aria-label="Use Real Name"
              onClick={() => handleToggle('useRealName')}
              className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-glass-orange focus:ring-offset-2 focus:ring-offset-transparent ${
                settings.useRealName ? 'bg-glass-orange' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  settings.useRealName ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Show Job Title</div>
              <div className="text-sm text-gray-400">Display your job title in organization directory</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showJobTitle}
              aria-label="Show Job Title"
              onClick={() => handleToggle('showJobTitle')}
              className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-glass-orange focus:ring-offset-2 focus:ring-offset-transparent ${
                settings.showJobTitle ? 'bg-glass-orange' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  settings.showJobTitle ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              onBlur={async () => {
                if (!user?.id || jobTitle === (user.jobTitle ?? '')) return;
                try {
                  const { error } = await updateProfile({ job_title: jobTitle || null } as Parameters<typeof updateProfile>[0]);
                  if (!error) toast({ title: 'Saved', description: 'Job title updated.' });
                } catch {
                  toast({ title: 'Error', description: 'Failed to save job title.', variant: 'destructive' });
                }
              }}
              placeholder="e.g. Travel Coordinator"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
            <p className="text-xs text-gray-500 mt-1">Shown in organization directory when &quot;Show Job Title&quot; is on</p>
          </div>
        </div>
      </div>

      {/* Contact Information Privacy */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Contact Information</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Share Phone Number</div>
              <div className="text-sm text-gray-400">Allow organization members to see your phone number</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.sharePhoneNumber}
              aria-label="Share Phone Number"
              onClick={() => handleToggle('sharePhoneNumber')}
              className={`relative w-12 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-glass-orange focus:ring-offset-2 focus:ring-offset-transparent ${
                settings.sharePhoneNumber ? 'bg-glass-orange' : 'bg-white/20'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  settings.sharePhoneNumber ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Account Security */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Account Security</h4>
        <div className="space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <div className="text-left">
              <div className="text-white font-medium">Change Password</div>
              <div className="text-sm text-gray-400">Update your account password</div>
            </div>
            <div className="text-glass-orange">→</div>
          </button>
        </div>
      </div>
    </div>
  );
};
