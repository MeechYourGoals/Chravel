import React, { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';
import { supabase } from '../../integrations/supabase/client';
import { DataExportSection } from '../settings/DataExportSection';

function AccountSecuritySection({
  userEmail,
  showDemoContent,
}: {
  userEmail: string | undefined;
  showDemoContent: boolean;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
    setShowForm(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userEmail) {
      setError('Unable to verify account. Please sign in again.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Re-authenticate with current password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });

      if (signInError) {
        setError('Current password is incorrect.');
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully.',
      });
      resetForm();
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <h4 className="text-base font-semibold text-white mb-3">Account Security</h4>
      <div className="space-y-3">
        {!showForm ? (
          <button
            onClick={() => {
              if (showDemoContent) return;
              setShowForm(true);
            }}
            className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            <div className="text-left">
              <div className="text-white font-medium">Change Password</div>
              <div className="text-sm text-gray-400">Update your account password</div>
            </div>
            <div className="text-glass-orange">&rarr;</div>
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3">
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-300 mb-1">Current Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                autoFocus
                className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPassword ? 'Hide' : 'Show'} passwords
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-glass-orange to-glass-yellow text-white rounded-lg hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}
        <div className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg opacity-50 cursor-not-allowed">
          <div className="text-left">
            <div className="text-white font-medium">Two-Factor Authentication</div>
            <div className="text-sm text-gray-400">
              Add an extra layer of security to your account
            </div>
          </div>
          <div className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded">Coming Soon</div>
        </div>
        <div className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg opacity-50 cursor-not-allowed">
          <div className="text-left">
            <div className="text-white font-medium">Login History</div>
            <div className="text-sm text-gray-400">View recent login activity</div>
          </div>
          <div className="text-xs text-gray-500 bg-white/10 px-2 py-1 rounded">Coming Soon</div>
        </div>
      </div>
    </div>
  );
}

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
        const updates: { name_preference?: 'real' | 'display'; show_phone?: boolean } = {};

        if (setting === 'useRealName' || setting === 'useDisplayNameOnly') {
          updates.name_preference = updatedSettings.useRealName ? 'real' : 'display';
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
      <AccountSecuritySection userEmail={user?.email} showDemoContent={showDemoContent} />

      {/* Data Export - GDPR Compliance */}
      <DataExportSection />
    </div>
  );
};
