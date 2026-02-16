import React, { useState } from 'react';
import { Copy, Check, RotateCcw, AlertTriangle, Share2 } from 'lucide-react';

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
  const isDemoLink = inviteLink?.includes('/j/demo-');

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
      <div className="flex items-center justify-between mb-2">
        <label className="block text-gray-300 text-sm">Share Link</label>
        <button
          onClick={onRegenerate}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RotateCcw size={12} />
          Regenerate
        </button>
      </div>
      <div className="flex gap-2">
        {/* Copy button - first */}
        <button
          onClick={onCopyLink}
          disabled={loading || !inviteLink}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        {/* Link display - center */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-300 text-sm font-mono truncate">
          {loading ? 'Generating invite link...' : inviteLink || 'Failed to generate link'}
        </div>

        {/* Share button - last */}
        {canNativeShare && (
          <button
            onClick={handleNativeShare}
            disabled={loading || !inviteLink || isSharing}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Share via Messages, Email, and more"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </div>

      {/* Demo mode indicator */}
      {(isDemoMode || isDemoLink) && inviteLink && (
        <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-2 py-1.5">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Demo Mode: Link is for demonstration only.</span>
        </div>
      )}
    </div>
  );
};
