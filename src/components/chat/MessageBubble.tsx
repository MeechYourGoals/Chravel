import React, { useState, memo } from 'react';
import { getMockAvatar } from '@/utils/mockAvatars';
import { MessageReactionBar } from './MessageReactionBar';
import { MessageActions } from './MessageActions';
import { GoogleMapsWidget } from './GoogleMapsWidget';
import { GroundingCitationCard } from './GroundingCitationCard';
import { ChatMessageWithGrounding, GroundingCitation } from '@/types/grounding';
import { MapPin } from 'lucide-react';
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
  isEdited?: boolean;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
  onReaction: (messageId: string, reactionType: string) => void;
  showSenderInfo?: boolean;
  messageType?: 'channel' | 'trip';
  isDeleted?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  // 🆕 Grounding support
  grounding?: {
    sources?: GroundingCitation[];
    googleMapsWidget?: string;
  };
}

export const MessageBubble = memo(({
  id,
  text,
  senderName,
  senderAvatar,
  timestamp,
  isBroadcast,
  isPayment,
  isOwnMessage = false,
  isEdited = false,
  reactions,
  onReaction,
  messageType = 'trip',
  isDeleted = false,
  onEdit,
  onDelete,
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
    <div className={cn('flex gap-2 group', isOwnMessage ? 'justify-end' : 'justify-start')}>
      {!isOwnMessage && showSenderInfo && (
        <img
          src={senderAvatar || getMockAvatar(senderName)}
          alt={senderName}
          className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-border/50 flex-shrink-0"
        />
      )}
      {!isOwnMessage && !showSenderInfo && <div className="w-8 md:w-10 flex-shrink-0" />}

      <div
        className={cn(
          'flex flex-col max-w-[85%]',
          isOwnMessage ? 'items-end text-right' : 'items-start text-left',
        )}
      >
        <div className="flex items-center gap-2">
          {showSenderInfo && (
            <span className="text-[10px] md:text-xs text-white/70 mb-0.5">
              {isOwnMessage ? 'You' : senderName} — {formatTime(timestamp)}
              {isEdited && <span className="ml-1 text-white/50">(edited)</span>}
            </span>
          )}
          <MessageActions
            messageId={id}
            messageContent={text}
            messageType={messageType}
            isOwnMessage={isOwnMessage}
            isDeleted={isDeleted}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>
        <div
          className={cn(
            'px-3 py-2 md:px-4 md:py-2.5 rounded-2xl break-words',
            'text-sm md:text-base',
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/80 text-white',
            isBroadcast && 'border-2 border-red-500/50 bg-gray-800',
            isPayment && 'border-2 border-green-500/50',
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
          <div className={cn("space-y-2", "mt-2", "w-full")}>
            <div className={cn(
              "font-medium text-white/80 flex items-center gap-2",
              isMobilePortrait ? "text-[10px]" : "text-xs"
            )}>
              <span>Sources:</span>
              {grounding.sources.filter(s => s.source === 'google_maps_grounding').length > 0 && (
                <span className={cn(
                  "bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1",
                  isMobilePortrait ? "text-[9px]" : "text-[10px]"
                )}>
                  <MapPin size={isMobilePortrait ? 10 : 12} />
                  {grounding.sources.filter(s => s.source === 'google_maps_grounding').length} verified by Google
                </span>
              )}
            </div>
            <div className="space-y-2">
              {grounding.sources.map((source, idx) => (
                <GroundingCitationCard key={source.id || idx} citation={source} index={idx} />
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
});
