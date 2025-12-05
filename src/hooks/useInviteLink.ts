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

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useInviteLink = ({ 
  isOpen, 
  tripName, 
  requireApproval, 
  expireIn7Days, 
  tripId, 
  proTripId 
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

  const createInviteInDatabase = async (tripIdValue: string, inviteCode: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[InviteLink] User not authenticated');
        toast.error('Please log in to create invite links');
        return false;
      }

      // Verify trip exists and user has permission
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, created_by')
        .eq('id', tripIdValue)
        .single();

      if (tripError || !trip) {
        console.error('[InviteLink] Trip not found:', tripError);
        toast.error('Trip not found in database. Make sure this is a real trip, not a demo trip.');
        return false;
      }

      // Check if user is creator or admin
      if (trip.created_by !== user.id) {
        const { data: admin } = await supabase
          .from('trip_admins')
          .select('id')
          .eq('trip_id', tripIdValue)
          .eq('user_id', user.id)
          .single();

        if (!admin) {
          console.error('[InviteLink] User not authorized');
          toast.error('Only the trip creator or admins can create invite links');
          return false;
        }
      }

      const inviteData = {
        trip_id: tripIdValue,
        code: inviteCode,
        created_by: user.id,
        is_active: true,
        current_uses: 0,
        require_approval: requireApproval,
        expires_at: expireIn7Days 
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() 
          : null,
      };

      const { error } = await supabase
        .from('trip_invites')
        .insert([inviteData]);

      if (error) {
        console.error('[InviteLink] Database insert error:', error);
        if (error.code === '42501' || error.message?.includes('RLS')) {
          toast.error('Permission denied. You may not have access to create invites for this trip.');
        } else {
          toast.error('Failed to create invite link. Please try again.');
        }
        return false;
      }

      console.log('[InviteLink] Invite created successfully:', inviteCode.substring(0, 8));
      return true;
    } catch (error) {
      console.error('[InviteLink] Unexpected error:', error);
      toast.error('An unexpected error occurred. Please try again.');
      return false;
    }
  };

  const generateTripLink = async () => {
    setLoading(true);
    const baseUrl = window.location.origin;
    const actualTripId = proTripId || tripId;
    
    if (!actualTripId) {
      toast.error('No trip ID provided');
      setLoading(false);
      return;
    }

    // DEMO MODE: Generate demonstration link without database
    if (isDemoMode) {
      const demoInviteCode = `demo-${actualTripId}-${Date.now().toString(36)}`;
      setInviteLink(`${baseUrl}/join/${demoInviteCode}`);
      setLoading(false);
      toast.success('Demo invite link created!');
      return;
    }

    // AUTHENTICATED MODE: Validate and create real invite
    
    // Check if trip ID is a valid UUID (real trips have UUIDs, demo trips have mock IDs)
    if (!UUID_REGEX.test(actualTripId)) {
      console.error('[InviteLink] Invalid trip ID format (not UUID):', actualTripId);
      toast.error('This appears to be a demo trip. Create a real trip to generate shareable invite links.');
      setLoading(false);
      return;
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to create invite links');
      setLoading(false);
      return;
    }

    // Create the invite in database
    const inviteCode = crypto.randomUUID();
    const created = await createInviteInDatabase(actualTripId, inviteCode);
    
    if (!created) {
      setLoading(false);
      return;
    }

    setInviteLink(`${baseUrl}/join/${inviteCode}`);
    setLoading(false);
    toast.success('Invite link created!');
  };

  const regenerateInviteToken = async () => {
    // Deactivate old invite if it exists (only for real invites)
    if (inviteLink && !isDemoMode) {
      try {
        const oldCode = inviteLink.split('/join/')[1]?.split('?')[0];
        if (oldCode && !oldCode.startsWith('demo-')) {
          await supabase
            .from('trip_invites')
            .update({ is_active: false })
            .eq('code', oldCode);
        }
      } catch (error) {
        console.error('[InviteLink] Error deactivating old invite:', error);
      }
    }
    
    // Generate new invite link
    await generateTripLink();
  };

  const resendInvite = async (recipientEmail?: string, recipientPhone?: string): Promise<boolean> => {
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
          url: inviteLink
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
    isDemoMode,
    regenerateInviteToken,
    resendInvite,
    handleCopyLink,
    handleShare,
    handleEmailInvite,
    handleSMSInvite
  };
};
