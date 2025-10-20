
import React, { useState, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { currentUserAvatar } from '@/utils/mockAvatars';
import { MessageReactionBar } from './chat/MessageReactionBar';
import { VirtualizedMessageContainer } from './chat/VirtualizedMessageContainer';
import { useUnifiedMessages } from '@/hooks/useUnifiedMessages';

interface DemoChatProps {
  tripId: string;
}

interface DemoMessage {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  created_at: string;
  reactions?: Record<string, { count: number; userReacted: boolean }>;
}

export const DemoChat = ({ tripId }: DemoChatProps) => {
  const { 
    messages, 
    sendMessage,
    loadMore,
    hasMore,
    isLoadingMore 
  } = useUnifiedMessages({ tripId, enabled: true });
  const [inputValue, setInputValue] = useState('');
  const [reactions, setReactions] = useState<Record<string, Record<string, { count: number; userReacted: boolean }>>>({});

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    await sendMessage(inputValue);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleReaction = (messageId: string, reactionType: string) => {
    setReactions(prev => {
      const messageReactions = prev[messageId] || {};
      const currentReaction = messageReactions[reactionType] || { count: 0, userReacted: false };
      
      const newReactions = {
        ...prev,
        [messageId]: {
          ...messageReactions,
          [reactionType]: {
            count: currentReaction.userReacted ? currentReaction.count - 1 : currentReaction.count + 1,
            userReacted: !currentReaction.userReacted
          }
        }
      };
      
      return newReactions;
    });
  };

  const filteredMessages = messages;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircle size={24} className="text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Trip Chat</h3>
            <p className="text-gray-400 text-sm">
              Demo mode - Mock conversation
              <span className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-md">DEMO</span>
            </p>
          </div>
        </div>
      </div>

      {/* Message Filters */}
      {/* Message list */}

      {/* Chat Interface */}
      <div className="bg-gray-900/50 rounded-xl overflow-hidden flex flex-col" style={{ height: '500px' }}>
        {/* Messages Container */}
        {filteredMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <MessageCircle size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No messages yet</p>
            </div>
          </div>
        ) : (
          <VirtualizedMessageContainer
            messages={messages}
            renderMessage={(message) => (
              <div key={message.id} className="flex items-start gap-3">
                {/* Avatar */}
                <img
                  src={currentUserAvatar}
                  alt={message.author_name}
                  className="w-10 h-10 rounded-full flex-shrink-0 object-cover border border-gray-600"
                />
                
                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  {/* Sender Name & Time */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-300">
                      {message.author_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                  
                  {/* Message Bubble */}
                  <div className="max-w-md p-3 rounded-lg bg-gray-800 text-gray-200">
                    {/* Message Text */}
                    <div className="text-sm leading-relaxed">
                      {message.content}
                    </div>
                  </div>
                  
                  {/* Message Actions */}
                  <MessageReactionBar
                    messageId={message.id}
                    reactions={reactions[message.id]}
                    onReaction={handleReaction}
                  />
                </div>
              </div>
            )}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoadingMore}
            initialVisibleCount={10}
          />
        )}

        {/* Message Input */}
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (demo mode)"
              className="flex-1 bg-gray-800 text-white placeholder-gray-400 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Demo mode: Messages are for demonstration only and won't be saved
          </p>
        </div>
      </div>
    </div>
  );
};
