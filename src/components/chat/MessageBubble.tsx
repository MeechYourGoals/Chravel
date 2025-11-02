import React, { useState } from 'react';
import { getMockAvatar } from '@/utils/mockAvatars';
import { MessageReactionBar } from './MessageReactionBar';
import { GoogleMapsWidget } from './GoogleMapsWidget';
import { ChatMessageWithGrounding } from '@/types/grounding';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { useLongPress } from '@/hooks/useLongPress';

export interface MessageBubbleProps {
  id: string;
  text: string;
  senderName: string;
  senderAvatar?: string;
  timestamp: string;
  isBroadcast?: boolean;
  isPayment?: boolean;
  isOwnMessage?: boolean;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
  showSenderInfo?: boolean;
  // 🆕 Grounding support
  grounding?: {
    sources?: Array<{ id: string; title: string; url: string; snippet: string; source: string }>;
    googleMapsWidget?: string;
  };
}

export const MessageBubble = ({
  id,
  text,
  senderName,
  senderAvatar,
  timestamp,
  isBroadcast,
  isPayment,
  isOwnMessage = false,
  reactions,
  onReaction,
  grounding,
  showSenderInfo = true,
}: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const isMobilePortrait = useMobilePortrait();

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Unified layout: Metadata above bubble for both mobile and desktop (consistency)
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      setShowReactions(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowReactions(false), 5000);
    },
    threshold: 500,
  });

  return (
    <div className={cn('flex gap-2', isOwnMessage ? 'justify-end' : 'justify-start')}>
      {!isOwnMessage && showSenderInfo && (
        <img
          src={senderAvatar || getMockAvatar(senderName)}
          alt={senderName}
          className="w-10 h-10 rounded-full object-cover border-2 border-border/50 flex-shrink-0"
        />
      )}
      {!isOwnMessage && !showSenderInfo && <div className="w-10 flex-shrink-0" />}

      <div
        className={cn(
          'flex flex-col max-w-[85%]',
          isOwnMessage ? 'items-end text-right' : 'items-start text-left',
        )}
      >
        {showSenderInfo && (
          <span className="text-xs text-white/70 mb-1">
            {isOwnMessage ? 'You' : senderName} — {formatTime(timestamp)}
          </span>
        )}
        <div
          className={cn(
            'px-3 py-2 rounded-2xl break-words',
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/80 text-white',
            isBroadcast && !isOwnMessage && 'border-2 border-red-500/50',
            isPayment && !isOwnMessage && 'border-2 border-green-500/50',
          )}
        >
          {text}
        </div>
        
        {/* Google Maps Widget */}
        {grounding?.googleMapsWidget && (
          <div className="mt-2">
            <GoogleMapsWidget 
              widgetToken={grounding.googleMapsWidget} 
              height={isMobilePortrait ? 200 : 250} 
            />
          </div>
        )}
        
        {/* Grounding Sources */}
        {grounding?.sources && grounding.sources.length > 0 && (
          <div className={cn("space-y-2", "mt-2")}>
            <div className={cn(
              "font-medium text-white/80 flex items-center gap-2",
              isMobilePortrait ? "text-[10px]" : "text-xs"
            )}>
              <span>Sources:</span>
              {grounding.sources.some(s => s.source === 'google_maps_grounding') && (
                <span className={cn(
                  "bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded",
                  isMobilePortrait ? "text-[9px]" : "text-[10px]"
                )}>
                  Verified by Google Maps
                </span>
              )}
            </div>
            <div className="space-y-1">
              {grounding.sources.map((source, idx) => (
                <a
                  key={source.id || idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "block text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 rounded-lg transition-colors",
                    isMobilePortrait ? "text-[10px] p-1.5" : "text-xs p-2"
                  )}
                >
                  <ExternalLink size={isMobilePortrait ? 8 : 10} />
                  <span className="truncate">{source.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
        
        {showReactions && (
          <div className={cn(
            isMobilePortrait ? 'mt-1' : 'mt-1'
          )}>
            <MessageReactionBar messageId={id} reactions={reactions} onReaction={onReaction} />
          </div>
        )}
      </div>
    </div>
  );
};
