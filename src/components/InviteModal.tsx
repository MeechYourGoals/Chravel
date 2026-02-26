import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useInviteLink } from '../hooks/useInviteLink';
import { InviteModalHeader } from './invite/InviteModalHeader';
import { InviteLinkSection } from './invite/InviteLinkSection';
import { InviteSettingsSection } from './invite/InviteSettingsSection';
import { InviteInstructions } from './invite/InviteInstructions';
import { ContactsInviteModal } from './invite/ContactsInviteModal';
import { isDespia } from '@/native/despia';
import { Contact } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName: string;
  tripId?: string;
  proTripId?: string;
  tripType?: 'consumer' | 'pro' | 'event';
}

export const InviteModal = ({
  isOpen,
  onClose,
  tripName,
  tripId,
  proTripId,
  tripType = 'consumer',
}: InviteModalProps) => {
  // Pro/Event trips always require approval (enforced on backend)
  // Default to true for all trips for safer defaults
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

  const [showContactsModal, setShowContactsModal] = useState(false);
  const isNative = typeof window !== 'undefined' && isDespia();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-4 max-w-md w-full max-h-[85vh] overflow-y-auto animate-scale-in relative">
        <InviteModalHeader tripName={tripName} onClose={onClose} />

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

        {/* Contact Access Button (Native Only or Dev) */}
        {(isNative || import.meta.env.DEV) && (
          <button
            onClick={() => setShowContactsModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl mb-4 transition-colors border border-white/10"
          >
            <Contact size={18} />
            <span>Invite from Contacts</span>
          </button>
        )}

        <InviteSettingsSection
          requireApproval={requireApproval}
          expireIn7Days={expireIn7Days}
          onRequireApprovalChange={setRequireApproval}
          onExpireIn7DaysChange={setExpireIn7Days}
          tripType={tripType}
        />

        <InviteInstructions />
      </div>

      <ContactsInviteModal
        isOpen={showContactsModal}
        onClose={() => setShowContactsModal(false)}
        inviteLink={inviteLink}
        tripName={tripName}
      />
    </div>,
    document.body,
  );
};
