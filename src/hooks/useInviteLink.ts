import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';

interface UseInviteLinkProps {
  isOpen: boolean;
  tripName: string;
  requireApproval: boolean;
  expireIn7Days: boolean;
  tripId?: string;
  proTripId?: string;
}

interface InviteLinkResult {
  copied: boolean;
  inviteLink: string;
  loading: boolean;
  isDemoMode: boolean;
  regenerateInviteToken: () => Promise<void>;
  resendInvite: (recipientEmail?: string, recipientPhone?: string) => Promise<boolean>;
  handleCopyLink: () => Promise<void>;
  handleShare: () => Promise<void>;
  handleEmailInvite: () => void;
  handleSMSInvite: () => void;
}

// Note: Invite code generation is now handled server-side via the
// generate-invite-code edge function to prevent race conditions and
// ensure database-level uniqueness guarantees.

export const useInviteLink = ({
  isOpen,
  tripName,
  requireApproval,
  expireIn7Days,
  tripId,
  proTripId,
}: UseInviteLinkProps): InviteLinkResult => {
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDemoMode } = useDemoMode();

  // Generate invite link when modal opens
  useEffect(() => {
    if (isOpen) {
      generateTripLink();
    }
  }, [isOpen, requireApproval, expireIn7Days, tripId, proTripId, isDemoMode]);

  // Note: createInviteInDatabase is no longer used. Invite creation is now
  // handled server-side via the generate-invite-code edge function.

  const generateTripLink = async () => {
    setLoading(true);
    const actualTripId = proTripId || tripId;

    if (!actualTripId) {
      toast.error('No trip ID provided');
      setLoading(false);
      return;
    }

    // DEMO MODE: Generate demonstration link without database
    // Use branded unfurl domain for rich OG previews
    if (isDemoMode) {
      const demoInviteCode = `demo-${actualTripId}-${Date.now().toString(36)}`;
      setInviteLink(`https://p.chravel.app/j/${demoInviteCode}`);
      setLoading(false);
      toast.success('Demo invite link created!');
      return;
    }

    // AUTHENTICATED MODE: Use server-side edge function to generate invite
    // This handles validation, race conditions, and database uniqueness

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error('Please log in to create invite links');
      setLoading(false);
      return;
    }

    try {
      console.log('[InviteLink] Calling generate-invite-code edge function', {
        tripId: actualTripId,
        requireApproval,
        expiresIn7Days: expireIn7Days,
      });

      // Call server-side function to generate invite code
      // This prevents race conditions and validates permissions server-side
      const { data, error } = await supabase.functions.invoke('generate-invite-code', {
        body: {
          tripId: actualTripId,
          requireApproval,
          expiresIn7Days: expireIn7Days,
        },
      });

      if (error) {
        console.error('[InviteLink] Edge function error:', error);
        toast.error('Failed to create invite link. Please try again.');
        setLoading(false);
        return;
      }

      if (!data.success) {
        console.error('[InviteLink] Edge function returned error:', data);

        // Map error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
          TRIP_NOT_FOUND: 'Trip not found. It may have been deleted.',
          TRIP_DELETED: 'This trip has been deleted.',
          PERMISSION_DENIED: 'Only trip creators and admins can create invite links.',
          CODE_GENERATION_FAILED: 'Could not generate a unique invite code. Please try again.',
          DB_ERROR: 'Database error. Please try again.',
          AUTH_REQUIRED: 'Please log in to create invite links.',
          INVALID_AUTH: 'Your session has expired. Please log in again.',
        };

        toast.error(errorMessages[data.code] || data.error || 'Failed to create invite link');
        setLoading(false);
        return;
      }

      // Success! Use the invite URL returned by the server
      console.log('[InviteLink] Invite created successfully:', {
        code: data.code?.substring(0, 12) + '...',
        tripName: data.tripName,
      });

      setInviteLink(data.inviteUrl);
      setLoading(false);
      toast.success('Invite link created!');
    } catch (error) {
      console.error('[InviteLink] Exception calling edge function:', error);
      toast.error('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const regenerateInviteToken = async () => {
    // Deactivate old invite if it exists (only for real invites)
    if (inviteLink && !isDemoMode) {
      try {
        const oldCode = inviteLink.split('/join/')[1]?.split('?')[0];
        if (oldCode && !oldCode.startsWith('demo-')) {
          await supabase.from('trip_invites').update({ is_active: false }).eq('code', oldCode);
        }
      } catch (error) {
        console.error('[InviteLink] Error deactivating old invite:', error);
      }
    }

    // Generate new invite link
    await generateTripLink();
  };

  const resendInvite = async (
    recipientEmail?: string,
    recipientPhone?: string,
  ): Promise<boolean> => {
    if (!inviteLink) {
      toast.error('No invite link available. Please generate one first.');
      return false;
    }

    setLoading(true);
    try {
      if (recipientEmail) {
        const subject = encodeURIComponent(`Join my trip: ${tripName}`);
        const body = encodeURIComponent(
          `Hi there!\n\nYou're invited to join my trip "${tripName}"!\n\n` +
            `Click here to join: ${inviteLink}\n\n` +
            `If you have the Chravel app installed, this link will open it directly. ` +
            `Otherwise, you can join through your browser!\n\nSee you there!`,
        );
        window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`);
        toast.success(`Invite sent to ${recipientEmail}`);
        return true;
      } else if (recipientPhone) {
        const message = encodeURIComponent(
          `You're invited to join my trip "${tripName}"! ${inviteLink} (Opens in Chravel app if installed)`,
        );
        window.open(`sms:${recipientPhone}?body=${message}`);
        toast.success(`Invite sent to ${recipientPhone}`);
        return true;
      } else {
        toast.error('Please provide an email or phone number');
        return false;
      }
    } catch (error) {
      console.error('[InviteLink] Error resending invite:', error);
      toast.error('Failed to resend invite. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('[InviteLink] Failed to copy:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (!inviteLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join my trip: ${tripName}`,
          text: `You're invited to join my trip "${tripName}"!`,
          url: inviteLink,
        });
      } catch (error) {
        console.error('[InviteLink] Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleEmailInvite = () => {
    if (!inviteLink) return;

    const subject = encodeURIComponent(`Join my trip: ${tripName}`);
    const body = encodeURIComponent(
      `Hi there!\n\nYou're invited to join my trip "${tripName}"!\n\n` +
        `Click here to join: ${inviteLink}\n\n` +
        `If you have the Chravel app installed, this link will open it directly. ` +
        `Otherwise, you can join through your browser!\n\nSee you there!`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleSMSInvite = () => {
    if (!inviteLink) return;

    const message = encodeURIComponent(
      `You're invited to join my trip "${tripName}"! ${inviteLink} (Opens in Chravel app if installed)`,
    );
    window.open(`sms:?body=${message}`);
  };

  return {
    copied,
    inviteLink,
    loading,
    isDemoMode,
    regenerateInviteToken,
    resendInvite,
    handleCopyLink,
    handleShare,
    handleEmailInvite,
    handleSMSInvite,
  };
};
