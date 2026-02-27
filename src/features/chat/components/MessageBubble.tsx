import React, { useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageReactionBar } from './MessageReactionBar';
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
  // Thread support
  replyCount?: number;
  onReply?: (messageId: string) => void;
  // 🆕 Grounding support
  grounding?: {
    sources?: GroundingCitation[];
    googleMapsWidget?: string;
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
  // 🆕 Pinning Support
  isPinned?: boolean;
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
    isPinned,
  }: MessageBubbleProps) => {
    const [showReactions, setShowReactions] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
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
      const mentionRegex = /(@\w+(?:\s\w+)?)/g;
      const parts = content.split(mentionRegex);

      return parts.map((part, index) => {
        if (part.match(mentionRegex)) {
          // It's a mention
          return (
            <span
              key={index}
              className="text-blue-400 font-medium bg-blue-500/10 px-1 rounded inline-block"
            >
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
    const _longPressHandlers = useLongPress({
      onLongPress: () => {
        setShowReactions(true);
        // Auto-hide after 5 seconds
        setTimeout(() => setShowReactions(false), 5000);
      },
      threshold: 500,
    });

    return (
      <>
        <div className={cn('flex gap-2 group', isOwnMessage ? 'justify-end' : 'justify-start')}>
          {!isOwnMessage && showSenderInfo && (
            <Avatar className="w-8 h-8 md:w-10 md:h-10 border-2 border-border/50 flex-shrink-0">
              <AvatarImage src={senderAvatar || defaultAvatar} alt={senderName} />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs md:text-sm font-semibold">
                {getInitials(senderName)}
              </AvatarFallback>
            </Avatar>
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
                isPinned={isPinned}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
            <div
              className={cn(
                'px-3 py-2 md:px-4 md:py-2.5 rounded-2xl break-words',
                'text-sm md:text-base',
                isOwnMessage ? 'bg-chat-own text-chat-own-foreground' : 'bg-muted/80 text-white',
                isBroadcast && 'border-2 border-red-500/50 bg-gray-800',
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
                    'mb-2 p-2 rounded-lg border-l-4 text-xs cursor-pointer',
                    isOwnMessage
                      ? 'bg-black/20 border-white/50 text-white/80'
                      : 'bg-white/10 border-primary text-white/80',
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

            {showReactions && (
              <div className={cn(isMobilePortrait ? 'mt-1' : 'mt-1')}>
                <MessageReactionBar messageId={id} reactions={reactions} onReaction={onReaction} />
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
