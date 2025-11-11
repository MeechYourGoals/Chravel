import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface UseInviteLinkProps {
  isOpen: boolean;
  tripName: string;
  requireApproval: boolean;
  expireIn7Days: boolean;
  tripId?: string;
  proTripId?: string;
}

export const useInviteLink = ({ isOpen, tripName, requireApproval, expireIn7Days, tripId, proTripId }: UseInviteLinkProps) => {
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate real trip link immediately when modal opens
  useEffect(() => {
    if (isOpen) {
      generateTripLink();
    }
  }, [isOpen, requireApproval, expireIn7Days, tripId, proTripId]);

  const createInviteInDatabase = async (tripIdValue: string, inviteCode: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return false;
      }

      const inviteData: any = {
        trip_id: tripIdValue,
        code: inviteCode,
        created_by: user.id,
        is_active: true,
        current_uses: 0,
      };

      // Add expiration if enabled (7 days from now)
      if (expireIn7Days) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
        inviteData.expires_at = expirationDate.toISOString();
      }

      const { error } = await supabase
        .from('trip_invites')
        .insert(inviteData);

      if (error) {
        console.error('Error creating invite:', error);
        return false;
      }

      console.log('Invite created successfully in database');
      return true;
    } catch (error) {
      console.error('Error creating invite:', error);
      return false;
    }
  };

  const generateTripLink = async () => {
    setLoading(true);
    const baseUrl = 'https://chravel.app';
    let tripUrl = '';
    const actualTripId = proTripId || tripId;
    
    if (!actualTripId) {
      // Fallback to generic join link if no trip ID
      const mockToken = crypto.randomUUID();
      tripUrl = `${baseUrl}/join/${mockToken}`;
      setInviteLink(tripUrl);
      setLoading(false);
      return;
    }

    // Generate unique invite code
    const inviteCode = crypto.randomUUID();
    
    // Create invite in database
    const created = await createInviteInDatabase(actualTripId, inviteCode);
    
    if (!created) {
      toast.error('Failed to create invite link. Please try again.');
      setLoading(false);
      return;
    }

    // Generate the join URL with the invite code
    tripUrl = `${baseUrl}/join/${inviteCode}`;
    
    // Add parameters for display purposes (actual validation happens server-side)
    const params = new URLSearchParams();
    if (requireApproval) params.append('approval', 'true');
    if (expireIn7Days) params.append('expires', '7d');
    
    if (params.toString()) {
      tripUrl += `?${params.toString()}`;
    }

    setInviteLink(tripUrl);
    setLoading(false);
    toast.success('Invite link created!');
  };

  const regenerateInviteToken = async () => {
    setLoading(true);
    
    // Deactivate old invite if it exists
    if (inviteLink) {
      try {
        const oldCode = inviteLink.split('/join/')[1]?.split('?')[0];
        if (oldCode) {
          await supabase
            .from('trip_invites')
            .update({ is_active: false })
            .eq('code', oldCode);
        }
      } catch (error) {
        console.error('Error deactivating old invite:', error);
      }
    }
    
    // Generate new trip link
    await generateTripLink();
    toast.success('New invite link generated!');
  };

  /**
   * Resend an existing invite link via email or SMS
   * This allows trip organizers to resend invites without generating new tokens
   */
  const resendInvite = async (recipientEmail?: string, recipientPhone?: string) => {
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
          `Otherwise, you can join through your browser!\n\nSee you there!`
        );
        window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`);
        toast.success(`Invite sent to ${recipientEmail}`);
        return true;
      } else if (recipientPhone) {
        const message = encodeURIComponent(
          `You're invited to join my trip "${tripName}"! ${inviteLink} (Opens in Chravel app if installed)`
        );
        window.open(`sms:${recipientPhone}?body=${message}`);
        toast.success(`Invite sent to ${recipientPhone}`);
        return true;
      } else {
        toast.error('Please provide an email or phone number');
        return false;
      }
    } catch (error) {
      console.error('Error resending invite:', error);
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
      console.error('Failed to copy:', error);
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
          url: inviteLink
        });
      } catch (error) {
        console.error('Error sharing:', error);
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
      `Otherwise, you can join through your browser!\n\nSee you there!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleSMSInvite = () => {
    if (!inviteLink) return;
    
    const message = encodeURIComponent(
      `You're invited to join my trip "${tripName}"! ${inviteLink} (Opens in Chravel app if installed)`
    );
    window.open(`sms:?body=${message}`);
  };

  return {
    copied,
    inviteLink,
    loading,
    regenerateInviteToken,
    resendInvite,
    handleCopyLink,
    handleShare,
    handleEmailInvite,
    handleSMSInvite
  };
};