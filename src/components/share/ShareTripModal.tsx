import React, { useEffect, useState, useMemo } from 'react';
import { X, Copy, Share2, Check, MapPin, Calendar, Users } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface Participant {
  id: number;
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

  // Generate branded preview link
  const previewLink = useMemo(() => {
    /**
     * IMPORTANT (unfurling): iMessage/Slack/WhatsApp/Teams do NOT execute JS.
     * This link must resolve to server-rendered HTML with OG tags at request time.
     *
     * To avoid coupling preview unfurling to the SPA host (e.g., Vercel rewrites),
     * we default to the Supabase Edge Function that renders the OG HTML.
     *
     * You can override via `VITE_TRIP_PREVIEW_BASE_URL` to point at a custom
     * preview service/domain (recommended long-term).
     *
     * Expected formats:
     * - Supabase REST edge functions: https://<project-ref>.supabase.co/functions/v1/generate-trip-preview
     * - Custom preview service:       https://preview.chravel.app/trip-preview
     */
    const base =
      import.meta.env.VITE_TRIP_PREVIEW_BASE_URL ??
      'https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/generate-trip-preview';

    const tripId = encodeURIComponent(String(trip.id));
    return `${base}?tripId=${tripId}`;
  }, [trip.id]);

  // Generate share text for social media - ensure minimum of 1 Chraveler (creator always exists)
  const chravelerCount = Math.max(trip.peopleCount ?? trip.participants.length, 1);
  const shareText = useMemo(() => {
    return `Check out ${trip.title} - a trip to ${trip.location}! ${chravelerCount} Chravelers are going.`;
  }, [trip.title, trip.location, chravelerCount]);

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
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip.title,
          text: shareText,
          url: previewLink
        });
      } catch (error) {
        // User cancelled or error - silently ignore
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      // Fallback to copy
      await handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-2xl max-w-md w-full animate-scale-in">
        {/* Compact Header with X */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-medium text-foreground">Share Trip</span>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            title="Close"
            className="hover:bg-destructive/20 hover:text-destructive text-muted-foreground w-7 h-7 rounded-full"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content - Compact */}
        <div className="p-3">
          {/* Trip Preview Card */}
          <div className="relative rounded-xl overflow-hidden mb-3 border border-border">
            {/* Cover Image - Reduced height */}
            <div
              className="h-24 bg-cover bg-center"
              style={{
                backgroundImage: `url('${trip.coverPhoto || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=300&fit=crop'}')`
              }}
            />
            <div className="absolute inset-0 h-24 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Chravel Badge */}
            <div className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              <span className="text-yellow-400 text-[10px] font-bold">Chravel</span>
            </div>

            {/* Trip Details - Compact */}
            <div className="p-3 bg-gradient-to-br from-gray-900/95 to-gray-800/95">
              <h3 className="text-base font-bold text-white mb-2">{trip.title}</h3>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/80 text-xs">
                <div className="flex items-center gap-1">
                  <MapPin size={12} className="text-yellow-400" />
                  <span>{trip.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar size={12} className="text-yellow-400" />
                  <span>{trip.dateRange}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={12} className="text-yellow-400" />
                  <span>{chravelerCount} Chravelers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Link */}
          <div>
            <label className="block text-foreground text-xs font-medium mb-1">Preview Link</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-muted border border-border rounded-lg px-2 py-1.5 text-foreground text-xs font-mono truncate">
                {previewLink}
              </div>
              <Button
                onClick={handleCopyLink}
                size="sm"
                className="px-3 h-8"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span className="ml-1.5">{copied ? 'Copied!' : 'Copy'}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
