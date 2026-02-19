import React, { useState, useMemo } from 'react';
import {
  User,
  Bell,
  CreditCard,
  Shield,
  Settings,
  Wallet,
  Archive,
  Bookmark,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { TravelWallet } from './TravelWallet';
import { ConsumerProfileSection } from './consumer/ConsumerProfileSection';
import { ConsumerBillingSection } from './consumer/ConsumerBillingSection';
import { ConsumerNotificationsSection } from './consumer/ConsumerNotificationsSection';
import { ConsumerPrivacySection } from './consumer/ConsumerPrivacySection';
import { ConsumerGeneralSettings } from './consumer/ConsumerGeneralSettings';
import { ConsumerPermissionsSection } from './consumer/ConsumerPermissionsSection';
import { ArchivedTripsSection } from './ArchivedTripsSection';
import { SavedRecommendations } from './SavedRecommendations';
import { ConsumerAIConciergeSection } from './consumer/ConsumerAIConciergeSection';
import { useDemoMode } from '../hooks/useDemoMode';
import { SettingsLayout, type SettingsSection } from './settings/SettingsLayout';

interface ConsumerSettingsProps {
  currentUserId: string;
  initialSection?: string;
  onClose?: () => void;
  onTripStateChange?: () => void;
}

const ALL_SECTIONS: (SettingsSection & { demoOnly?: boolean })[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'ai-concierge', label: 'AI Concierge', icon: Sparkles },
  { id: 'travel-wallet', label: 'Travel Wallet', icon: Wallet },
  { id: 'saved-recs', label: 'Saved Places', icon: Bookmark, demoOnly: true },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'permissions', label: 'Permissions', icon: KeyRound },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'settings', label: 'General Settings', icon: Settings },
  { id: 'archived', label: 'Archived Trips', icon: Archive },
];

export const ConsumerSettings = ({
  currentUserId,
  initialSection,
  onTripStateChange,
}: ConsumerSettingsProps) => {
  const [activeSection, setActiveSection] = useState(initialSection || 'profile');
  const { isDemoMode } = useDemoMode();

  const sections = useMemo(
    () =>
      ALL_SECTIONS.filter(s => !('demoOnly' in s && s.demoOnly) || isDemoMode) as SettingsSection[],
    [isDemoMode],
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ConsumerProfileSection />;
      case 'billing':
        return <ConsumerBillingSection />;
      case 'ai-concierge':
        return <ConsumerAIConciergeSection />;
      case 'travel-wallet':
        return (
          <div>
            <TravelWallet userId={currentUserId} />
          </div>
        );
      case 'saved-recs':
        return <SavedRecommendations />;
      case 'notifications':
        return <ConsumerNotificationsSection />;
      case 'permissions':
        return <ConsumerPermissionsSection />;
      case 'privacy':
        return <ConsumerPrivacySection />;
      case 'settings':
        return <ConsumerGeneralSettings />;
      case 'archived':
        return <ArchivedTripsSection onTripStateChange={onTripStateChange} />;
      default:
        return <ConsumerProfileSection />;
    }
  };

  return (
    <SettingsLayout
      title="Consumer Settings"
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderSection()}
    </SettingsLayout>
  );
};
