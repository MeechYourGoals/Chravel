import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Users, Eye, CheckCircle2, Trash2, Pencil } from 'lucide-react';
import { broadcastService } from '@/services/broadcastService';
import { toast } from 'sonner';

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
  readCount?: number;
  isOwner?: boolean;
  onRespond: (broadcastId: string, response: 'coming' | 'wait' | 'cant') => void;
  onDelete?: (broadcastId: string) => void;
  onEdit?: (broadcastId: string, newMessage: string) => void;
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
  readCount: initialReadCount,
  isOwner = false,
  onRespond,
  onDelete,
  onEdit,
}: BroadcastItemProps) => {
  const [readCount, setReadCount] = useState(initialReadCount || 0);
  const [hasViewed, setHasViewed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editMessage, setEditMessage] = useState(message);
  const [isDeleting, setIsDeleting] = useState(false);

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
    switch (category) {
      case 'urgent':
      case 'emergency':
        return 'bg-red-600/20 border-red-500/40';
      case 'logistics':
        return 'bg-yellow-600/20 border-yellow-500/40';
      case 'chill':
      default:
        return 'bg-blue-600/20 border-blue-500/40';
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      onDelete(id);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSave = () => {
    if (!editMessage.trim() || !onEdit) return;
    onEdit(id, editMessage.trim());
    setIsEditing(false);
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-white">{sender.charAt(0).toUpperCase()}</span>
          </div>
          <span className="font-medium text-white truncate">{sender}</span>
          <span className="text-xs text-white/60 capitalize">{category}</span>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="p-1 text-white/40 hover:text-white transition-colors rounded"
                aria-label="Edit broadcast"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-1 text-white/40 hover:text-red-400 transition-colors rounded disabled:opacity-50"
                aria-label="Delete broadcast"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-1 text-white/60 text-xs">
            <Clock size={12} />
            {formatTime(timestamp)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 text-white/60 text-xs mb-3 mt-1">
        <Users size={12} />
        Sent to: {formatRecipients()}
      </div>

      {/* Message */}
      {isEditing ? (
        <div className="mb-3 space-y-2">
          <textarea
            value={editMessage}
            onChange={e => setEditMessage(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-primary resize-none text-sm"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditMessage(message);
              }}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSave}
              disabled={!editMessage.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-white mb-3 leading-relaxed font-bold break-words">{message}</p>
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
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleResponse('coming')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              userResponse === 'coming'
                ? 'bg-green-600 text-white'
                : 'bg-white/20 text-white hover:bg-green-600/50'
            }`}
          >
            Coming ({responses.coming})
          </button>
          <button
            onClick={() => handleResponse('wait')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              userResponse === 'wait'
                ? 'bg-yellow-600 text-white'
                : 'bg-white/20 text-white hover:bg-yellow-600/50'
            }`}
          >
            Wait ({responses.wait})
          </button>
          <button
            onClick={() => handleResponse('cant')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
              userResponse === 'cant'
                ? 'bg-red-600 text-white'
                : 'bg-white/20 text-white hover:bg-red-600/50'
            }`}
          >
            Can't ({responses.cant})
          </button>
        </div>
      </div>
    </div>
  );
};
