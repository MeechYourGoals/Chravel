import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Users, Eye, CheckCircle2, Link } from 'lucide-react';
import { broadcastService } from '@/services/broadcastService';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

interface BroadcastItemProps {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  location?: string;
  category: 'chill' | 'logistics' | 'urgent' | 'emergency';
  recipients: string;
  responses: {
    coming: number;
    wait: number;
    cant: number;
  };
  userResponse?: 'coming' | 'wait' | 'cant';
  attachmentUrls?: string[];
  linkPreview?: LinkPreview;
  readCount?: number;
  onRespond: (broadcastId: string, response: 'coming' | 'wait' | 'cant') => void;
}

export const BroadcastItem = ({
  id,
  sender,
  message,
  timestamp,
  location,
  category,
  recipients,
  responses,
  userResponse,
  attachmentUrls = [],
  linkPreview,
  readCount: initialReadCount,
  onRespond,
}: BroadcastItemProps) => {
  const [readCount, setReadCount] = useState(initialReadCount || 0);
  const [hasViewed, setHasViewed] = useState(false);

  // Mark as viewed when component mounts (read receipt)
  useEffect(() => {
    const markViewed = async () => {
      if (!hasViewed) {
        const success = await broadcastService.markBroadcastViewed(id);
        if (success) {
          setHasViewed(true);
          // Refresh read count
          const count = await broadcastService.getBroadcastReadCount(id);
          setReadCount(count);
        }
      }
    };

    markViewed();
  }, [id, hasViewed]);

  // Fetch read count on mount if not provided
  useEffect(() => {
    if (initialReadCount === undefined) {
      broadcastService.getBroadcastReadCount(id).then(setReadCount);
    }
  }, [id, initialReadCount]);
  const getCategoryColors = () => {
    return 'bg-orange-500 border-orange-600/30';
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffMinutes < 1440) {
      return `${Math.floor(diffMinutes / 60)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleResponse = (response: 'coming' | 'wait' | 'cant') => {
    onRespond(id, response);
  };

  const formatRecipients = () => {
    if (recipients === 'everyone') return 'Everyone';
    if (recipients.startsWith('role:')) return recipients.slice(5);
    if (recipients.startsWith('user:')) return 'Direct';
    return recipients;
  };

  return (
    <div className={`border rounded-lg p-4 ${getCategoryColors()}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-white">{sender.charAt(0).toUpperCase()}</span>
          </div>
          <span className="font-medium text-white">{sender}</span>
          <span className="text-xs text-white/60 capitalize">{category}</span>
        </div>
        <div className="flex items-center gap-1 text-white/60 text-xs">
          <Clock size={12} />
          {formatTime(timestamp)}
        </div>
      </div>
      <div className="flex items-center gap-1 text-white/60 text-xs mb-3 mt-1">
        <Users size={12} />
        Sent to: {formatRecipients()}
      </div>

      {/* Message */}
      <p className="text-white mb-3 leading-relaxed font-bold">{message}</p>

      {/* Link preview */}
      {linkPreview && (
        <a
          href={linkPreview.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 block bg-slate-900/70 border border-slate-600/60 hover:bg-slate-800/80 rounded-lg overflow-hidden transition-colors"
        >
          {linkPreview.image && (
            <img
              src={linkPreview.image}
              alt={linkPreview.title || 'Link preview'}
              className="w-full h-40 object-cover"
            />
          )}
          <div className="p-3">
            <div className="flex items-start gap-2">
              <Link size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-white truncate">
                  {linkPreview.title || linkPreview.domain || 'Link'}
                </h4>
                {linkPreview.description && (
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                    {linkPreview.description}
                  </p>
                )}
                {linkPreview.domain && (
                  <p className="text-xs text-slate-400 mt-1 truncate">{linkPreview.domain}</p>
                )}
              </div>
            </div>
          </div>
        </a>
      )}

      {/* Attachments */}
      {attachmentUrls && attachmentUrls.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {attachmentUrls.map((url, index) => (
            <div key={index} className="relative">
              {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img
                  src={url}
                  alt={`Attachment ${index + 1}`}
                  className="w-full h-32 object-cover rounded border border-slate-600 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(url, '_blank')}
                />
              ) : url.match(/\.(mp4|mov|quicktime)$/i) ? (
                <video
                  src={url}
                  className="w-full h-32 object-cover rounded border border-slate-600"
                  controls
                />
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full h-32 bg-slate-700 rounded border border-slate-600 flex items-center justify-center hover:bg-slate-600 transition-colors"
                >
                  <span className="text-xs text-slate-300">View File</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Location */}
      {location && (
        <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
          <MapPin size={14} />
          {location}
        </div>
      )}

      {/* Read receipts */}
      {readCount > 0 && (
        <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
          <Eye size={12} />
          <span>
            {readCount} {readCount === 1 ? 'view' : 'views'}
          </span>
          {hasViewed && (
            <CheckCircle2 size={12} className="text-green-500" aria-label="You've viewed this" />
          )}
        </div>
      )}

      {/* Response Options */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => handleResponse('coming')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              userResponse === 'coming'
                ? 'bg-green-600 text-white'
                : 'bg-white/20 text-white hover:bg-green-600/50'
            }`}
          >
            ✅ Coming ({responses.coming})
          </button>
          <button
            onClick={() => handleResponse('wait')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              userResponse === 'wait'
                ? 'bg-yellow-600 text-white'
                : 'bg-white/20 text-white hover:bg-yellow-600/50'
            }`}
          >
            ✋ Wait ({responses.wait})
          </button>
          <button
            onClick={() => handleResponse('cant')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              userResponse === 'cant'
                ? 'bg-red-600 text-white'
                : 'bg-white/20 text-white hover:bg-red-600/50'
            }`}
          >
            ❌ Can't ({responses.cant})
          </button>
        </div>
      </div>
    </div>
  );
};
