
import React, { useState } from 'react';
import { Calendar, Users, FileText, MessageSquare, ChevronDown, User, Bell, CreditCard, Megaphone } from 'lucide-react';
import { SimpleEventSetupSection } from './events/SimpleEventSetupSection';
import { SimpleAttendeeSection } from './events/SimpleAttendeeSection';
import { SimpleAgendaSection } from './events/SimpleAgendaSection';
import { SimpleChatSection } from './events/SimpleChatSection';
import { ProfileSection } from './settings/ProfileSection';
import { NotificationsSection } from './settings/NotificationsSection';
import { SubscriptionSection } from './settings/SubscriptionSection';
import { useIsMobile } from '../hooks/use-mobile';

interface EventsSettingsProps {
  currentUserId: string;
  userOrganization?: { id: string; name: string; role: string; hasProAccess: boolean };
  onShowProModal?: () => void;
  onShowEnterpriseSettings?: () => void;
  onShowAdvertiserHub?: () => void;
}

export const EventsSettings = ({ 
  currentUserId, 
  userOrganization,
  onShowProModal,
  onShowEnterpriseSettings,
  onShowAdvertiserHub
}: EventsSettingsProps) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [eventData, setEventData] = useState({});
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'advertiser', label: 'Advertiser Hub', icon: Megaphone },
    { id: 'setup', label: 'Event Setup', icon: Calendar },
    { id: 'attendees', label: 'Attendees', icon: Users },
    { id: 'agenda', label: 'Agenda', icon: FileText },
    { id: 'chat', label: 'Chat', icon: MessageSquare }
  ];

  const handleEventDataChange = (data: any) => {
    setEventData(prev => ({ ...prev, ...data }));
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return <ProfileSection userOrganization={userOrganization} />;
      case 'notifications': return <NotificationsSection />;
      case 'subscription': return (
        <SubscriptionSection 
          userOrganization={userOrganization}
          onShowProModal={onShowProModal}
          onShowEnterpriseSettings={onShowEnterpriseSettings}
        />
      );
      case 'advertiser': 
        if (onShowAdvertiserHub) onShowAdvertiserHub();
        return null;
      case 'setup': return <SimpleEventSetupSection eventData={eventData} onEventDataChange={handleEventDataChange} />;
      case 'attendees': return <SimpleAttendeeSection />;
      case 'agenda': return <SimpleAgendaSection />;
      case 'chat': return <SimpleChatSection />;
      default: return <ProfileSection userOrganization={userOrganization} />;
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
      <div className="w-80 flex-shrink-0 bg-white/5 backdrop-blur-md border-r border-white/10 p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6">Event Settings</h2>
        <div className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
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
        <div className="p-8 pb-24">
          {renderSection()}
        </div>
      </div>
    </div>
  );
};
