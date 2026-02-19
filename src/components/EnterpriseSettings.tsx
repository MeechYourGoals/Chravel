import React, { useState, useEffect } from 'react';
import { Building, CreditCard, Settings, Bell, Wallet, AlertCircle, RefreshCw } from 'lucide-react';
import { TravelWallet } from './TravelWallet';
import { OrganizationSection } from './enterprise/OrganizationSection';
import { BillingSection } from './enterprise/BillingSection';
import { EnterpriseNotificationsSection } from './enterprise/EnterpriseNotificationsSection';
import { EnterprisePrivacySection } from './enterprise/EnterprisePrivacySection';
import { CreateOrganizationModal } from './enterprise/CreateOrganizationModal';
import { useOrganization } from '../hooks/useOrganization';
import { SUBSCRIPTION_TIERS } from '../types/pro';
import { SettingsLayout, type SettingsSection } from './settings/SettingsLayout';
import { Skeleton } from './ui/skeleton';

interface EnterpriseSettingsProps {
  organizationId: string;
  currentUserId: string;
  defaultSection?: string;
}

const SECTIONS: SettingsSection[] = [
  { id: 'organization', label: 'Organization Profile', icon: Building },
  { id: 'billing', label: 'Subscriptions', icon: CreditCard },
  { id: 'travel-wallet', label: 'Travel Wallet', icon: Wallet },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'General & Privacy', icon: Settings },
];

export const EnterpriseSettings = ({
  organizationId: _organizationId,
  currentUserId,
  defaultSection = 'organization',
}: EnterpriseSettingsProps) => {
  const [activeSection, setActiveSection] = useState(defaultSection);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);

  const { currentOrg, members, loading, error, fetchUserOrganizations, fetchOrgMembers } =
    useOrganization();

  useEffect(() => {
    if (currentOrg?.id) {
      fetchOrgMembers(currentOrg.id);
    }
  }, [currentOrg?.id, fetchOrgMembers]);

  const organization = currentOrg
    ? {
        id: currentOrg.id,
        name: currentOrg.name,
        displayName: currentOrg.display_name,
        subscriptionTier: currentOrg.subscription_tier as
          | 'starter'
          | 'growing'
          | 'enterprise'
          | 'enterprise-plus',
        subscriptionStatus: currentOrg.subscription_status as
          | 'active'
          | 'trial'
          | 'cancelled'
          | 'expired',
        seatLimit:
          currentOrg.seat_limit ||
          SUBSCRIPTION_TIERS[currentOrg.subscription_tier as keyof typeof SUBSCRIPTION_TIERS]
            ?.seatLimit ||
          50,
        seatsUsed: currentOrg.seats_used || members.length,
        billingEmail: currentOrg.billing_email || '',
        subscriptionEndsAt: currentOrg.subscription_ends_at || undefined,
        currentUserRole: 'owner' as const,
        contactName: '',
        contactEmail: '',
        contactPhone: '',
      }
    : null;

  const handleOpenCreateOrgModal = () => setShowCreateOrgModal(true);
  const handleCloseCreateOrgModal = () => setShowCreateOrgModal(false);
  const handleOrgCreated = () => {
    setShowCreateOrgModal(false);
    fetchUserOrganizations();
  };

  const renderSection = () => {
    if (loading) {
      return (
        <div className="space-y-4 py-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-3/4" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <AlertCircle className="h-12 w-12 text-amber-400 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Could not load organizations</h3>
          <p className="text-sm text-gray-400 text-center mb-4 max-w-sm">{error.message}</p>
          <button
            onClick={() => fetchUserOrganizations()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-glass-orange hover:bg-glass-orange/80 text-white font-medium transition-colors"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case 'organization':
        return (
          <OrganizationSection
            organization={organization}
            onCreateOrganization={handleOpenCreateOrgModal}
          />
        );
      case 'billing':
        return (
          <BillingSection
            organization={organization}
            onCreateOrganization={handleOpenCreateOrgModal}
          />
        );
      case 'travel-wallet':
        return (
          <div>
            <TravelWallet userId={currentUserId} />
          </div>
        );
      case 'notifications':
        return <EnterpriseNotificationsSection />;
      case 'privacy':
        return <EnterprisePrivacySection />;
      default:
        return (
          <OrganizationSection
            organization={organization}
            onCreateOrganization={handleOpenCreateOrgModal}
          />
        );
    }
  };

  if (defaultSection !== 'organization') {
    return (
      <>
        <div className="w-full">{renderSection()}</div>
        <CreateOrganizationModal
          open={showCreateOrgModal}
          onClose={handleCloseCreateOrgModal}
          onSuccess={handleOrgCreated}
        />
      </>
    );
  }

  return (
    <>
      <SettingsLayout
        title="Enterprise Settings"
        sections={SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {renderSection()}
      </SettingsLayout>
      <CreateOrganizationModal
        open={showCreateOrgModal}
        onClose={handleCloseCreateOrgModal}
        onSuccess={handleOrgCreated}
      />
    </>
  );
};
