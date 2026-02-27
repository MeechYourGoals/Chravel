import React, { useState, useCallback } from 'react';
import {
  User,
  Bell,
  Lock,
  Globe,
  HelpCircle,
  FileText,
  LogOut,
  Crown,
  Smartphone,
  Moon,
  Sun,
  Shield,
  Mail,
  MessageCircle,
  Star,
  Info,
} from 'lucide-react';
import { hapticService } from '@/services/hapticService';
import { NativeList, NativeListSection, NativeListItem, NativeToggleItem } from './NativeList';
import { NativeLargeTitle } from './NativeLargeTitle';
import { NativeSubscriptionPaywall } from './NativeSubscriptionPaywall';
import {
  getPlatform,
  isNativePlatform,
  launchNativePaywall,
} from '@/integrations/revenuecat/revenuecatClient';
import { getAppVersion } from '@/native/appInfo';

interface NativeSettingsProps {
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatar_url?: string;
  };
  subscriptionTier?: string;
  onBack?: () => void;
  onLogout?: () => void;
  onNavigate?: (section: string) => void;
  className?: string;
}

/**
 * iOS Settings app style settings screen.
 */
export const NativeSettings = ({
  user,
  subscriptionTier = 'free',
  onBack,
  onLogout,
  onNavigate,
  className,
}: NativeSettingsProps) => {
  const [showPaywall, setShowPaywall] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [buildNumber, setBuildNumber] = useState<string>('1');

  // Notification settings
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [chatNotifications, setChatNotifications] = useState(true);
  const [calendarReminders, setCalendarReminders] = useState(true);

  // Appearance settings
  const [darkMode, setDarkMode] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  // Privacy settings
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);

  // Load app info
  React.useEffect(() => {
    const loadAppInfo = async () => {
      const versionInfo = await getAppVersion();
      setAppVersion(versionInfo.versionNumber);
      setBuildNumber(versionInfo.bundleNumber);
    };
    loadAppInfo();
  }, []);

  const handleUpgrade = useCallback(async () => {
    await hapticService.light();

    if (isNativePlatform() && user?.id) {
      // Use native RevenueCat Paywall via despia-native
      launchNativePaywall(user.id);
    } else {
      // Fallback to JS-based paywall for web/dev
      setShowPaywall(true);
    }
  }, [user?.id]);

  const handleLogout = useCallback(async () => {
    await hapticService.warning();
    onLogout?.();
  }, [onLogout]);

  const handleNavigate = useCallback(
    async (section: string) => {
      await hapticService.light();
      onNavigate?.(section);
    },
    [onNavigate],
  );

  const isPro = subscriptionTier !== 'free';
  const platform = getPlatform();

  return (
    <>
      <NativeLargeTitle title="Settings" onBack={onBack} className={className}>
        <NativeList>
          {/* Profile Section */}
          <NativeListSection>
            <NativeListItem
              icon={
                user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt=""
                    className="w-full h-full rounded-md object-cover"
                  />
                ) : (
                  <User size={18} />
                )
              }
              label={user?.name || 'Guest User'}
              sublabel={user?.email || 'Sign in to sync your trips'}
              showChevron
              onPress={() => handleNavigate('profile')}
            />
          </NativeListSection>

          {/* Subscription Section */}
          <NativeListSection header="Subscription">
            <NativeListItem
              icon={<Crown size={18} />}
              label={isPro ? 'ChravelApp Pro' : 'Free Plan'}
              value={isPro ? <span className="text-green-400">Active</span> : undefined}
              sublabel={
                isPro ? `${subscriptionTier.replace('-', ' ')} tier` : 'Upgrade for unlimited trips'
              }
              showChevron
              onPress={isPro ? () => handleNavigate('subscription') : handleUpgrade}
            />
          </NativeListSection>

          {/* Notifications Section */}
          <NativeListSection
            header="Notifications"
            footer="Control how Chravel sends you updates about your trips."
          >
            <NativeToggleItem
              icon={<Bell size={18} />}
              label="Push Notifications"
              checked={pushEnabled}
              onChange={setPushEnabled}
            />
            <NativeToggleItem
              icon={<Mail size={18} />}
              label="Email Notifications"
              checked={emailEnabled}
              onChange={setEmailEnabled}
            />
            <NativeToggleItem
              icon={<MessageCircle size={18} />}
              label="Chat Messages"
              sublabel="Get notified about new messages"
              checked={chatNotifications}
              onChange={setChatNotifications}
            />
            <NativeToggleItem
              icon={<Bell size={18} />}
              label="Calendar Reminders"
              sublabel="Upcoming events and deadlines"
              checked={calendarReminders}
              onChange={setCalendarReminders}
            />
          </NativeListSection>

          {/* Appearance Section */}
          <NativeListSection header="Appearance">
            <NativeToggleItem
              icon={darkMode ? <Moon size={18} /> : <Sun size={18} />}
              label="Dark Mode"
              checked={darkMode}
              onChange={setDarkMode}
            />
            <NativeToggleItem
              icon={<Smartphone size={18} />}
              label="Haptic Feedback"
              sublabel="Vibration on interactions"
              checked={hapticFeedback}
              onChange={setHapticFeedback}
            />
          </NativeListSection>

          {/* Privacy Section */}
          <NativeListSection
            header="Privacy"
            footer="Your data is encrypted and never sold to third parties."
          >
            <NativeToggleItem
              icon={<Shield size={18} />}
              label="Analytics"
              sublabel="Help improve Chravel"
              checked={analyticsEnabled}
              onChange={setAnalyticsEnabled}
            />
            <NativeToggleItem
              icon={<Globe size={18} />}
              label="Location Services"
              sublabel="For nearby places and maps"
              checked={locationEnabled}
              onChange={setLocationEnabled}
            />
            <NativeListItem
              icon={<Lock size={18} />}
              label="Privacy Policy"
              showChevron
              onPress={() => handleNavigate('privacy')}
            />
          </NativeListSection>

          {/* Support Section */}
          <NativeListSection header="Support">
            <NativeListItem
              icon={<HelpCircle size={18} />}
              label="Help Center"
              showChevron
              onPress={() => handleNavigate('help')}
            />
            <NativeListItem
              icon={<MessageCircle size={18} />}
              label="Contact Support"
              showChevron
              onPress={() => handleNavigate('contact')}
            />
            <NativeListItem
              icon={<Star size={18} />}
              label="Rate Chravel"
              sublabel={platform === 'ios' ? 'App Store' : 'Play Store'}
              showChevron
              onPress={() => handleNavigate('rate')}
            />
          </NativeListSection>

          {/* Legal Section */}
          <NativeListSection header="Legal">
            <NativeListItem
              icon={<FileText size={18} />}
              label="Terms of Service"
              showChevron
              onPress={() => handleNavigate('terms')}
            />
            <NativeListItem
              icon={<Shield size={18} />}
              label="Privacy Policy"
              showChevron
              onPress={() => handleNavigate('privacy')}
            />
            <NativeListItem
              icon={<FileText size={18} />}
              label="Licenses"
              showChevron
              onPress={() => handleNavigate('licenses')}
            />
          </NativeListSection>

          {/* App Info Section */}
          <NativeListSection header="About">
            <NativeListItem
              icon={<Info size={18} />}
              label="Version"
              value={`${appVersion} (${buildNumber})`}
            />
            <NativeListItem
              icon={<Smartphone size={18} />}
              label="Platform"
              value={platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : 'Web'}
            />
          </NativeListSection>

          {/* Logout */}
          {user && (
            <NativeListSection>
              <NativeListItem
                icon={<LogOut size={18} />}
                label="Sign Out"
                destructive
                onPress={handleLogout}
              />
            </NativeListSection>
          )}

          {/* Bottom spacing for safe area */}
          <div className="h-8" />
        </NativeList>
      </NativeLargeTitle>

      {/* Subscription Paywall (Fallback for Web/Dev) */}
      <NativeSubscriptionPaywall
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={() => {
          setShowPaywall(false);
        }}
      />
    </>
  );
};
