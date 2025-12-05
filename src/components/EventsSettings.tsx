
import React, { useState } from 'react';
import { User, Bell, ChevronDown } from 'lucide-react';
import { EventProfileSection } from './events/EventProfileSection';
import { EventNotificationsSection } from './events/EventNotificationsSection';
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
  onShowAdvertiserHub: _onShowAdvertiserHub
}: EventsSettingsProps) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();

  // Only Profile and Notifications - event-specific features belong in individual events
  const sections = [
    { id: 'profile', label: 'Organizer Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return <EventProfileSection />;
      case 'notifications': return <EventNotificationsSection />;
      default: return <EventProfileSection />;
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
              {sections.map((section) => {
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
          <div className="p-4">
            {renderSection()}
          </div>
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
          Global organizer settings. Event-specific features (Agenda, Attendees, Chat) are in each event.
        </p>
        <div className="space-y-1.5">
          {sections.map((section) => {
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
        <div className="p-4 pb-16">
          {renderSection()}
        </div>
      </div>
    </div>
  );
};
