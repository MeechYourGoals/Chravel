import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, MessageCircle, X, Loader2, PhoneOff } from 'lucide-react';
import { getInitials, isValidAvatarUrl } from '@/utils/avatarUtils';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { PersonLabel } from '@/components/PersonLabel';

export interface MemberContactCardMember {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  isCreator?: boolean;
  /** Pro-only title for display in Pro trip contexts. */
  title?: string | null;
  /** Whether the trip context allows titles to be shown. */
  showTitle?: boolean;
}

interface MemberContactCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberContactCardMember | null;
  tripId?: string;
  onSendMessage?: (memberId: string) => void;
}

interface MemberContactInfo {
  phone: string | null;
  showPhone: boolean;
}

/**
 * Lightweight contact card that appears when clicking a trip member.
 * Shows:
 * - Display name and avatar
 * - Role (if applicable)
 * - Phone number (only if member has opted in via show_phone setting)
 * - Quick actions: Call, Send Message
 */
export const MemberContactCard: React.FC<MemberContactCardProps> = ({
  open,
  onOpenChange,
  member,
  tripId,
  onSendMessage,
}) => {
  const [contactInfo, setContactInfo] = useState<MemberContactInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch contact info when member changes
  useEffect(() => {
    if (!member || !open) {
      setContactInfo(null);
      return;
    }

    const fetchContactInfo = async () => {
      setLoading(true);
      try {
        // Use profiles_public view which respects privacy settings
        // Phone is only returned if user has opted in (show_phone=true) AND viewer is trip co-member
        const { data, error } = await supabase
          .from('profiles_public')
          .select('phone')
          .eq('user_id', member.id)
          .single();

        if (error) {
          console.error('Error fetching contact info:', error);
          setContactInfo({ phone: null, showPhone: false });
          return;
        }

        // If phone is returned, it means the user has opted in to share
        const hasPhone = !!data?.phone;
        setContactInfo({
          phone: data?.phone ?? null,
          showPhone: hasPhone, // Phone only comes back if sharing is enabled
        });
      } catch (err) {
        console.error('Error fetching contact info:', err);
        setContactInfo({ phone: null, showPhone: false });
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, [member, open]);

  const handleCall = () => {
    if (contactInfo?.phone) {
      window.location.href = `tel:${contactInfo.phone}`;
    }
  };

  const handleSendMessage = () => {
    if (member && onSendMessage) {
      onSendMessage(member.id);
      onOpenChange(false);
    }
  };

  if (!member) return null;

  const hasPhone = contactInfo?.phone && contactInfo.phone.trim() !== '';
  const phoneHidden = contactInfo?.showPhone === false && !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" showClose={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Contact {member.name}</DialogTitle>
        </DialogHeader>

        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 p-1 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={18} className="text-gray-400" />
        </button>

        {/* Member Info */}
        <div className="flex flex-col items-center text-center pt-2 pb-4">
          <Avatar className="w-20 h-20 mb-4 border-2 border-white/20">
            {isValidAvatarUrl(member.avatar) ? (
              <AvatarImage src={member.avatar} alt={member.name} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-semibold">
              {getInitials(member.name)}
            </AvatarFallback>
          </Avatar>

          <PersonLabel
            name={member.name}
            title={member.title}
            showTitle={member.showTitle}
            nameClassName="text-lg font-semibold text-white"
          />

          {member.role && <p className="text-sm text-gray-400 mt-0.5">{member.role}</p>}

          {member.isCreator && (
            <span className="inline-flex items-center gap-1 text-xs text-yellow-500 mt-1">
              👑 Trip Organizer
            </span>
          )}
        </div>

        {/* Contact Actions */}
        <div className="space-y-2">
          {/* Phone Section */}
          {loading ? (
            <div className="flex items-center justify-center py-3 bg-white/5 rounded-lg">
              <Loader2 size={18} className="animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-400">Loading contact info...</span>
            </div>
          ) : hasPhone ? (
            <Button
              onClick={handleCall}
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-white/5 hover:bg-white/10 border-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Phone size={16} className="text-green-400" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium text-white">Call</span>
                <span className="text-xs text-gray-400">{contactInfo?.phone}</span>
              </div>
            </Button>
          ) : phoneHidden ? (
            <div className="flex items-center gap-3 py-3 px-4 bg-white/5 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                <PhoneOff size={16} className="text-gray-500" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-sm text-gray-400">Phone not shared</span>
                <span className="text-xs text-gray-500">
                  This member hasn't enabled phone sharing
                </span>
              </div>
            </div>
          ) : null}

          {/* Send Message */}
          {onSendMessage && (
            <Button
              onClick={handleSendMessage}
              variant="outline"
              className="w-full justify-start gap-3 h-12 bg-white/5 hover:bg-white/10 border-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <MessageCircle size={16} className="text-blue-400" />
              </div>
              <span className="text-sm font-medium text-white">Send Message</span>
            </Button>
          )}
        </div>

        {/* Privacy Note */}
        <p className="text-[10px] text-gray-500 text-center mt-3">
          Contact info is only visible if the member has enabled sharing in their privacy settings.
        </p>
      </DialogContent>
    </Dialog>
  );
};
