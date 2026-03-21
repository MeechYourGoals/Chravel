import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageReactionBar, REACTION_EMOJI_MAP } from './MessageReactionBar';
import { MessageActions } from './MessageActions';
import { GoogleMapsWidget } from './GoogleMapsWidget';
import { GroundingCitationCard } from './GroundingCitationCard';
import { ImageLightbox } from './ImageLightbox';
import { ReadReceipts, ReadStatus } from './ReadReceipts';
import { GroundingCitation } from '@/types/grounding';
import {
  MapPin,
  Maximize2,
  FileText,
  Download,
  Link,
  ExternalLink,
  AlertCircle,
  RotateCcw,
  Loader2,
  MessageSquareReply,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMobilePortrait } from '@/hooks/useMobilePortrait';
import { useLongPress } from '@/hooks/useLongPress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/utils/avatarUtils';
import { defaultAvatar } from '@/utils/mockAvatars';
import { useResolvedTripMediaUrl } from '@/hooks/useResolvedTripMediaUrl';
import { hapticService } from '@/services/hapticService';
import { getMentionClassName, MENTION_REGEX } from './messageMentions';

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
  reactions?: Record<string, { count: number; userReacted: boolean; users?: string[] }>;
  onReaction: (messageId: string, reactionType: string) => void;
  showSenderInfo?: boolean;
  messageType?: 'channel' | 'trip';
  isDeleted?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  // Thread support
  replyCount?: number;
  onReply?: (messageId: string) => void;
  // 🆕 Grounding support
  grounding?: {
    sources?: GroundingCitation[];
    googleMapsWidget?: string;
    googleMapsWidgetContextToken?: string;
  };
  // 🆕 Rich media support
  mediaType?: 'image' | 'video' | 'document' | null;
  mediaUrl?: string | null;
  linkPreview?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    domain?: string;
  } | null;
  attachments?: Array<{
    type: 'image' | 'video' | 'file' | 'link';
    ref_id: string;
    url?: string;
  }>;
  // 🆕 Gallery support - all images in chat for navigation
  allChatImages?: { url: string; caption?: string }[];
  // 🆕 Message status for retry UI
  status?: 'sending' | 'sent' | 'failed';
  onRetry?: (messageId: string) => void;
  // 🆕 Read Receipt Support
  tripMembers?: Array<{ id: string; name: string; avatar?: string }>;
  readStatuses?: ReadStatus[];
  currentUserId: string;
  // 🆕 Inline Reply Support
  replyTo?: { id: string; text: string; sender: string };
  reactionUserNamesById?: Record<string, string>;
  /** Admins can delete any message (server-side RLS enforced) */
  isAdmin?: boolean;
}

export const MessageBubble = memo(
  ({
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
    replyCount = 0,
    onReply,
    grounding,
    showSenderInfo = true,
    mediaType,
    mediaUrl,
    linkPreview,
    attachments,
    allChatImages = [],
    status,
    onRetry,
    tripMembers,
    readStatuses,
    currentUserId,
    replyTo,
    reactionUserNamesById,
    isAdmin = false,
  }: MessageBubbleProps) => {
    const [showReactions, setShowReactions] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [swipeOffset, setSwipeOffset] = useState(0);
    const [swipeThresholdMet, setSwipeThresholdMet] = useState(false);
    const swipeTouchStartX = useRef(0);
    const swipeTouchStartY = useRef(0);
    const swipeIsActive = useRef(false);
    const swipeHapticFired = useRef(false);
    const isMobilePortrait = useMobilePortrait();

    // Check for media content
    const hasMedia = mediaType && mediaUrl;
    const hasLinkPreview = linkPreview && typeof linkPreview === 'object';
    const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;

    const resolvedMediaUrl = useResolvedTripMediaUrl({ url: mediaUrl ?? null });

    // Handle image click - open lightbox
    const handleImageClick = (imageUrl: string) => {
      // Find the index of this image in the chat images array
      const index = allChatImages.findIndex(img => img.url === imageUrl);
      setLightboxIndex(index >= 0 ? index : 0);
      setLightboxOpen(true);
    };

    // Render media content based on type
    const renderMediaContent = () => {
      if (!hasMedia) return null;

      switch (mediaType) {
        case 'image':
          return (
            <div className="mt-2 relative group">
              <img
                src={resolvedMediaUrl ?? mediaUrl}
                alt="Shared image"
                className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                style={{ maxHeight: '300px' }}
                onClick={() => handleImageClick((resolvedMediaUrl ?? mediaUrl) as string)}
              />
              <button
                onClick={() => handleImageClick((resolvedMediaUrl ?? mediaUrl) as string)}
                className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="View full size"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          );

        case 'video':
          return (
            <div className="mt-2 relative">
              <video
                src={resolvedMediaUrl ?? mediaUrl}
                controls
                playsInline
                className="rounded-lg max-w-full h-auto"
                style={{ maxHeight: '300px' }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          );

        case 'document':
          return (
            <a
              href={mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
            >
              <FileText size={16} className="text-gray-400" />
              <span className="text-sm truncate flex-1">{text || 'Document'}</span>
              <Download size={14} className="text-gray-400" />
            </a>
          );

        default:
          return null;
      }
    };

    // Render file attachments
    const renderFileAttachments = () => {
      if (!hasAttachments) return null;

      return (
        <div className="mt-2 space-y-2">
          {attachments.map((attachment, index) => {
            if (attachment.type === 'image' && attachment.url) {
              return (
                <div key={index} className="relative group">
                  <img
                    src={attachment.url}
                    alt={`Attachment ${index + 1}`}
                    className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                    style={{ maxHeight: '300px' }}
                    onClick={() => handleImageClick(attachment.url!)}
                  />
                  <button
                    onClick={() => handleImageClick(attachment.url!)}
                    className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="View full size"
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              );
            }
            if (attachment.type === 'file' && attachment.url) {
              return (
                <a
                  key={index}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
                >
                  <FileText size={16} className="text-gray-400" />
                  <span className="text-sm truncate flex-1">{text || 'File attachment'}</span>
                  <Download size={14} className="text-gray-400" />
                </a>
              );
            }
            return null;
          })}
        </div>
      );
    };

    // Render link preview
    const renderLinkPreview = () => {
      if (!hasLinkPreview) return null;

      const preview = linkPreview;
      return (
        <a
          href={preview.url || text}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block bg-gray-800 hover:bg-gray-700 rounded-lg overflow-hidden transition-colors"
        >
          {preview.image && (
            <img
              src={preview.image}
              alt={preview.title || 'Link preview'}
              className="w-full h-32 object-cover"
            />
          )}
          <div className="p-3">
            <div className="flex items-start gap-2">
              <Link size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-white truncate">
                  {preview.title || preview.domain || 'Link'}
                </h4>
                {preview.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{preview.description}</p>
                )}
                {preview.domain && <p className="text-xs text-gray-500 mt-1">{preview.domain}</p>}
              </div>
              <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
            </div>
          </div>
        </a>
      );
    };

    // Parse text and render @mentions with distinct styling AND Markdown support
    const renderContent = (content: string) => {
      const parts = content.split(MENTION_REGEX);

      return parts.map((part, index) => {
        if (part.match(MENTION_REGEX)) {
          // It's a mention
          return (
            <span key={index} className={getMentionClassName({ isOwnMessage, isBroadcast })}>
              {part}
            </span>
          );
        } else {
          // It's regular text (potentially markdown)
          return (
            <span
              key={index}
              className="inline prose prose-invert max-w-none prose-p:inline prose-p:m-0 prose-pre:bg-gray-800 prose-pre:p-2 prose-pre:rounded"
            >
              <ReactMarkdown
                components={{
                  p: props => <span {...props} />,
                  a: props => (
                    <a
                      {...props}
                      className="text-blue-400 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  code: props => (
                    <code
                      {...props}
                      className="bg-gray-800 px-1 py-0.5 rounded text-xs font-mono"
                    />
                  ),
                }}
              >
                {part}
              </ReactMarkdown>
            </span>
          );
        }
      });
    };

    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    // Unified layout: Metadata above bubble for both mobile and desktop (consistency)
    const hideReactionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const longPressHandlers = useLongPress({
      onLongPress: () => {
        setShowReactions(true);
        // Auto-hide after 5 seconds on mobile long-press
        if (hideReactionsTimerRef.current) clearTimeout(hideReactionsTimerRef.current);
        hideReactionsTimerRef.current = setTimeout(() => setShowReactions(false), 5000);
      },
      threshold: 500,
    });

    // Swipe-to-reply touch handlers (mobile only, swipe right)
    const SWIPE_THRESHOLD = 60;
    const handleTouchStart = useCallback(
      (e: React.TouchEvent) => {
        if (!isMobilePortrait || !onReply) return;
        swipeTouchStartX.current = e.touches[0].clientX;
        swipeTouchStartY.current = e.touches[0].clientY;
        swipeIsActive.current = false;
        swipeHapticFired.current = false;
      },
      [isMobilePortrait, onReply],
    );

    const handleTouchMove = useCallback(
      (e: React.TouchEvent) => {
        if (!isMobilePortrait || !onReply) return;
        const dx = e.touches[0].clientX - swipeTouchStartX.current;
        const dy = e.touches[0].clientY - swipeTouchStartY.current;
        // Only activate for dominant rightward swipes
        if (!swipeIsActive.current) {
          if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
          if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll wins
          if (dx < 0) return; // leftward swipe — ignore
          swipeIsActive.current = true;
        }
        const clamped = Math.min(dx, SWIPE_THRESHOLD + 20);
        setSwipeOffset(clamped);
        const met = clamped >= SWIPE_THRESHOLD;
        if (met && !swipeHapticFired.current) {
          hapticService.light();
          swipeHapticFired.current = true;
        }
        setSwipeThresholdMet(met);
      },
      [isMobilePortrait, onReply],
    );

    const handleTouchEnd = useCallback(() => {
      if (!swipeIsActive.current) return;
      if (swipeThresholdMet && onReply) {
        onReply(id);
      }
      setSwipeOffset(0);
      setSwipeThresholdMet(false);
      swipeIsActive.current = false;
      swipeHapticFired.current = false;
    }, [swipeThresholdMet, onReply, id]);

    // Merge longPress touch handlers with swipe-to-reply touch handlers
    // so both systems fire (longPress overrides were silently dropped before)
    const mergedTouchStart = useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        longPressHandlers.onTouchStart(e);
        handleTouchStart(e);
      },
      [longPressHandlers, handleTouchStart],
    );
    const mergedTouchMove = useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        longPressHandlers.onTouchMove(e);
        handleTouchMove(e);
      },
      [longPressHandlers, handleTouchMove],
    );
    const mergedTouchEnd = useCallback(
      (_e: React.TouchEvent<HTMLDivElement>) => {
        longPressHandlers.onTouchEnd();
        handleTouchEnd();
      },
      [longPressHandlers, handleTouchEnd],
    );
    const handleHoverStart = useCallback(() => {
      if (hideReactionsTimerRef.current) clearTimeout(hideReactionsTimerRef.current);
      setShowReactions(true);
    }, []);
    const handleHoverEnd = useCallback(() => {
      if (hideReactionsTimerRef.current) clearTimeout(hideReactionsTimerRef.current);
      hideReactionsTimerRef.current = setTimeout(() => setShowReactions(false), 300);
    }, []);
    const mergedMouseLeave = useCallback(() => {
      longPressHandlers.onMouseLeave();
      handleHoverEnd();
    }, [longPressHandlers, handleHoverEnd]);

    useEffect(() => {
      return () => {
        if (hideReactionsTimerRef.current) {
          clearTimeout(hideReactionsTimerRef.current);
        }
      };
    }, []);

    // Dismiss reaction bar on click outside
    useEffect(() => {
      if (!showReactions) return;
      const handleClickOutside = () => setShowReactions(false);
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, [showReactions]);

    return (
      <>
        <div
          className={cn('flex gap-2 group', isOwnMessage ? 'justify-end' : 'justify-start')}
          onMouseDown={longPressHandlers.onMouseDown}
          onMouseMove={longPressHandlers.onMouseMove}
          onMouseUp={longPressHandlers.onMouseUp}
          onMouseEnter={handleHoverStart}
          onMouseLeave={mergedMouseLeave}
          onTouchStart={mergedTouchStart}
          onTouchMove={mergedTouchMove}
          onTouchEnd={mergedTouchEnd}
        >
          {!isOwnMessage && showSenderInfo && (
            <Avatar className="w-8 h-8 md:w-10 md:h-10 border-2 border-border/50 flex-shrink-0">
              <AvatarImage src={senderAvatar || defaultAvatar} alt={senderName} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs md:text-sm font-semibold">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
          )}
          {!isOwnMessage && !showSenderInfo && <div className="w-8 md:w-10 flex-shrink-0" />}

          {/* Swipe-to-reply hint icon */}
          {swipeOffset > 10 && (
            <div
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 mr-1 flex-shrink-0 transition-opacity',
                swipeThresholdMet ? 'opacity-100' : 'opacity-50',
              )}
            >
              <MessageSquareReply className="w-4 h-4 text-primary" />
            </div>
          )}

          <div
            className={cn(
              'relative flex flex-col max-w-[85%]',
              isOwnMessage ? 'items-end text-right' : 'items-start text-left',
            )}
            style={{
              transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
              transition: swipeOffset === 0 ? 'transform 0.2s ease' : undefined,
            }}
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
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
                onReply={onReply}
              />
            </div>
            <div
              className={cn(
                'px-3 py-2 md:px-4 md:py-2.5 rounded-2xl break-words',
                'text-sm md:text-base',
                isOwnMessage && !isBroadcast
                  ? 'bg-chat-own text-chat-own-foreground'
                  : !isBroadcast
                    ? 'bg-muted/80 text-white'
                    : '',
                isBroadcast && 'bg-[#B91C1C] text-white',
                isPayment && 'border-2 border-green-500/50',
                status === 'failed' && 'opacity-70 border-2 border-destructive/50',
                status === 'sending' && 'opacity-80',
                // Adjust styling for media-only messages
                (hasMedia || hasLinkPreview) && !text && 'p-1 bg-transparent',
              )}
            >
              {/* Inline Reply Quote */}
              {replyTo && (
                <div
                  className={cn(
                    'mb-2 p-2 rounded-lg text-xs cursor-pointer',
                    isOwnMessage ? 'bg-black/25 text-white/75' : 'bg-white/10 text-white/80',
                  )}
                  onClick={e => {
                    e.stopPropagation();
                    // Optional: Scroll to original message
                    const el = document.querySelector(`[data-message-id="${replyTo.id}"]`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('search-highlight-flash');
                      setTimeout(() => el.classList.remove('search-highlight-flash'), 1000);
                    }
                  }}
                >
                  <p className="font-semibold mb-0.5">{replyTo.sender}</p>
                  <p className="truncate opacity-90">{replyTo.text}</p>
                </div>
              )}

              {/* Text content - with Markdown and Mentions */}
              {text && <div className="whitespace-pre-wrap">{renderContent(text)}</div>}

              {/* Rich media content */}
              {renderMediaContent()}

              {/* File attachments */}
              {renderFileAttachments()}

              {/* Link preview */}
              {renderLinkPreview()}

              {/* Message status indicator */}
              {status === 'sending' && (
                <div className="flex items-center gap-1 mt-1 text-xs opacity-70">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Sending...</span>
                </div>
              )}

              {status === 'failed' && (
                <button
                  onClick={() => onRetry?.(id)}
                  className="flex items-center gap-1.5 mt-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>Failed to send</span>
                  <RotateCcw className="h-3 w-3 ml-1" />
                  <span className="underline">Retry</span>
                </button>
              )}
            </div>

            {/* Google Maps Widget — prefer context token from maps grounding */}
            {(grounding?.googleMapsWidgetContextToken || grounding?.googleMapsWidget) && (
              <div className="mt-2">
                <GoogleMapsWidget
                  widgetToken={
                    grounding.googleMapsWidgetContextToken || grounding.googleMapsWidget!
                  }
                  height={isMobilePortrait ? 200 : 250}
                />
              </div>
            )}

            {/* Grounding Sources */}
            {grounding?.sources && grounding.sources.length > 0 && (
              <div className={cn('space-y-2', 'mt-2', 'w-full')}>
                <div
                  className={cn(
                    'font-medium text-white/80 flex items-center gap-2',
                    isMobilePortrait ? 'text-[10px]' : 'text-xs',
                  )}
                >
                  <span>Sources:</span>
                  {grounding.sources.filter(s => s.source === 'google_maps_grounding').length >
                    0 && (
                    <span
                      className={cn(
                        'bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded flex items-center gap-1',
                        isMobilePortrait ? 'text-[9px]' : 'text-[10px]',
                      )}
                    >
                      <MapPin size={isMobilePortrait ? 10 : 12} />
                      {
                        grounding.sources.filter(s => s.source === 'google_maps_grounding').length
                      }{' '}
                      verified by Google
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

            {/* Persistent reaction badges — always visible when count > 0 */}
            {reactions && Object.keys(reactions).some(k => reactions[k].count > 0) && (
              <div
                className={cn(
                  'flex flex-wrap gap-1 mt-1',
                  isOwnMessage ? 'justify-end' : 'justify-start',
                )}
              >
                {Object.entries(reactions)
                  .filter(([, data]) => data.count > 0)
                  .map(([reactionType, data]) => (
                    <button
                      key={reactionType}
                      onClick={() => onReaction(id, reactionType)}
                      className={cn(
                        'flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors',
                        data.userReacted
                          ? 'bg-primary/20 border border-primary/40 text-primary'
                          : 'bg-muted/60 border border-white/10 text-white/70 hover:bg-muted/80',
                      )}
                    >
                      <span>{REACTION_EMOJI_MAP[reactionType] || reactionType}</span>
                      <span>{data.count}</span>
                    </button>
                  ))}
              </div>
            )}

            {/* Reaction picker — side attached to message to avoid hover handoff to adjacent rows */}
            {showReactions && (
              <div
                className={cn(
                  'absolute top-0 z-20',
                  isOwnMessage ? 'right-full mr-2' : 'left-full ml-2',
                )}
                onMouseEnter={() => {
                  if (hideReactionsTimerRef.current) clearTimeout(hideReactionsTimerRef.current);
                }}
                onMouseLeave={() => {
                  if (hideReactionsTimerRef.current) clearTimeout(hideReactionsTimerRef.current);
                  hideReactionsTimerRef.current = setTimeout(() => setShowReactions(false), 2000);
                }}
                onMouseDown={e => e.stopPropagation()}
                onTouchStart={e => e.stopPropagation()}
              >
                <MessageReactionBar
                  messageId={id}
                  reactions={reactions}
                  onReaction={onReaction}
                  userNamesById={reactionUserNamesById}
                />
              </div>
            )}

            {/* Thread reply indicator */}
            {replyCount > 0 && (
              <button
                onClick={() => onReply?.(id)}
                className="flex items-center gap-1 mt-1.5 text-xs text-primary/80 hover:text-primary transition-colors"
              >
                <MessageSquareReply className="h-3 w-3" />
                <span>
                  {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </button>
            )}

            {/* Read Receipts */}
            {isOwnMessage && readStatuses && readStatuses.length > 0 && (
              <ReadReceipts
                readStatuses={readStatuses}
                totalRecipients={tripMembers?.length ? tripMembers.length - 1 : 0}
                currentUserId={currentUserId}
                tripMembers={tripMembers}
              />
            )}
          </div>
        </div>

        {/* Image Lightbox */}
        <ImageLightbox
          isOpen={lightboxOpen}
          images={allChatImages.length > 0 ? allChatImages : mediaUrl ? [{ url: mediaUrl }] : []}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      </>
    );
  },
);
