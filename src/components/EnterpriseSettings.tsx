import React, { useState } from 'react';
import { Building, CreditCard, Settings, Bell, Wallet, ChevronDown, Loader2 } from 'lucide-react';
import { TravelWallet } from './TravelWallet';
import { OrganizationSection } from './enterprise/OrganizationSection';
import { BillingSection } from './enterprise/BillingSection';
import { EnterpriseNotificationsSection } from './enterprise/EnterpriseNotificationsSection';
import { EnterprisePrivacySection } from './enterprise/EnterprisePrivacySection';
import { useOrganization } from '../hooks/useOrganization';
import { useIsMobile } from '../hooks/use-mobile';
import { SUBSCRIPTION_TIERS } from '../types/pro';

interface EnterpriseSettingsProps {
  organizationId: string;
  currentUserId: string;
  defaultSection?: string;
}

export const EnterpriseSettings = ({ organizationId, currentUserId, defaultSection = 'organization' }: EnterpriseSettingsProps) => {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const isMobile = useIsMobile();
  
  // Fetch real organization data
  const { currentOrg, members, loading } = useOrganization();

  // Build organization object from real data
  const organization = currentOrg ? {
    id: currentOrg.id,
    name: currentOrg.name,
    displayName: currentOrg.display_name,
    subscriptionTier: currentOrg.subscription_tier as 'starter' | 'growing' | 'enterprise' | 'enterprise-plus',
    subscriptionStatus: currentOrg.subscription_status as 'active' | 'trial' | 'cancelled' | 'expired',
    seatLimit: currentOrg.seat_limit || SUBSCRIPTION_TIERS[currentOrg.subscription_tier as keyof typeof SUBSCRIPTION_TIERS]?.seatLimit || 50,
    seatsUsed: currentOrg.seats_used || members.length,
    billingEmail: currentOrg.billing_email || 'billing@organization.com',
    subscriptionEndsAt: currentOrg.subscription_ends_at || undefined,
    currentUserRole: 'owner' as const,
    contactName: '',
    contactEmail: '',
    contactPhone: ''
  } : null;

  // Simplified sidebar - same for all categories
  const sections = [
    { id: 'organization', label: 'Organization Profile', icon: Building },
    { id: 'billing', label: 'Subscriptions', icon: CreditCard },
    { id: 'travel-wallet', label: 'Travel Wallet', icon: Wallet },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'General & Privacy', icon: Settings }
  ];

  const renderSection = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-glass-orange" />
        </div>
      );
    }
    
    if (!organization) {
      return (
        <div className="text-center py-12 text-gray-400">
          <p>No organization found. Please create or join an organization.</p>
        </div>
      );
    }
    
    switch (activeSection) {
      case 'organization': return <OrganizationSection organization={organization} />;
      case 'billing': return <BillingSection organization={organization} />;
      case 'travel-wallet': return <div><TravelWallet userId={currentUserId} /></div>;
      case 'notifications': return <EnterpriseNotificationsSection />;
      case 'privacy': return <EnterprisePrivacySection />;
      default: return <OrganizationSection organization={organization} />;
    }
  };

  const currentSection = sections.find(s => s.id === activeSection);

  // When integrated into dashboard, render without the full layout
  if (defaultSection !== 'organization') {
    return (
      <div className="w-full">
        {renderSection()}
      </div>
    );
  }

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

  // Desktop layout
  return (
    <div className="flex h-full w-full min-w-0">
      {/* Desktop Sidebar */}
      <div className="w-64 flex-shrink-0 bg-white/5 backdrop-blur-md border-r border-white/10 p-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Enterprise Settings</h2>

        <div className="space-y-2">
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