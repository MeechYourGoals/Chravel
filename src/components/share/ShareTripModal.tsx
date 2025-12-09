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
    return `https://chravel.app/trip/${trip.id}/preview`;
  }, [trip.id]);

  // Generate share text for social media
  const shareText = useMemo(() => {
    return `Check out ${trip.title} - a trip to ${trip.location}! ${trip.participants.length} travelers are going.`;
  }, [trip.title, trip.location, trip.participants.length]);

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-3xl p-4 max-w-lg w-full max-h-[600px] overflow-y-auto animate-scale-in relative">
        {/* Close Button - Clearly visible */}
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          title="Close"
          className="absolute top-3 right-3 z-10 bg-muted/80 hover:bg-destructive/20 hover:text-destructive text-foreground w-9 h-9 rounded-full border border-border"
        >
          <X size={18} />
        </Button>

        {/* Header */}
        <div className="mb-4 pr-10">
          <h2 className="text-xl font-bold text-foreground">Share Trip</h2>
          <p className="text-muted-foreground text-sm">Share this trip preview with friends</p>
        </div>

        {/* Trip Preview Card - Social Media Style */}
        <div className="relative rounded-2xl overflow-hidden mb-4 border border-white/10">
          {/* Cover Image */}
          <div
            className="h-32 bg-cover bg-center"
            style={{
              backgroundImage: `url('${trip.coverPhoto || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&h=300&fit=crop'}')`
            }}
          />
          <div className="absolute inset-0 h-32 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Chravel Badge */}
          <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
            <span className="text-yellow-400 text-xs font-bold">Chravel</span>
          </div>

          {/* Trip Details */}
          <div className="p-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95">
            <h3 className="text-lg font-bold text-white mb-3">{trip.title}</h3>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <MapPin size={14} className="text-yellow-400" />
                <span>{trip.location}</span>
              </div>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Calendar size={14} className="text-yellow-400" />
                <span>{trip.dateRange}</span>
              </div>
              <div className="flex items-center gap-2 text-white/80 text-sm">
                <Users size={14} className="text-yellow-400" />
                <span>{trip.participants.length} {trip.participants.length === 1 ? 'traveler' : 'travelers'}</span>
              </div>
            </div>

            {/* Participant Avatars */}
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {trip.participants.slice(0, 5).map((participant, index) => (
                  <div
                    key={participant.id}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-xs font-semibold text-black border-2 border-gray-900"
                    style={{ zIndex: trip.participants.length - index }}
                    title={participant.name}
                  >
                    {participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                ))}
              </div>
              {trip.participants.length > 5 && (
                <span className="text-white/60 text-xs ml-2">+{trip.participants.length - 5} more</span>
              )}
            </div>
          </div>
        </div>

        {/* Preview Link */}
        <div className="mb-4">
          <label className="block text-foreground text-sm font-medium mb-1">Preview Link</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-foreground text-sm font-mono truncate">
              {previewLink}
            </div>
            <Button
              onClick={handleCopyLink}
              className="px-3 py-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="hidden sm:inline ml-2">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          This link shows a preview of your trip. Use "Invite" to let people join.
        </p>
      </div>
    </div>
  );
};
