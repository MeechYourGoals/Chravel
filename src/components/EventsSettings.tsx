import React, { useState } from 'react';
import { Bell, ChevronDown, Settings } from 'lucide-react';
import { EventNotificationsSection } from './events/EventNotificationsSection';
import { EventGeneralPrivacySection } from './events/EventGeneralPrivacySection';
import { useIsMobile } from '../hooks/use-mobile';

interface EventsSettingsProps {
  currentUserId: string;
  userOrganization?: { id: string; name: string; role: string; hasProAccess: boolean };
  onShowProModal?: () => void;
  onShowEnterpriseSettings?: () => void;
  onShowAdvertiserHub?: () => void;
}

export const EventsSettings = ({
  currentUserId: _currentUserId,
  userOrganization: _userOrganization,
  onShowProModal: _onShowProModal,
  onShowEnterpriseSettings: _onShowEnterpriseSettings,
  onShowAdvertiserHub: _onShowAdvertiserHub,
}: EventsSettingsProps) => {
  const [activeSection, setActiveSection] = useState('notifications');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();

  // Organizer profile removed: per-event data belongs in each event's edit flow
  const sections = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'general', label: 'General & Privacy', icon: Settings },
  ];

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

  const currentSection = sections.find(s => s.id === activeSection);

  if (isMobile) {
    return (
      <div className="flex flex-col h-full w-full min-w-0">
        {/* Mobile Section Selector */}
        <div className="flex-shrink-0 p-4 border-b border-white/20">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-full flex items-center justify-between p-3 bg-white/10 rounded-xl text-white"
          >
            <div className="flex items-center gap-3">
              {currentSection && <currentSection.icon size={20} />}
              <span className="text-sm">{currentSection?.label}</span>
            </div>
            <ChevronDown
              size={20}
              className={`transform transition-transform ${showMobileMenu ? 'rotate-180' : ''}`}
            />
          </button>

          {showMobileMenu && (
            <div className="mt-2 bg-white/10 rounded-xl overflow-hidden">
              {sections.map(section => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-glass-orange/20 text-glass-orange'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-sm">{section.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4">{renderSection()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0">
      {/* Desktop Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white/5 backdrop-blur-md border-r border-white/10 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-3">Event Settings</h2>
        <p className="text-xs text-gray-400 mb-4">
          Notification and privacy preferences for events. Organizer details are set per event.
        </p>
        <div className="space-y-1.5">
          {sections.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  activeSection === section.id
                    ? 'bg-glass-orange/20 text-glass-orange border border-glass-orange/30'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Main Content */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-4 pb-16">{renderSection()}</div>
      </div>
    </div>
  );
};
