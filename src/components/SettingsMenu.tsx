
import React, { useState } from 'react';
import { X, User, Bell, Crown, LogOut, Building, Megaphone } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

import { ProUpgradeModal } from './ProUpgradeModal';
import { EnterpriseSettings } from './EnterpriseSettings';
import { ConsumerSettings } from './ConsumerSettings';
import { EventsSettings } from './EventsSettings';
import { ProfileSection } from './settings/ProfileSection';
import { useTripVariant } from '../contexts/TripVariantContext';
import { NotificationsSection } from './settings/NotificationsSection';
import { SubscriptionSection } from './settings/SubscriptionSection';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  initialConsumerSection?: string;
}

export const SettingsMenu = ({ isOpen, onClose, initialConsumerSection }: SettingsMenuProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showProModal, setShowProModal] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [settingsType, setSettingsType] = useState<'consumer' | 'enterprise' | 'events'>('consumer');
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
  const currentSignOut = user ? signOut : () => console.log('Demo mode - sign out clicked');

  if (!isOpen) return null;

  // Mock organization data - would come from your auth context
  const userOrganization = {
    id: 'org-123',
    name: 'Acme Entertainment Group',
    role: 'owner',
    hasProAccess: true
  };

  // If enterprise section is active and user has pro access, show full enterprise settings
  if (activeSection === 'enterprise' && userOrganization?.hasProAccess) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
        <div className="h-full bg-white/10 backdrop-blur-md border-r border-white/20 w-full">
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Enterprise Settings</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
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

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'subscription', label: 'Subscription', icon: Crown },
    { id: 'advertiser', label: 'Advertiser Hub', icon: Megaphone }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSection userOrganization={userOrganization} />;
      case 'notifications':
        return <NotificationsSection />;
      case 'subscription':
        return (
          <SubscriptionSection 
            userOrganization={userOrganization}
            onShowProModal={() => setShowProModal(true)}
            onShowEnterpriseSettings={() => setActiveSection('enterprise')}
          />
        );
      case 'advertiser':
        // Redirect to advertiser dashboard
        navigate('/advertiser');
        onClose();
        return null;
      default:
        return <ProfileSection userOrganization={userOrganization} />;
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50">
        <div className="h-screen flex flex-col bg-white/10 backdrop-blur-md border-r border-white/20 w-full">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/20">
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Settings Type Toggle */}
          <div className="flex-shrink-0 p-6 border-b border-white/20">
            <div className="bg-white/10 rounded-xl p-1 grid grid-cols-3">
              <button
                onClick={() => setSettingsType('consumer')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  settingsType === 'consumer'
                    ? `bg-${accentColors.primary} text-white`
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Consumer
              </button>
              <button
                onClick={() => setSettingsType('enterprise')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  settingsType === 'enterprise'
                    ? `bg-${accentColors.primary} text-white`
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Enterprise
              </button>
              <button
                onClick={() => setSettingsType('events')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  settingsType === 'events'
                    ? `bg-${accentColors.primary} text-white`
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Events
              </button>
            </div>
            
            {/* Helper text for Enterprise */}
            {settingsType === 'enterprise' && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Manage your organizations, teams, and pro features here
              </p>
            )}
          </div>

          {/* Render appropriate settings based on toggle */}
          <div className="flex-1 flex flex-col min-h-0">
            {settingsType === 'consumer' ? (
              <div className="flex-1 min-h-0">
                <ConsumerSettings currentUserId={currentUser.id} initialSection={initialConsumerSection} />
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
            ) : null}

            {/* Sign Out Button - Only show for consumer settings */}
            {settingsType === 'consumer' && (
              <div className="flex-shrink-0 p-6 bg-white/5 border-t border-white/20">
                <button
                  onClick={currentSignOut}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium py-3 rounded-xl transition-colors"
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
