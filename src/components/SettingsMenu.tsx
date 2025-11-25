import React, { useState } from 'react';
import { X, User, Bell, Crown, LogOut, Megaphone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { useIsMobile } from '../hooks/use-mobile';

import { ProUpgradeModal } from './ProUpgradeModal';
import { EnterpriseSettings } from './EnterpriseSettings';
import { ConsumerSettings } from './ConsumerSettings';
import { EventsSettings } from './EventsSettings';
import { ProfileSection } from './settings/ProfileSection';
import { useTripVariant } from '../contexts/TripVariantContext';
import { NotificationsSection } from './settings/NotificationsSection';
import { SubscriptionSection } from './settings/SubscriptionSection';
import { AdvertiserSettings } from './advertiser/AdvertiserSettings';
import { Advertiser } from '../types/advertiser';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  initialConsumerSection?: string;
  initialSettingsType?: 'consumer' | 'enterprise' | 'events' | 'advertiser';
}

export const SettingsMenu = ({ isOpen, onClose, initialConsumerSection, initialSettingsType }: SettingsMenuProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showProModal, setShowProModal] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [settingsType, setSettingsType] = useState<'consumer' | 'enterprise' | 'events' | 'advertiser'>(initialSettingsType || 'consumer');
  const { accentColors } = useTripVariant();

  // Create mock user for demo mode when no real user is authenticated
  const mockUser = {
    id: 'demo-user-123',
    email: 'demo@example.com',
    user_metadata: {
      full_name: 'Demo User',
      avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'
    }
  };

  const currentUser = user || mockUser;

  if (!isOpen) return null;

  // Mock organization data - would come from your auth context
  const userOrganization = {
    id: 'org-123',
    name: 'Acme Entertainment Group',
    role: 'owner',
    hasProAccess: true
  };

  // Mock advertiser data for demo
  const mockAdvertiser: Advertiser = {
    id: 'demo-advertiser-1',
    user_id: currentUser.id,
    company_name: 'Paradise Resorts International',
    company_email: 'marketing@paradiseresorts.com',
    website: 'https://www.paradiseresorts.com',
    status: 'active',
    created_at: new Date('2024-01-15').toISOString(),
    updated_at: new Date().toISOString()
  };

  const [advertiser, setAdvertiser] = useState<Advertiser>(mockAdvertiser);

  // If enterprise section is active and user has pro access, show full enterprise settings
  if (activeSection === 'enterprise' && userOrganization?.hasProAccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4" onClick={onClose}>
        <div
          className="w-full h-full md:h-[85vh] md:max-w-6xl bg-black/90 md:bg-white/10 md:backdrop-blur-md md:border md:border-white/20 md:rounded-2xl shadow-2xl flex flex-col animate-fade-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Enterprise Settings</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
              <X size={24} />
            </button>
          </div>
          <EnterpriseSettings
            organizationId={userOrganization.id}
            currentUserId={currentUser.id}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4" onClick={onClose}>
        <div
          className="w-full h-full md:h-[85vh] md:max-w-6xl bg-black/90 md:bg-card/95 md:backdrop-blur-xl md:border md:border-white/10 md:rounded-2xl shadow-2xl flex flex-col animate-fade-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-4 md:px-6 md:py-4 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Settings Type Toggle */}
          <div className="flex-shrink-0 p-4 md:px-6 border-b border-white/10 bg-black/20">
            <ScrollArea className="w-full">
              <div className="bg-white/5 rounded-xl p-1 flex w-full justify-center gap-4">
                <button
                  onClick={() => setSettingsType('consumer')}
                  className={`py-2.5 px-6 rounded-lg text-base font-semibold transition-all whitespace-nowrap border ${
                    settingsType === 'consumer'
                      ? `bg-${accentColors.primary} text-white border-white/20 shadow-lg`
                      : 'text-gray-400 hover:text-white border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  Consumer
                </button>
                <button
                  onClick={() => setSettingsType('enterprise')}
                  className={`py-2.5 px-6 rounded-lg text-base font-semibold transition-all whitespace-nowrap border ${
                    settingsType === 'enterprise'
                      ? `bg-${accentColors.primary} text-white border-white/20 shadow-lg`
                      : 'text-gray-400 hover:text-white border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  Enterprise
                </button>
                <button
                  onClick={() => setSettingsType('events')}
                  className={`py-2.5 px-6 rounded-lg text-base font-semibold transition-all whitespace-nowrap border ${
                    settingsType === 'events'
                      ? `bg-${accentColors.primary} text-white border-white/20 shadow-lg`
                      : 'text-gray-400 hover:text-white border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  Events
                </button>
                <button
                  onClick={() => setSettingsType('advertiser')}
                  className={`py-2.5 px-6 rounded-lg text-base font-semibold transition-all whitespace-nowrap border ${
                    settingsType === 'advertiser'
                      ? `bg-${accentColors.primary} text-white border-white/20 shadow-lg`
                      : 'text-gray-400 hover:text-white border-transparent hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  Advertiser
                </button>
              </div>
              <ScrollBar orientation="horizontal" className="md:hidden" />
            </ScrollArea>
            
            {/* Helper text for Enterprise */}
            {settingsType === 'enterprise' && (
              <p className="text-xs text-gray-400 mt-2 ml-1">
                Manage your organizations, teams, and pro features here
              </p>
            )}
          </div>

          {/* Render appropriate settings based on toggle */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {settingsType === 'consumer' ? (
              <div className="flex-1 min-h-0">
                <ConsumerSettings currentUserId={currentUser.id} initialSection={initialConsumerSection} onClose={onClose} />
              </div>
            ) : settingsType === 'enterprise' ? (
              <div className="flex-1 min-h-0">
                <EnterpriseSettings 
                  organizationId={userOrganization?.id || 'default-org'} 
                  currentUserId={currentUser.id} 
                />
              </div>
            ) : settingsType === 'events' ? (
              <div className="flex-1 min-h-0">
                <EventsSettings currentUserId={currentUser.id} />
              </div>
            ) : settingsType === 'advertiser' ? (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
                <AdvertiserSettings 
                  advertiser={advertiser}
                  onUpdate={setAdvertiser}
                />
              </div>
            ) : null}

            {/* Sign Out Button - Only show for consumer settings (and advertiser if we didn't redirect) */}
            {settingsType === 'consumer' && (
              <div className="flex-shrink-0 p-4 bg-black/20 border-t border-white/10 md:hidden">
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium py-2.5 rounded-xl transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProUpgradeModal 
        isOpen={showProModal} 
        onClose={() => setShowProModal(false)} 
      />
    </>
  );
};
