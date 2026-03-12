import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useInviteLink } from '../hooks/useInviteLink';
import { InviteModalHeader } from './invite/InviteModalHeader';
import { InviteLinkSection } from './invite/InviteLinkSection';
import { InviteSettingsSection } from './invite/InviteSettingsSection';
import { InviteInstructions } from './invite/InviteInstructions';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName: string;
  tripId?: string;
  proTripId?: string;
  tripType?: 'consumer' | 'pro' | 'event';
  coverPhoto?: string;
  location?: string;
  dateRange?: string;
  peopleCount?: number;
}

export const InviteModal = ({
  isOpen,
  onClose,
  tripName,
  tripId,
  proTripId,
  tripType = 'consumer',
  coverPhoto,
  location,
  dateRange,
  peopleCount,
}: InviteModalProps) => {
  const isMobile = useIsMobile();
  // All trip types require approval (enforced on backend)
  // Consumer trips: any member can approve. Pro/Event: creator/admins only.
  // The share card / trip preview handles virality; the join boundary handles trust.
  const [requireApproval, setRequireApproval] = useState(true);
  const [expireIn7Days, setExpireIn7Days] = useState(false);

  const {
    copied,
    inviteLink,
    loading,
    isDemoMode,
    regenerateInviteToken,
    handleCopyLink,
    handleShare,
  } = useInviteLink({ isOpen, tripName, requireApproval, expireIn7Days, tripId, proTripId });

  if (!isOpen) return null;

  const modalContent = (
    <>
      <InviteModalHeader
        tripName={tripName}
        onClose={onClose}
        coverPhoto={coverPhoto}
        location={location}
        dateRange={dateRange}
        peopleCount={peopleCount}
      />

      <InviteLinkSection
        inviteLink={inviteLink}
        loading={loading}
        copied={copied}
        isDemoMode={isDemoMode}
        onCopyLink={handleCopyLink}
        onRegenerate={regenerateInviteToken}
        onShare={handleShare}
        tripName={tripName}
      />

      <InviteSettingsSection
        requireApproval={requireApproval}
        expireIn7Days={expireIn7Days}
        onRequireApprovalChange={setRequireApproval}
        onExpireIn7DaysChange={setExpireIn7Days}
        tripType={tripType}
      />

      <InviteInstructions />
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={open => !open && onClose()}>
        <DrawerContent>
          <DrawerHeader className="sr-only">
            <DrawerTitle>Invite to {tripName}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[80vh] overflow-y-auto">{modalContent}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl p-4 max-w-md w-full max-h-[85vh] overflow-y-auto animate-scale-in relative">
        {modalContent}
      </div>
    </div>,
    document.body,
  );
};
