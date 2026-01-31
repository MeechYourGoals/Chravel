import React from 'react';
import { FileText, Link, Download, Maximize2 } from 'lucide-react';
import { ChatMessage } from './types';
import { cn } from '@/lib/utils';
import { openExternalUrl } from '@/platform/navigation';
import { useResolvedTripMediaUrl } from '@/hooks/useResolvedTripMediaUrl';

interface MessageRendererProps {
  message: ChatMessage & {
    media_type?: string | null;
    media_url?: string | null;
    link_preview?: any;
    attachments?: any;
  };
  showMapWidgets?: boolean;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({
  message,
  showMapWidgets: _showMapWidgets = false,
}) => {
  const hasMedia = message.media_type && message.media_url;
  const hasLinkPreview = message.link_preview;
  const hasAttachments =
    message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0;
  const resolvedMediaUrl = useResolvedTripMediaUrl({ url: message.media_url ?? null });

  // Render media content based on type
  const renderMediaContent = () => {
    if (!hasMedia) return null;

    switch (message.media_type) {
      case 'image':
        return (
          <div className="mt-2 relative group">
            <img
              src={resolvedMediaUrl ?? message.media_url}
              alt="Shared image"
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
              style={{ maxHeight: '400px' }}
              onClick={() =>
                void openExternalUrl((resolvedMediaUrl ?? message.media_url) as string)
              }
            />
            <button
              onClick={() =>
                void openExternalUrl((resolvedMediaUrl ?? message.media_url) as string)
              }
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
              src={resolvedMediaUrl ?? message.media_url}
              controls
              playsInline
              className="rounded-lg max-w-full h-auto"
              style={{ maxHeight: '400px' }}
            >
              Your browser does not support the video tag.
            </video>
          </div>
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
        {message.attachments.map((attachment: any, index: number) => {
          if (attachment.type === 'file') {
            return (
              <a
                key={index}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
              >
                <FileText size={16} className="text-gray-400" />
                <span className="text-sm truncate flex-1">
                  {message.content || 'File attachment'}
                </span>
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
    if (!hasLinkPreview || typeof message.link_preview !== 'object') return null;

    const preview = message.link_preview;
    return (
      <a
        href={preview.url || message.content}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block bg-gray-800 hover:bg-gray-700 rounded-lg overflow-hidden transition-colors"
      >
        {preview.image && (
          <img
            src={preview.image}
            alt={preview.title || 'Link preview'}
            className="w-full h-48 object-cover"
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
              <p className="text-xs text-gray-500 mt-1">{preview.domain}</p>
            </div>
          </div>
        </div>
      </a>
    );
  };

  const isOwnMessage = message.type === 'user';

  return (
    <div className={cn('flex w-full gap-2', isOwnMessage ? 'justify-end' : 'justify-start')}>
      {/* AI Avatar for assistant messages */}
      {!isOwnMessage && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-white">AI</span>
        </div>
      )}

      <div
        className={cn('flex flex-col', isOwnMessage ? 'items-end' : 'items-start', 'max-w-[78%]')}
      >
        <div
          className={cn(
            'px-3.5 py-2.5 rounded-2xl backdrop-blur-sm border transition-all',
            isOwnMessage
              ? 'bg-blue-600 text-white border-blue-600/20 shadow-[0_1px_3px_rgba(0,0,0,0.25)] rounded-br-sm'
              : 'bg-muted/80 text-white border-border shadow-sm rounded-bl-sm',
          )}
        >
          {/* Message content - only show if not a pure media message */}
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          )}

          {/* Render media content inline */}
          {renderMediaContent()}

          {/* Render file attachments */}
          {renderFileAttachments()}

          {/* Render link preview */}
          {renderLinkPreview()}
        </div>

        {/* Message metadata */}
        {message.timestamp && (
          <span
            className={cn(
              'text-[10px] text-muted-foreground/70 mt-1 px-1',
              isOwnMessage ? 'text-right' : 'text-left',
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  );
};
