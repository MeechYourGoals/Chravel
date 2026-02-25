import React from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import {
  useBroadcastReactions,
  ReactionType,
  ReactionCounts,
} from '../hooks/useBroadcastReactions';
import { BroadcastResponseButtons } from './BroadcastResponseButtons';

interface BroadcastProps {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
  location?: string;
  category: 'chill' | 'logistics' | 'urgent' | 'emergency';
  recipients: string;
  responses: ReactionCounts;
  userResponse?: ReactionType;
  onRespond: (broadcastId: string, response: ReactionType) => void;
}

export const Broadcast = ({
  id,
  sender,
  message,
  timestamp,
  location,
  category,
  recipients,
  responses: initialResponses,
  userResponse: initialUserResponse,
  onRespond,
}: BroadcastProps) => {
  const { userResponse, responses, handleResponse } = useBroadcastReactions({
    broadcastId: id,
    initialResponses,
    userResponse: initialUserResponse,
    onRespond,
  });

  const getCategoryColors = () => {
    switch (category) {
      case 'chill':
        return 'bg-blue-600/20 border-blue-500/30';
      case 'logistics':
        return 'bg-yellow-600/20 border-yellow-500/30';
      case 'urgent':
        return 'bg-red-600/20 border-red-500/30';
      case 'emergency':
        return 'bg-red-700/30 border-red-600/50';
      default:
        return 'bg-slate-600/20 border-slate-500/30';
    }
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
          <span className="text-xs text-slate-400 capitalize">{category}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-xs">
          <Clock size={12} />
          {formatTime(timestamp)}
        </div>
      </div>
      <div className="flex items-center gap-1 text-slate-400 text-xs mb-3 mt-1">
        <Users size={12} />
        Sent to: {formatRecipients()}
      </div>

      {/* Message - Orange text for broadcasts */}
      <p className="text-broadcast-content mb-3 leading-relaxed font-semibold">{message}</p>

      {/* Location */}
      {location && (
        <div className="flex items-center gap-2 text-slate-300 text-sm mb-3">
          <MapPin size={14} />
          {location}
        </div>
      )}

      {/* Response Options */}
      <BroadcastResponseButtons
        responses={responses}
        userResponse={userResponse}
        onRespond={handleResponse}
      />
    </div>
  );
};
