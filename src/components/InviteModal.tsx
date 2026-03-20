import React, { useRef, useEffect, useCallback } from 'react';
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
}

export const InviteModal = ({
  isOpen,
  onClose,
  tripName,
  tripId,
  proTripId,
  tripType = 'consumer',
}: InviteModalProps) => {
  const isMobile = useIsMobile();
  // All trip types require approval (enforced on backend)
  // Consumer trips: any member can approve. Pro/Event: creator/admins only.
  // The share card / trip preview handles virality; the join boundary handles trust.
  const [requireApproval, setRequireApproval] = React.useState(true);
  const [expireIn7Days, setExpireIn7Days] = React.useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const {
    copied,
    inviteLink,
    loading,
    isDemoMode,
    error,
    expiresAt,
    regenerateInviteToken,
    retryGenerate,
    handleCopyLink,
    handleShare,
  } = useInviteLink({ isOpen, tripName, requireApproval, expireIn7Days, tripId, proTripId });

  // Focus management: capture previous focus on open, restore on close
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      // Defer focus to allow the modal to render
      const timer = setTimeout(() => {
        modalRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Handle Escape key to close modal (desktop portal only)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  if (!isOpen) return null;

  const modalContent = (
    <>
      <InviteModalHeader tripName={tripName} onClose={onClose} />

      <InviteLinkSection
        inviteLink={inviteLink}
        loading={loading}
        copied={copied}
        isDemoMode={isDemoMode}
        error={error}
        expiresAt={expiresAt}
        onCopyLink={handleCopyLink}
        onRegenerate={regenerateInviteToken}
        onRetry={retryGenerate}
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
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Invite to ${tripName}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="bg-background/95 backdrop-blur-md border border-border rounded-2xl p-4 max-w-md w-full max-h-[85vh] overflow-y-auto animate-scale-in relative outline-none"
      >
        {modalContent}
      </div>
    </div>,
    document.body,
  );
};
