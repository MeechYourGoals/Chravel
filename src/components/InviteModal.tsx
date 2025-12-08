
import React, { useState, useEffect } from 'react';
import { useInviteLink } from '../hooks/useInviteLink';
import { InviteModalHeader } from './invite/InviteModalHeader';
import { InviteLinkSection } from './invite/InviteLinkSection';
import { InviteSettingsSection } from './invite/InviteSettingsSection';
import { ShareOptionsSection } from './invite/ShareOptionsSection';
import { InviteInstructions } from './invite/InviteInstructions';
import { supabase } from '../integrations/supabase/client';
import { isProTrip } from '../utils/tripTierDetector';
import { UUID_REGEX } from '../hooks/useInviteLink';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName: string;
  tripId: string;
}

export const InviteModal = ({ isOpen, onClose, tripName, tripId }: InviteModalProps) => {
  const [requireApproval, setRequireApproval] = useState(false);
  const [expireIn7Days, setExpireIn7Days] = useState(false);
  const [isProTripType, setIsProTripType] = useState(false);

  // Check if trip is Pro trip and set default approval requirement
  useEffect(() => {
    if (!isOpen) return;

    const checkTripType = async () => {
      // For demo trips, use tripTierDetector
      if (!UUID_REGEX.test(tripId)) {
        const isPro = isProTrip(tripId);
        setIsProTripType(isPro);
        if (isPro) {
          setRequireApproval(true);
        }
        return;
      }

      // For real trips, fetch from database
      try {
        const { data: trip, error } = await supabase
          .from('trips')
          .select('trip_type')
          .eq('id', tripId)
          .single();

        if (!error && trip) {
          const isPro = trip.trip_type === 'pro';
          setIsProTripType(isPro);
          if (isPro) {
            setRequireApproval(true);
          }
        }
      } catch (error) {
        console.error('Error checking trip type:', error);
      }
    };

    checkTripType();
  }, [isOpen, tripId]);

  const {
    copied,
    inviteLink,
    loading,
    isDemoMode,
    regenerateInviteToken,
    handleCopyLink,
    handleShare,
    handleEmailInvite,
    handleSMSInvite
  } = useInviteLink({ isOpen, tripName, requireApproval, expireIn7Days, tripId });

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
          isProTrip={isProTripType}
          onRequireApprovalChange={setRequireApproval}
          onExpireIn7DaysChange={setExpireIn7Days}
        />
        
        <ShareOptionsSection
          loading={loading}
          inviteLink={inviteLink}
          onShare={handleShare}
          onEmailInvite={handleEmailInvite}
          onSMSInvite={handleSMSInvite}
        />
        
        <InviteInstructions />
      </div>
    </div>
  );
};
