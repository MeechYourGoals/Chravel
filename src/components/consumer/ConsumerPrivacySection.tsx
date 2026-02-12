import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';
import { DataExportSection } from '../settings/DataExportSection';

export const ConsumerPrivacySection = () => {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const { showDemoContent } = useDemoMode();

  const [settings, setSettings] = useState({
    useRealName: false,
    useDisplayNameOnly: true,
    sharePhoneNumber: false,
  });

  // Load settings from profile - name_preference drives Use Real Name / Use Display Name Only
  useEffect(() => {
    if (user) {
      const useReal = user.namePreference === 'real';
      setSettings(prev => ({
        ...prev,
        sharePhoneNumber: user.showPhone || false,
        useRealName: useReal,
        useDisplayNameOnly: !useReal,
      }));
    }
  }, [user]);

  const handleToggle = async (setting: keyof typeof settings) => {
    const newValue = !settings[setting];

    // Handle mutually exclusive toggles for display name (radio behavior)
    let updatedSettings = { ...settings };

    if (setting === 'useRealName') {
      updatedSettings = {
        ...settings,
        useRealName: newValue,
        useDisplayNameOnly: !newValue,
      };
    } else if (setting === 'useDisplayNameOnly') {
      updatedSettings = {
        ...settings,
        useDisplayNameOnly: newValue,
        useRealName: !newValue,
      };
    } else {
      updatedSettings[setting] = newValue;
    }

    setSettings(updatedSettings);

    // In demo mode, just update local state without API calls
    if (showDemoContent) {
      return;
    }

    // Persist to database
    if (user?.id) {
      try {
        const updates: Record<string, unknown> = {};

        if (setting === 'useRealName' || setting === 'useDisplayNameOnly') {
          updates.name_preference = updatedSettings.useRealName ? 'real' : 'display';
        }
        if (setting === 'sharePhoneNumber') {
          updates.show_phone = newValue;
        }

        const { error } = await updateProfile(updates as Parameters<typeof updateProfile>[0]);

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

      {/* Display Name Privacy */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Display Name Settings</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <div className="text-white font-medium">Use Real Name</div>
              <div className="text-sm text-gray-400">Show your real name to other users</div>
            </div>
            <button
              onClick={() => handleToggle('useRealName')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.useRealName ? 'bg-glass-orange' : 'bg-gray-600'
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
              <div className="text-white font-medium">Use Display Name Only</div>
              <div className="text-sm text-gray-400">Show only your chosen display name</div>
            </div>
            <button
              onClick={() => handleToggle('useDisplayNameOnly')}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.useDisplayNameOnly ? 'bg-glass-orange' : 'bg-gray-600'
              }`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  settings.useDisplayNameOnly ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Contact Information Privacy */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Contact Information</h4>
        <div className="space-y-3">
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
