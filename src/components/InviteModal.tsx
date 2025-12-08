
import React, { useState } from 'react';
import { useInviteLink } from '../hooks/useInviteLink';
import { InviteModalHeader } from './invite/InviteModalHeader';
import { InviteLinkSection } from './invite/InviteLinkSection';
import { InviteSettingsSection } from './invite/InviteSettingsSection';
import { InviteInstructions } from './invite/InviteInstructions';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName: string;
  tripId?: string;
  proTripId?: string;
}

export const InviteModal = ({ isOpen, onClose, tripName, tripId, proTripId }: InviteModalProps) => {
  const [requireApproval, setRequireApproval] = useState(false);
  const [expireIn7Days, setExpireIn7Days] = useState(false);

  const {
    copied,
    inviteLink,
    loading,
    isDemoMode,
    regenerateInviteToken,
    handleCopyLink
  } = useInviteLink({ isOpen, tripName, requireApproval, expireIn7Days, tripId, proTripId });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 max-w-md w-full max-h-[500px] overflow-y-auto animate-scale-in relative">
        <InviteModalHeader tripName={tripName} onClose={onClose} />
        
        <InviteLinkSection
          inviteLink={inviteLink}
          loading={loading}
          copied={copied}
          isDemoMode={isDemoMode}
          onCopyLink={handleCopyLink}
          onRegenerate={regenerateInviteToken}
        />
        
        <InviteSettingsSection
          requireApproval={requireApproval}
          expireIn7Days={expireIn7Days}
          onRequireApprovalChange={setRequireApproval}
          onExpireIn7DaysChange={setExpireIn7Days}
        />
        
        <InviteInstructions />
      </div>
    </div>
  );
};
