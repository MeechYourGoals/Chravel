
import React, { useState } from 'react';
import {
  User,
  Bell,
  CreditCard,
  Shield,
  Settings,
  Wallet,
  ChevronDown,
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
import { useIsMobile } from '../hooks/use-mobile';
import { SavedRecommendations } from './SavedRecommendations';
import { ConsumerAIConciergeSection } from './consumer/ConsumerAIConciergeSection';
import { useDemoMode } from '../hooks/useDemoMode';

interface ConsumerSettingsProps {
  currentUserId: string;
  initialSection?: string;
  onClose?: () => void;
  // Callback when a trip is restored/unhidden (for parent component to refresh)
  onTripStateChange?: () => void;
}

export const ConsumerSettings = ({ currentUserId, initialSection, onClose: _onClose, onTripStateChange }: ConsumerSettingsProps) => {
  const [activeSection, setActiveSection] = useState(initialSection || 'profile');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();
  const { isDemoMode } = useDemoMode();

  const allSections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'ai-concierge', label: 'AI Concierge', icon: Sparkles },
    { id: 'travel-wallet', label: 'Travel Wallet', icon: Wallet },
    { id: 'saved-recs', label: 'Saved Places', icon: Bookmark, demoOnly: true },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'permissions', label: 'Permissions', icon: KeyRound },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'settings', label: 'General Settings', icon: Settings },
    { id: 'archived', label: 'Archived Trips', icon: Archive }
  ];

  // Filter out demo-only sections when not in demo mode
  const sections = allSections.filter(section => !('demoOnly' in section && section.demoOnly) || isDemoMode);

  const renderTravelWalletSection = () => (
    <div>
      <TravelWallet userId={currentUserId} />
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'profile': return <ConsumerProfileSection />;
      case 'billing': return <ConsumerBillingSection />;
      case 'ai-concierge': return <ConsumerAIConciergeSection />;
      case 'travel-wallet': return renderTravelWalletSection();
      case 'saved-recs': return <SavedRecommendations />;
      case 'notifications': return <ConsumerNotificationsSection />;
      case 'permissions': return <ConsumerPermissionsSection />;
      case 'privacy': return <ConsumerPrivacySection />;
      case 'settings': return <ConsumerGeneralSettings />;
      case 'archived': return <ArchivedTripsSection onTripStateChange={onTripStateChange} />;
      default: return <ConsumerProfileSection />;
    }
  };

  const currentSection = sections.find(s => s.id === activeSection);

  if (isMobile) {
    return (
      <div className="flex flex-col h-full w-full min-w-0">
        {/* Mobile Section Selector */}
        <div className="flex-shrink-0 p-3 border-b border-white/20">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="w-full flex items-center justify-between p-2 bg-white/10 rounded-xl text-white"
          >
            <div className="flex items-center gap-3">
              {currentSection && <currentSection.icon size={20} />}
              <span>{currentSection?.label}</span>
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
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      activeSection === section.id
                        ? 'bg-glass-orange/20 text-glass-orange'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="flex-1">{section.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile Content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-3">
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
        <h2 className="text-xl font-bold text-white mb-3">Consumer Settings</h2>
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
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
                }`}
              >
                <Icon size={20} />
                <span className="flex-1 text-left">{section.label}</span>
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
