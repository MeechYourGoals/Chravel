import React, { useState } from 'react';
import { Copy, Check, RotateCcw, AlertTriangle, Share2 } from 'lucide-react';
import { Button } from '../ui/button';
import { isDemoInviteLink } from '@/lib/inviteLinkUtils';

interface InviteLinkSectionProps {
  inviteLink: string;
  loading: boolean;
  copied: boolean;
  isDemoMode?: boolean;
  onCopyLink: () => void;
  onRegenerate: () => void;
  onShare?: () => void;
  tripName?: string;
}

export const InviteLinkSection = ({
  inviteLink,
  loading,
  copied,
  isDemoMode = false,
  onCopyLink,
  onRegenerate,
  onShare,
  tripName,
}: InviteLinkSectionProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const isDemoLink = inviteLink ? isDemoInviteLink(inviteLink) : false;

  // Check if native share is available (iOS, Android, some desktop browsers)
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    if (!inviteLink) return;

    setIsSharing(true);
    try {
      if (onShare) {
        onShare();
        return;
      }

      await navigator.share({
        title: tripName ? `Join ${tripName}` : 'Trip Invitation',
        text: tripName
          ? `You're invited to join "${tripName}" on Chravel!`
          : "You're invited to join a trip on Chravel!",
        url: inviteLink,
      });
    } catch (error) {
      // User cancelled or error - silently ignore AbortError
      if ((error as Error).name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="mb-3">
      <div className="flex items-end justify-end mb-2">
        {showRegenerateConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400">Invalidate current link?</span>
            <button
              onClick={() => {
                setShowRegenerateConfirm(false);
                onRegenerate();
              }}
              disabled={loading}
              className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowRegenerateConfirm(false)}
              className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowRegenerateConfirm(true)}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <RotateCcw size={12} />
            Regenerate
          </button>
        )}
      </div>
      <div className="flex gap-2 items-end">
        {/* Copy button - first */}
        <Button
          onClick={onCopyLink}
          disabled={loading || !inviteLink}
          size="sm"
          className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-gold-primary/40 shadow-none px-3 h-8"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </Button>

        {/* Link display - center with label */}
        <div className="flex-1 flex flex-col items-center">
          <label className="text-gray-300 text-sm mb-1">Share Link</label>
          <div className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground text-sm font-mono truncate">
            {loading ? 'Generating invite link...' : inviteLink || 'Failed to generate link'}
          </div>
        </div>

        {/* Share button - last */}
        {canNativeShare && (
          <Button
            onClick={handleNativeShare}
            disabled={loading || !inviteLink || isSharing}
            size="sm"
            className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-gold-primary/40 shadow-none px-3 h-8"
            title="Share via Messages, Email, and more"
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Share</span>
          </Button>
        )}
      </div>

      {/* Demo mode indicator */}
      {(isDemoMode || isDemoLink) && inviteLink && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gold-primary bg-gold-primary/10 border border-gold-primary/20 rounded-lg px-2 py-1.5">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Demo Mode: Link is for demonstration only.</span>
        </div>
      )}
    </div>
  );
};
