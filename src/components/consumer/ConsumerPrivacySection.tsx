import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';
import { DataExportSection } from '../settings/DataExportSection';

export const ConsumerPrivacySection = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const { showDemoContent } = useDemoMode();

  const [settings, setSettings] = useState({
    shareEmail: false,
    sharePhoneNumber: false,
  });

  // Load settings from profile
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        shareEmail: user.showEmail || false,
        sharePhoneNumber: user.showPhone || false,
      }));
    }
  }, [user]);

  const handleToggle = async (setting: keyof typeof settings) => {
    const newValue = !settings[setting];
    const updatedSettings = { ...settings, [setting]: newValue };

    setSettings(updatedSettings);

    // In demo mode, just update local state without API calls
    if (showDemoContent) {
      return;
    }

    // Persist to database
    if (user?.id) {
      try {
        const updates: { show_email?: boolean; show_phone?: boolean } = {};

        if (setting === 'shareEmail') {
          updates.show_email = newValue;
        }
        if (setting === 'sharePhoneNumber') {
          updates.show_phone = newValue;
        }

        const { error } = await updateProfile(updates);

        if (error) throw error;

        toast({
          title: 'Settings updated',
          description: 'Your privacy settings have been saved.',
        });
      } catch (error) {
        console.error('Error saving privacy settings:', error);
        // Revert on error
        setSettings(settings);
        toast({
          title: 'Error',
          description: 'Failed to save privacy settings. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">Privacy & Security</h3>

      {/* Contact Information Privacy */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Contact Information</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Share Email with Trip Members</div>
              <div className="text-sm text-gray-400">
                Allow trip members to see your email address for direct contact
              </div>
            </div>
            <button
              onClick={() => handleToggle('shareEmail')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.shareEmail ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  settings.shareEmail ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Share Phone Number with Trip Members</div>
              <div className="text-sm text-gray-400">
                Allow trip members to see your phone number for direct contact
              </div>
            </div>
            <button
              onClick={() => handleToggle('sharePhoneNumber')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.sharePhoneNumber ? 'bg-glass-orange' : 'bg-gray-600'
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
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Change Password</div>
              <div className="text-sm text-gray-400">Update your account password</div>
            </div>
            <div className="text-glass-orange">→</div>
          </button>
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Two-Factor Authentication</div>
              <div className="text-sm text-gray-400">
                Add an extra layer of security to your account
              </div>
            </div>
            <div className="text-glass-orange">Set Up</div>
          </button>
          <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            <div className="text-left">
              <div className="text-white font-medium">Login History</div>
              <div className="text-sm text-gray-400">View recent login activity</div>
            </div>
            <div className="text-glass-orange">→</div>
          </button>
        </div>
      </div>

      {/* Data Export - GDPR Compliance */}
      <DataExportSection />
    </div>
  );
};
