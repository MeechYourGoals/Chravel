import React from 'react';
import { FileText, Link, Download, Play, Maximize2 } from 'lucide-react';
import { ChatMessage } from './types';
import { cn } from '@/lib/utils';

interface MessageRendererProps {
  message: ChatMessage & {
    media_type?: string | null;
    media_url?: string | null;
    link_preview?: any;
    attachments?: any;
  };
  showMapWidgets?: boolean;
}

export const MessageRenderer: React.FC<MessageRendererProps> = ({ message, showMapWidgets = false }) => {
  const hasMedia = message.media_type && message.media_url;
  const hasLinkPreview = message.link_preview;
  const hasAttachments = message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0;

  // Render media content based on type
  const renderMediaContent = () => {
    if (!hasMedia) return null;

    switch (message.media_type) {
      case 'image':
        return (
          <div className="mt-2 relative group">
            <img
              src={message.media_url}
              alt="Shared image"
              className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
              style={{ maxHeight: '400px' }}
              onClick={() => window.open(message.media_url!, '_blank')}
            />
            <button
              onClick={() => window.open(message.media_url!, '_blank')}
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
              src={message.media_url}
              controls
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
                <span className="text-sm truncate flex-1">{message.content || 'File attachment'}</span>
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
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {preview.description}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">{preview.domain}</p>
            </div>
          </div>
        </div>
      </a>
    );
  };

  return (
    <div className={cn(
      "flex",
      message.type === 'user' ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        "max-w-xs lg:max-w-md",
        message.type === 'user' ? '' : 'w-full max-w-lg'
      )}>
        <div className={cn(
          "px-4 py-3 rounded-2xl",
          message.type === 'user'
            ? 'bg-gray-800 text-white'
            : 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-gray-300 border border-blue-500/20'
        )}>
          {/* Message content - only show if not a pure media message */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
          
          {/* Render media content inline */}
          {renderMediaContent()}
          
          {/* Render file attachments */}
          {renderFileAttachments()}
          
          {/* Render link preview */}
          {renderLinkPreview()}
        </div>

        {/* Message metadata */}
        <div className="flex items-center gap-2 mt-1 px-2">
          <span className="text-xs text-gray-500">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      </div>
    </div>
  );
};