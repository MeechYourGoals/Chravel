import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';
import { extractInviteCodeFromLink, isDemoInviteCode } from '@/lib/inviteLinkUtils';
import { buildInviteLink } from '@/lib/unfurlConfig';

interface UseInviteLinkProps {
  isOpen: boolean;
  tripName: string;
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

// Generate a short branded invite code (e.g., "chravel7x9k2m")
const generateBrandedCode = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 8; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `chravel${randomPart}`;
};

// Check if a code already exists in the database using secure function
// This prevents enumeration attacks by only returning boolean, not table data
const checkCodeExists = async (code: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('check_invite_code_exists', {
      code_param: code,
    });

    if (error) {
      console.error('[InviteLink] Error checking code existence:', error);
      // On error, assume code might exist to be safe (will retry with new code)
      return true;
    }

    return data === true;
  } catch (error) {
    console.error('[InviteLink] Exception checking code:', error);
    return true; // Assume exists on error to prevent collision
  }
};

// Generate a unique branded code with collision detection
const generateUniqueCode = async (maxAttempts = 5): Promise<string> => {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateBrandedCode();
    const exists = await checkCodeExists(code);
    if (!exists) {
      return code;
    }
  }
  // Fallback to UUID if we can't generate a unique short code
  return crypto.randomUUID();
};

export const useInviteLink = ({
  isOpen,
  tripName,
  expireIn7Days,
  tripId,
  proTripId,
}: UseInviteLinkProps): InviteLinkResult => {
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDemoMode } = useDemoMode();

  // Track the current invite code so we can update settings in place
  const currentInviteCode = useRef<string | null>(null);

  // Generate invite link only when modal opens or trip/mode changes
  useEffect(() => {
    if (isOpen) {
      generateTripLink();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- generateTripLink closure deps already covered by dep array
  }, [isOpen, tripId, proTripId, isDemoMode]);

  // Update existing invite settings in place when expireIn7Days changes
  // (instead of creating a new invite row, which would orphan the old one)
  useEffect(() => {
    if (isOpen && currentInviteCode.current && !isDemoMode) {
      updateInviteSettings(currentInviteCode.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to settings changes
  }, [expireIn7Days]);

  const updateInviteSettings = async (code: string) => {
    const { error } = await supabase
      .from('trip_invites')
      .update({
        require_approval: true,
        expires_at: expireIn7Days
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      })
      .eq('code', code);

    if (error) {
      console.error('[InviteLink] Failed to update invite settings:', error);
      toast.error('Failed to update link settings');
    }
  };

  const createInviteInDatabase = async (
    tripIdValue: string,
    inviteCode: string,
  ): Promise<boolean> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error('[InviteLink] User not authenticated');
        toast.error('Please log in to create invite links');
        return false;
      }

      // Verify trip exists and get trip type for permission branching
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .select('id, created_by, trip_type')
        .eq('id', tripIdValue)
        .single();

      if (tripError || !trip) {
        console.error('[InviteLink] Trip not found:', tripError);
        toast.error('Trip not found in database. Make sure this is a real trip, not a demo trip.');
        return false;
      }

      // Normalize trip type: NULL or undefined = 'consumer' (legacy trips)
      const tripType = trip.trip_type || 'consumer';

      // Permission check branches by trip type
      if (tripType === 'consumer') {
        // Consumer trips: Any trip member can create invites
        if (trip.created_by !== user.id) {
          const { data: member } = await supabase
            .from('trip_members')
            .select('id')
            .eq('trip_id', tripIdValue)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!member) {
            console.error('[InviteLink] User is not a trip member');
            toast.error('Only trip members can create invite links');
            return false;
          }
        }
      } else {
        // Pro/Event trips: Only creator or admins can create invites
        if (trip.created_by !== user.id) {
          const { data: admin } = await supabase
            .from('trip_admins')
            .select('id')
            .eq('trip_id', tripIdValue)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!admin) {
            console.error('[InviteLink] User not authorized (pro/event trip)');
            toast.error('Only trip admins can create invite links for this trip');
            return false;
          }
        }
      }

      const inviteData = {
        trip_id: tripIdValue,
        code: inviteCode,
        created_by: user.id,
        is_active: true,
        current_uses: 0,
        require_approval: true, // Always required (backend-enforced policy)
        expires_at: expireIn7Days
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : null,
      };

      const { error } = await supabase.from('trip_invites').insert([inviteData]);

      if (error) {
        console.error('[InviteLink] Database insert error:', error);
        if (error.code === '42501' || error.message?.includes('RLS')) {
          toast.error(
            'Permission denied. You may not have access to create invites for this trip.',
          );
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
      currentInviteCode.current = null; // Demo codes aren't tracked for updates
      setInviteLink(buildInviteLink(demoInviteCode));
      setLoading(false);
      toast.success('Demo invite link created!');
      return;
    }

    // AUTHENTICATED MODE: Validate and create real invite

    // Check if trip ID is a valid UUID (real trips have UUIDs, demo trips have mock IDs)
    if (!UUID_REGEX.test(actualTripId)) {
      console.error('[InviteLink] Invalid trip ID format (not UUID):', actualTripId);
      toast.error(
        'This appears to be a demo trip. Create a real trip to generate shareable invite links.',
      );
      setLoading(false);
      return;
    }

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in to create invite links');
      setLoading(false);
      return;
    }

    // Generate a unique branded invite code (e.g., "chravel7x9k2m")
    const inviteCode = await generateUniqueCode();
    const created = await createInviteInDatabase(actualTripId, inviteCode);

    if (!created) {
      setLoading(false);
      return;
    }

    // Track the code so settings changes can update this row in place
    currentInviteCode.current = inviteCode;

    // Use branded unfurl domain for rich OG previews
    setInviteLink(buildInviteLink(inviteCode));
    setLoading(false);
    toast.success('Invite link created!');
  };

  const regenerateInviteToken = async () => {
    // Deactivate old invite if it exists (only for real invites)
    if (inviteLink && !isDemoMode) {
      try {
        const oldCode = extractInviteCodeFromLink(inviteLink);
        if (oldCode && !isDemoInviteCode(oldCode)) {
          const { error } = await supabase
            .from('trip_invites')
            .update({ is_active: false })
            .eq('code', oldCode);

          if (error) {
            console.error('[InviteLink] Failed to deactivate old invite:', error);
            toast.error('Failed to revoke old link. Please try again.');
            return; // Abort — don't create a new link if we can't kill the old one
          }
        } else if (inviteLink && !oldCode) {
          console.warn(
            '[InviteLink] Could not extract code from invite link for deactivation:',
            inviteLink.substring(0, 50),
          );
        }
      } catch (error) {
        console.error('[InviteLink] Error deactivating old invite:', error);
        toast.error('Failed to revoke old link. Please try again.');
        return; // Abort on unexpected error
      }
    }

    // Clear tracked code before generating new one
    currentInviteCode.current = null;

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
            `If you have ChravelApp installed, this link will open it directly. ` +
            `Otherwise, you can join through your browser!\n\nSee you there!`,
        );
        window.open(`mailto:${recipientEmail}?subject=${subject}&body=${body}`);
        toast.success(`Invite sent to ${recipientEmail}`);
        return true;
      } else if (recipientPhone) {
        const message = encodeURIComponent(
          `You're invited to join my trip "${tripName}"! ${inviteLink} (Opens in ChravelApp if installed)`,
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
        `If you have ChravelApp installed, this link will open it directly. ` +
        `Otherwise, you can join through your browser!\n\nSee you there!`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleSMSInvite = () => {
    if (!inviteLink) return;

    const message = encodeURIComponent(
      `You're invited to join my trip "${tripName}"! ${inviteLink} (Opens in ChravelApp if installed)`,
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
