
import React, { useEffect, useState } from 'react';
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
  placesCount?: number;
  peopleCount?: number;
}

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}

export const ShareTripModal = ({ isOpen, onClose, trip }: ShareTripModalProps) => {
  const [copied, setCopied] = useState(false);
  
  // Generate share preview URL (read-only trip preview, not invite)
  // This will show the trip detail page with OG tags for social media previews
  const sharePreviewUrl = `${window.location.origin}/trip/${trip.id}`;
  
  // Create share text with trip details
  const shareText = `Check out this amazing trip to ${trip.location}! ${trip.title} - ${trip.dateRange}. Join us on Chravel! ${sharePreviewUrl}`;

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

  const handleCopyLinkClick = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Trip details copied to clipboard!');
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
          title: `Join ${trip.title} on Chravel`,
          text: shareText,
          url: sharePreviewUrl
        });
        toast.success('Shared successfully!');
      } catch (error) {
        // User cancelled or error occurred
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          toast.error('Failed to share');
        }
      }
    } else {
      // Fallback to copy
      handleCopyLinkClick();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-background/95 backdrop-blur-md border border-border rounded-3xl p-4 max-w-lg w-full max-h-[500px] overflow-y-auto animate-scale-in relative">
        {/* Close Button - Fixed Position */}
        <Button 
          onClick={onClose} 
          variant="ghost" 
          size="icon" 
          title="Close"
          className="absolute top-4 right-4 z-10 hover:bg-destructive/20 hover:text-destructive text-foreground w-10 h-10 rounded-full"
        >
          <X size={20} />
        </Button>

        {/* Header */}
        <div className="mb-4 pr-10">
          <h2 className="text-xl font-bold text-foreground">Share Trip</h2>
          <p className="text-muted-foreground text-sm">Share "{trip.title}" on social media</p>
        </div>

        {/* Social Preview Card - Designed for sharing */}
        <div className="mb-4 bg-gradient-to-br from-yellow-600/20 via-yellow-500/10 to-transparent rounded-2xl overflow-hidden border border-yellow-500/20 shadow-lg">
          {/* Cover Image */}
          <div 
            className="relative h-32 bg-cover bg-center"
            style={{
              backgroundImage: `url('${trip.coverPhoto || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop'}')`
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">{trip.title}</h3>
            </div>
          </div>

          {/* Trip Details */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <MapPin size={16} className="text-yellow-400" />
              <span className="font-medium">{trip.location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <Calendar size={16} className="text-yellow-400" />
              <span className="font-medium">{trip.dateRange}</span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-yellow-400" />
                <span className="text-white/80 text-sm">
                  {trip.peopleCount ?? trip.participants.length} {trip.peopleCount === 1 ? 'person' : 'people'}
                </span>
              </div>
              {trip.placesCount !== undefined && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-yellow-400" />
                  <span className="text-white/80 text-sm">{trip.placesCount} places</span>
                </div>
              )}
            </div>

            {/* Participant Avatars */}
            {trip.participants.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <div className="flex -space-x-2">
                  {trip.participants.slice(0, 5).map((participant, index) => (
                    <div
                      key={participant.id}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-xs font-semibold text-black border-2 border-white"
                      style={{ zIndex: trip.participants.length - index }}
                      title={participant.name}
                    >
                      {participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                  ))}
                  {trip.participants.length > 5 && (
                    <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                      +{trip.participants.length - 5}
                    </div>
                  )}
                </div>
                <span className="text-white/60 text-xs ml-2">Travelers</span>
              </div>
            )}
          </div>
        </div>

        {/* Share Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center gap-3 h-11 text-base font-medium bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black"
          >
            <Share2 size={20} />
            <span>Share via Apps</span>
          </Button>

          <div className="flex gap-2">
            <div className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-foreground text-xs font-mono truncate">
              {sharePreviewUrl}
            </div>
            <Button
              onClick={handleCopyLinkClick}
              className="px-4 py-2"
              variant="outline"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="hidden sm:inline ml-2">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          This creates a shareable preview of your trip. Use "Invite to Trip" to generate join links.
        </p>
      </div>
    </div>
  );
};
