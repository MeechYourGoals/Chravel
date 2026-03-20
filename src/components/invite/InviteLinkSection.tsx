import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { isDemoInviteLink } from '@/lib/inviteLinkUtils';

interface InviteLinkSectionProps {
  inviteLink: string;
  loading: boolean;
  copied: boolean;
  isDemoMode?: boolean;
  error?: string | null;
  expiresAt?: string | null;
  onCopyLink: () => void;
  onRegenerate: () => void;
  onRetry?: () => void;
  onShare?: () => void;
  tripName?: string;
}

export const InviteLinkSection = ({
  inviteLink,
  loading,
  copied,
  isDemoMode = false,
  error = null,
  expiresAt = null,
  onCopyLink,
  onRegenerate,
  onRetry,
  onShare,
  tripName,
}: InviteLinkSectionProps) => {
  const [isSharing, setIsSharing] = useState(false);
  const isDemoLink = inviteLink ? isDemoInviteLink(inviteLink) : false;

  // Check if native share is available (iOS, Android, some desktop browsers)
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const formatExpiryDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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
    } catch (shareError) {
      // User cancelled or error - silently ignore AbortError
      if ((shareError as Error).name !== 'AbortError') {
        if (import.meta.env.DEV) console.error('Share failed:', shareError);
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <label id="invite-link-label" className="block text-gray-300 text-sm">
          Share Link
        </label>
        <button
          onClick={onRegenerate}
          disabled={loading}
          aria-label="Regenerate invite link"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50 min-h-[44px] min-w-[44px] justify-center"
        >
          <RotateCcw size={12} />
          Regenerate
        </button>
      </div>

      {/* Error state with retry */}
      {error && !loading && !inviteLink && (
        <div
          className="mb-2 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
          role="alert"
        >
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-red-300 hover:text-white underline underline-offset-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Retry generating invite link"
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {/* Copy button - first */}
        <Button
          onClick={onCopyLink}
          disabled={loading || !inviteLink}
          size="sm"
          aria-label={copied ? 'Link copied to clipboard' : 'Copy invite link to clipboard'}
          className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-gold-primary/40 shadow-none px-3 min-h-[44px]"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </Button>

        {/* Link display - center */}
        <div
          className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-foreground text-sm font-mono truncate flex items-center"
          aria-labelledby="invite-link-label"
          aria-live="polite"
          role="status"
        >
          {loading ? (
            <span className="flex items-center gap-2 text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              Generating invite link...
            </span>
          ) : (
            inviteLink || 'No link generated'
          )}
        </div>

        {/* Share button - last */}
        {canNativeShare && (
          <Button
            onClick={handleNativeShare}
            disabled={loading || !inviteLink || isSharing}
            size="sm"
            aria-label="Share invite link via Messages, Email, and more"
            className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-gold-primary/40 shadow-none px-3 min-h-[44px]"
          >
            {isSharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{isSharing ? 'Sharing...' : 'Share'}</span>
          </Button>
        )}
      </div>

      {/* Success feedback after copy */}
      {copied && (
        <div
          className="mt-2 flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-1.5"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 size={14} className="shrink-0" />
          <span>Link copied! Share it with your group to invite them.</span>
        </div>
      )}

      {/* Invite link expiry info */}
      {expiresAt && inviteLink && !error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-400 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5">
          <Clock size={14} className="shrink-0" />
          <span>Link expires {formatExpiryDate(expiresAt)}</span>
        </div>
      )}

      {/* Demo mode indicator */}
      {(isDemoMode || isDemoLink) && inviteLink && !copied && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gold-primary bg-gold-primary/10 border border-gold-primary/20 rounded-lg px-2 py-1.5">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Demo Mode: Link is for demonstration only.</span>
        </div>
      )}
    </div>
  );
};
