import React, { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import { EventNotificationsSection } from './events/EventNotificationsSection';
import { EventGeneralPrivacySection } from './events/EventGeneralPrivacySection';
import { SettingsLayout, type SettingsSection } from './settings/SettingsLayout';

interface EventsSettingsProps {
  currentUserId: string;
  userOrganization?: { id: string; name: string; role: string; hasProAccess: boolean };
  onShowProModal?: () => void;
  onShowEnterpriseSettings?: () => void;
  onShowAdvertiserHub?: () => void;
}

const SECTIONS: SettingsSection[] = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'general', label: 'General & Privacy', icon: Settings },
];

export const EventsSettings = ({
  currentUserId: _currentUserId,
  userOrganization: _userOrganization,
  onShowProModal: _onShowProModal,
  onShowEnterpriseSettings: _onShowEnterpriseSettings,
  onShowAdvertiserHub: _onShowAdvertiserHub,
}: EventsSettingsProps) => {
  const [activeSection, setActiveSection] = useState('notifications');

  const renderSection = () => {
    switch (activeSection) {
      case 'notifications':
        return <EventNotificationsSection />;
      case 'general':
        return <EventGeneralPrivacySection />;
      default:
        return <EventNotificationsSection />;
    }
  };

  return (
    <SettingsLayout
      title="Event Settings"
      subtitle="Notification and privacy preferences for events. Organizer details are set per event."
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderSection()}
    </SettingsLayout>
  );
};
