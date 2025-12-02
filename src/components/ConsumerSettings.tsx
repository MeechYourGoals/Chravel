
import React, { useState } from 'react';
import { User, Bell, CreditCard, Shield, Settings, Wallet, ChevronDown, Archive, Bookmark, Sparkles } from 'lucide-react';
import { TravelWallet } from './TravelWallet';
import { ConsumerProfileSection } from './consumer/ConsumerProfileSection';
import { ConsumerBillingSection } from './consumer/ConsumerBillingSection';
import { ConsumerNotificationsSection } from './consumer/ConsumerNotificationsSection';
import { ConsumerPrivacySection } from './consumer/ConsumerPrivacySection';
import { ConsumerGeneralSettings } from './consumer/ConsumerGeneralSettings';
import { ArchivedTripsSection } from './ArchivedTripsSection';
import { useIsMobile } from '../hooks/use-mobile';
import { SavedRecommendations } from './SavedRecommendations';
import { ConsumerAIConciergeSection } from './consumer/ConsumerAIConciergeSection';

interface ConsumerSettingsProps {
  currentUserId: string;
  initialSection?: string;
  onClose?: () => void;
}

export const ConsumerSettings = ({ currentUserId, initialSection, onClose: _onClose }: ConsumerSettingsProps) => {
  const [activeSection, setActiveSection] = useState(initialSection || 'profile');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'ai-concierge', label: 'AI Concierge', icon: Sparkles },
    { id: 'travel-wallet', label: 'Travel Wallet', icon: Wallet },
    { id: 'saved-recs', label: 'Recommendations', icon: Bookmark, comingSoon: true },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'settings', label: 'General Settings', icon: Settings },
    { id: 'archived', label: 'Archived Trips', icon: Archive }
  ];

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
      case 'privacy': return <ConsumerPrivacySection />;
      case 'settings': return <ConsumerGeneralSettings />;
      case 'archived': return <ArchivedTripsSection />;
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
                const isComingSoon = 'comingSoon' in section && section.comingSoon;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      if (!isComingSoon) {
                        setActiveSection(section.id);
                        setShowMobileMenu(false);
                      }
                    }}
                    disabled={isComingSoon}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      isComingSoon 
                        ? 'text-gray-500 cursor-not-allowed opacity-60'
                        : activeSection === section.id
                          ? 'bg-glass-orange/20 text-glass-orange'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="flex-1">{section.label}</span>
                    {isComingSoon && (
                      <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded-full">
                        Coming Soon
                      </span>
                    )}
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
            const isComingSoon = 'comingSoon' in section && section.comingSoon;
            return (
              <button
                key={section.id}
                onClick={() => {
                  if (!isComingSoon) {
                    setActiveSection(section.id);
                  }
                }}
                disabled={isComingSoon}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                  isComingSoon
                    ? 'text-gray-500 cursor-not-allowed opacity-60'
                    : activeSection === section.id
                      ? 'bg-glass-orange/20 text-glass-orange border border-glass-orange/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={20} />
                <span className="flex-1 text-left">{section.label}</span>
                {isComingSoon && (
                  <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded-full">
                    Soon
                  </span>
                )}
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
