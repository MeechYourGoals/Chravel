import React from 'react';
import { Share, Mail, MessageCircle } from 'lucide-react';

interface ShareOptionsSectionProps {
  loading: boolean;
  inviteLink: string;
  onShare: () => void;
  onEmailInvite: () => void;
  onSMSInvite: () => void;
}

export const ShareOptionsSection = ({ 
  loading, 
  inviteLink, 
  onShare, 
  onEmailInvite, 
  onSMSInvite 
}: ShareOptionsSectionProps) => {
  return (
    <>
      {/* Quick Share Options */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button
          onClick={onShare}
          disabled={loading || !inviteLink}
          className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          <Share size={20} />
          <span>Share</span>
        </button>
        
        <button
          onClick={onEmailInvite}
          disabled={loading || !inviteLink}
          className="flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          <Mail size={20} />
          <span>Email</span>
        </button>
      </div>

      {/* SMS Option */}
      <button
        onClick={onSMSInvite}
        disabled={loading || !inviteLink}
        className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2 rounded-xl transition-colors mb-3 disabled:opacity-50"
      >
        <MessageCircle size={20} />
        <span>Text Message</span>
      </button>
    </>
  );
};