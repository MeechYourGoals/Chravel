import React, { useState, memo } from 'react';
import { getMockAvatar } from '@/utils/mockAvatars';
import { MessageReactionBar } from './MessageReactionBar';
import { MessageActions } from './MessageActions';
import { GoogleMapsWidget } from './GoogleMapsWidget';
import { GroundingCitationCard } from './GroundingCitationCard';
import { ImageLightbox } from './ImageLightbox';
import { GroundingCitation } from '@/types/grounding';
import { MapPin, Maximize2, FileText, Download, Link, ExternalLink } from 'lucide-react';
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
  mediaType,
  mediaUrl,
  linkPreview,
  attachments,
  allChatImages = [],
}: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const isMobilePortrait = useMobilePortrait();

  // Check for media content
  const hasMedia = mediaType && mediaUrl;
  const hasLinkPreview = linkPreview && typeof linkPreview === 'object';
  const hasAttachments = attachments && Array.isArray(attachments) && attachments.length > 0;

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
              src={mediaUrl}
              alt="Shared image"
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
              style={{ maxHeight: '300px' }}
              onClick={() => handleImageClick(mediaUrl!)}
            />
            <button
              onClick={() => handleImageClick(mediaUrl!)}
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
              src={mediaUrl}
              controls
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
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {preview.description}
                </p>
              )}
              {preview.domain && (
                <p className="text-xs text-gray-500 mt-1">{preview.domain}</p>
              )}
            </div>
            <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
          </div>
        </div>
      </a>
    );
  };

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
    <>
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
              // Adjust styling for media-only messages
              (hasMedia || hasLinkPreview) && !text && 'p-1 bg-transparent',
            )}
          >
            {/* Text content - only show if not a pure media message */}
            {text && (
              <p className="whitespace-pre-wrap">{text}</p>
            )}
            
            {/* Rich media content */}
            {renderMediaContent()}
            
            {/* File attachments */}
            {renderFileAttachments()}
            
            {/* Link preview */}
            {renderLinkPreview()}
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

      {/* Image Lightbox */}
      <ImageLightbox
        isOpen={lightboxOpen}
        images={allChatImages.length > 0 ? allChatImages : mediaUrl ? [{ url: mediaUrl }] : []}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
});