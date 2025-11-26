
import React, { useEffect, useState } from 'react';
import { X, Copy, Share2, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { useInviteLink } from '../../hooks/useInviteLink';
import { toast } from 'sonner';

interface Participant {
  id: number;
  name: string;
  avatar: string;
}

interface Trip {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  title: string;
  location: string;
  dateRange: string;
  participants: Participant[];
}

interface ShareTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
}

export const ShareTripModal = ({ isOpen, onClose, trip }: ShareTripModalProps) => {
  const [copied, setCopied] = useState(false);

  const {
    inviteLink,
    loading,
    handleCopyLink,
    handleShare
  } = useInviteLink({ 
    isOpen, 
    tripName: trip.title, 
    requireApproval: false, 
    expireIn7Days: false 
  });

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
    await handleCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    await handleShare();
    toast.success('Share options opened!');
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
        <div className="mb-3 pr-10">
          <h2 className="text-xl font-bold text-foreground">Share Trip</h2>
          <p className="text-muted-foreground text-sm">Invite others to join "{trip.title}"</p>
        </div>

        {/* Trip Preview Card */}
        <div className="bg-gradient-to-br from-yellow-600/20 via-yellow-500/10 to-transparent rounded-2xl p-3 mb-3 border border-yellow-500/20">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop')] bg-cover bg-center opacity-10 rounded-2xl"></div>
          <div className="relative z-10">
            <h3 className="text-base font-bold text-white mb-1">{trip.title}</h3>
            <p className="text-white/80 text-sm mb-1">{trip.location}</p>
            <p className="text-white/80 text-sm mb-2">{trip.dateRange}</p>
            <div className="flex -space-x-2">
              {trip.participants.slice(0, 4).map((participant, index) => (
                <img
                  key={participant.id}
                  src={participant.avatar}
                  alt={participant.name}
                  className="w-8 h-8 rounded-full border-2 border-white"
                  style={{ zIndex: trip.participants.length - index }}
                />
              ))}
              {trip.participants.length > 4 && (
                <div className="w-8 h-8 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                  +{trip.participants.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invite Link */}
        <div className="mb-3">
          <label className="block text-foreground text-sm font-medium mb-1">Invite Link</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-foreground text-sm font-mono truncate">
              {loading ? 'Generating invite link...' : inviteLink || 'Loading...'}
            </div>
            <Button
              onClick={handleCopyLinkClick}
              disabled={loading || !inviteLink}
              className="px-3 py-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span className="hidden sm:inline ml-2">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>
        </div>

        {/* Share via Apps Button */}
        <div className="mb-3">
          <Button
            onClick={handleNativeShare}
            disabled={loading || !inviteLink}
            className="w-full flex items-center justify-center gap-3 h-10 text-base font-medium"
          >
            <Share2 size={20} />
            <span>Share via Apps</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Anyone with this link can request to join your trip
        </p>
      </div>
    </div>
  );
};
