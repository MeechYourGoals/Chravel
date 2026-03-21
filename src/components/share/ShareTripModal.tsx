import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, MapPin, Calendar, Users, Share2, Image, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { buildTripPreviewLink } from '@/lib/unfurlConfig';

interface Participant {
  id: number | string;
  name: string;
  avatar: string;
}

interface Trip {
  id: number | string;
  title: string;
  location: string;
  dateRange: string;
  participants: Participant[];
  coverPhoto?: string;
  peopleCount?: number;
}

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}

export const ShareTripModal = ({ isOpen, onClose, trip }: ShareTripModalProps) => {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [coverImageLoaded, setCoverImageLoaded] = useState(false);
  const [coverImageError, setCoverImageError] = useState(false);

  // Check if native share is available (iOS, Android, some desktop browsers)
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Generate branded preview link using centralized config
  const previewLink = useMemo(() => {
    return buildTripPreviewLink(trip.id);
  }, [trip.id]);

  // Generate share text for social media - ensure minimum of 1 Chraveler (creator always exists)
  const chravelerCount = Math.max(trip.peopleCount ?? trip.participants.length, 1);
  const shareText = useMemo(() => {
    return `Check out ${trip.title} - a trip to ${trip.location}! ${chravelerCount} Chravelers are going.`;
  }, [trip.title, trip.location, chravelerCount]);

  // Reset cover image state when trip changes
  useEffect(() => {
    setCoverImageLoaded(false);
    setCoverImageError(false);
  }, [trip.coverPhoto]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(previewLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (_clipboardError) {
      // Clipboard copy failed -- user notified via toast
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      await navigator.share({
        title: trip.title,
        text: shareText,
        url: previewLink,
      });
    } catch (error) {
      // User cancelled or error - silently ignore AbortError
      if ((error as Error).name !== 'AbortError') {
        toast.error('Share failed. Please try copying the link instead.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  // Determine if trip data is complete enough for a rich preview
  const hasTitle = Boolean(trip.title);
  const hasLocation = Boolean(trip.location);
  const hasDateRange = Boolean(trip.dateRange);
  const hasCoverPhoto = Boolean(trip.coverPhoto) && !coverImageError;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Share trip: ${trip.title}`}
    >
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl max-w-md w-full animate-scale-in">
        {/* Compact Header with X */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b border-border"
          style={{ paddingTop: 'max(8px, calc(env(safe-area-inset-top, 0px) + 8px))' }}
        >
          <span className="text-sm font-medium text-foreground">Share Trip</span>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            aria-label="Close share dialog"
            className="hover:bg-destructive/20 hover:text-destructive text-muted-foreground w-7 h-7 rounded-full min-w-[44px] min-h-[44px]"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content - Compact */}
        <div className="p-3">
          {/* Share Card Preview */}
          <div className="relative rounded-xl overflow-hidden mb-3 border border-border">
            {/* Cover Image with loading/fallback */}
            <div className="relative h-24">
              {hasCoverPhoto && !coverImageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <Loader2 size={20} className="text-gray-400 animate-spin" />
                </div>
              )}
              {hasCoverPhoto ? (
                <>
                  <img
                    src={trip.coverPhoto}
                    alt={`Cover photo for ${trip.title}`}
                    className={`w-full h-24 object-cover transition-opacity duration-300 ${coverImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setCoverImageLoaded(true)}
                    onError={() => setCoverImageError(true)}
                  />
                </>
              ) : (
                <div className="h-24 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <Image size={24} className="text-gray-500" />
                </div>
              )}
              <div className="absolute inset-0 h-24 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Chravel Badge */}
            <div className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              <span className="text-white text-[10px] font-semibold">ChravelApp</span>
            </div>

            {/* Trip Details with fallback display */}
            <div className="p-3 bg-gradient-to-br from-gray-900/95 to-gray-800/95">
              <h3 className="text-base font-bold text-white mb-2">
                {hasTitle ? trip.title : 'Untitled Trip'}
              </h3>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/80 text-xs">
                {hasLocation ? (
                  <div className="flex items-center gap-1">
                    <MapPin size={12} className="text-gold-primary" />
                    <span>{trip.location}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <MapPin size={12} className="text-gray-500" />
                    <span className="text-white/40 italic">No destination set</span>
                  </div>
                )}
                {hasDateRange ? (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-gold-primary" />
                    <span>{trip.dateRange}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-gray-500" />
                    <span className="text-white/40 italic">Dates TBD</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-gold-primary" />
                  <span>{chravelerCount} Chravelers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Share Buttons */}
          <div className="flex gap-2 mb-3">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + previewLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share trip via WhatsApp"
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 rounded-lg py-2 text-xs font-medium transition-colors min-h-[44px]"
            >
              WhatsApp
            </a>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(previewLink)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share trip on Twitter"
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 text-[#1DA1F2] border border-[#1DA1F2]/30 rounded-lg py-2 text-xs font-medium transition-colors min-h-[44px]"
            >
              Twitter
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(trip.title)}&body=${encodeURIComponent(shareText + '\n\n' + previewLink)}`}
              aria-label="Share trip via Email"
              className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-foreground border border-border rounded-lg py-2 text-xs font-medium transition-colors min-h-[44px]"
            >
              Email
            </a>
          </div>

          {/* Preview Link */}
          <div>
            <label
              className="block text-foreground text-xs font-medium mb-1"
              id="preview-link-label"
            >
              Preview Link
            </label>
            <div className="flex gap-2">
              <Button
                onClick={handleCopyLink}
                size="sm"
                aria-label={copied ? 'Link copied to clipboard' : 'Copy share link to clipboard'}
                className={`${
                  copied
                    ? 'bg-green-700 hover:bg-green-600 border-green-500/40'
                    : 'bg-[#2a2a2a] hover:bg-[#3a3a3a] border-gold-primary/40'
                } text-white border shadow-none px-3 h-8 min-w-[44px] min-h-[44px] transition-colors`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span className="ml-1.5">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
              <div
                className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground text-xs font-mono truncate"
                aria-labelledby="preview-link-label"
                role="textbox"
                aria-readonly="true"
              >
                {previewLink}
              </div>
              {canNativeShare && (
                <Button
                  onClick={handleNativeShare}
                  disabled={isSharing}
                  size="sm"
                  aria-label="Share via device share sheet"
                  className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white border border-gold-primary/40 shadow-none px-3 h-8 min-w-[44px] min-h-[44px]"
                >
                  {isSharing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Share2 size={14} />
                  )}
                  <span className="ml-1.5">{isSharing ? 'Sharing...' : 'Share'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
