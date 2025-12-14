import React, { useState } from 'react';
import { Search, MessageCircle, Clock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/utils/avatarUtils';

export const MessageInbox = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mock data - replace with real unified messaging later
  const messages: any[] = [];
  const getTotalUnreadCount = () => 0;

  const filteredMessages = messages.filter(msg => {
    if (filter === 'unread') return !msg.isRead;
    if (filter === 'mentions') return msg.mentions && msg.mentions.length > 0;
    return true;
  });

  const handleMessageClick = (message: any) => {
    if (message.tripId) {
      navigate(`/trip/${message.tripId}`);
    } else if (message.tourId) {
      navigate(`/tour/pro/${message.tourId}`);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getTripDisplayName = (message: any) => {
    if (message.tripName) return message.tripName;
    if (message.tourName) return message.tourName;
    if (message.tripId) return 'Trip';
    if (message.tourId) return 'Tour';
    return null;
  };

  const getTripBadgeColor = (message: any) => {
    if (message.tripId && message.tourId) {
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    } else if (message.tripId) {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    } else if (message.tourId) {
      return 'bg-glass-orange/20 text-glass-orange border-glass-orange/30';
    }
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle size={24} className="text-glass-orange" />
          <div>
            <h2 className="text-xl font-semibold text-white">Message Inbox</h2>
            <p className="text-slate-400 text-sm">{getTotalUnreadCount()} unread messages</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search messages, people, or trips..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-glass-orange"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['all', 'unread', 'mentions'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === filterType
                ? 'bg-glass-orange text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredMessages.map((message) => {
          const tripDisplayName = getTripDisplayName(message);
          const badgeColor = getTripBadgeColor(message);
          
          return (
            <div
              key={message.id}
              onClick={() => handleMessageClick(message)}
              className={`p-4 rounded-xl cursor-pointer transition-all hover:bg-white/10 ${
                !message.isRead ? 'bg-white/5 border-l-4 border-glass-orange' : 'bg-white/2'
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={message.senderAvatar} alt={message.senderName} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-sm font-semibold">
                    {getInitials(message.senderName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{message.senderName}</span>
                      {tripDisplayName && (
                        <span className={`text-xs px-2 py-1 rounded-full border backdrop-blur-sm truncate max-w-32 ${badgeColor}`}>
                          {tripDisplayName}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <Clock size={12} />
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm truncate">{message.content}</p>
                  {message.mentions && message.mentions.includes('everyone') && (
                    <div className="mt-2">
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded flex items-center gap-1 w-fit">
                        <User size={10} />
                        @everyone
                      </span>
                    </div>
                  )}
                </div>
                {!message.isRead && (
                  <div className="w-2 h-2 bg-glass-orange rounded-full"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMessages.length === 0 && (
        <div className="text-center py-8">
          <MessageCircle size={48} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">No messages found</h3>
          <p className="text-slate-500 text-sm">
            {searchQuery ? 'Try a different search term' : 'Your messages will appear here'}
          </p>
        </div>
      )}
    </div>
  );
};
