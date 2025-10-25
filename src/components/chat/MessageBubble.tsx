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
  grounding
}: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const isMobilePortrait = useMobilePortrait();

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTextColorClass = () => {
    if (isBroadcast) return 'text-orange-400';
    if (isPayment) return 'text-green-400';
    return 'text-foreground';
  };

  const getBubbleClasses = () => {
    if (isBroadcast) {
      return 'bg-orange-600/10 border-orange-500/30 shadow-[0_2px_12px_rgba(251,146,60,0.15)]';
    }
    if (isPayment) {
      return 'bg-green-600/10 border-green-500/30 shadow-[0_2px_12px_rgba(34,197,94,0.15)]';
    }
    return 'bg-card/50 border-border shadow-sm';
  };

  // Unified layout: Metadata above bubble for both mobile and desktop (consistency)
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      setShowReactions(true);
      // Auto-hide after 5 seconds
      setTimeout(() => setShowReactions(false), 5000);
    },
    threshold: 500
  });

  return (
    <div
      className={cn(
        "group flex gap-2",
        isOwnMessage ? "flex-row-reverse justify-end" : "flex-row items-start",
        "mb-0"
      )}
      {...longPressHandlers}
    >
      {!isOwnMessage && (
        <img
          src={senderAvatar || getMockAvatar(senderName)}
          alt={senderName}
          className={cn(
            "rounded-full object-cover border-2 border-border/50 flex-shrink-0",
            isMobilePortrait ? "w-10 h-10" : "w-10 h-10"
          )}
        />
      )}
      
      <div className={cn(
        "flex flex-col max-w-full",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        {/* Metadata above bubble - all versions */}
        {!isOwnMessage && (
          <div className={cn(
            "flex items-center gap-1 mb-0.5",
            isMobilePortrait ? "text-xs" : "text-sm"
          )}>
            <span className={cn(
              "font-semibold text-foreground",
              isMobilePortrait ? "text-xs" : "text-sm"
            )}>
              {senderName}
            </span>
            <span className={cn(
              "text-muted-foreground opacity-70",
              isMobilePortrait ? "text-[11px]" : "text-xs"
            )}>
              {formatTime(timestamp)}
            </span>
            {isBroadcast && (
              <span className={cn(
                "bg-orange-600/20 text-orange-400 px-1.5 py-0.5 rounded-full",
                isMobilePortrait ? "text-[10px]" : "text-xs"
              )}>
                📢 Broadcast
              </span>
            )}
            {isPayment && (
              <span className={cn(
                "bg-green-600/20 text-green-400 px-1.5 py-0.5 rounded-full",
                isMobilePortrait ? "text-[10px]" : "text-xs"
              )}>
                💳 Payment
              </span>
            )}
          </div>
        )}
        
        {/* Message bubble - content only */}
        <div 
          className={cn(
            'inline-flex rounded-2xl backdrop-blur-sm border transition-all px-3 py-2',
            'max-w-[85%] sm:max-w-[75%] md:max-w-[70%]',
            isOwnMessage 
              ? 'bg-gradient-to-br from-[#007AFF] to-[#005FCC] text-white border-[#007AFF]/20 shadow-[0_1px_3px_rgba(0,0,0,0.25)] rounded-br-md'
              : getBubbleClasses()
          )}
        >
          <p className={cn(
            'text-sm leading-snug break-words whitespace-pre-wrap',
            isOwnMessage ? 'text-white' : getTextColorClass()
          )}>
            {text}
          </p>
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
              "font-medium text-muted-foreground flex items-center gap-2",
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
