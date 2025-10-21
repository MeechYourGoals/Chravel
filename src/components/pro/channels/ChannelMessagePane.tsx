import React, { useState, useRef, useEffect } from 'react';
import { Settings, Users, Send } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { ChannelWithStats } from '../../../types/channels';
import { useChannelMessages } from '../../../hooks/useChannels';
import { VirtualizedMessageContainer } from '../../chat/VirtualizedMessageContainer';
import { format } from 'date-fns';

interface ChannelMessagePaneProps {
  channel: ChannelWithStats;
  onChannelUpdate: (channel: ChannelWithStats) => void;
  onChannelDelete: (channelId: string) => void;
  onShowMembers: () => void;
  isAdmin: boolean;
}

export const ChannelMessagePane: React.FC<ChannelMessagePaneProps> = ({
  channel,
  onChannelUpdate,
  onChannelDelete,
  onShowMembers,
  isAdmin
}) => {
  const [messageInput, setMessageInput] = useState('');
  
  const { 
    messages, 
    loading, 
    sending, 
    sendMessage,
    loadMore,
    hasMore,
    isLoadingMore
  } = useChannelMessages(channel.id);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending) return;

    try {
      await sendMessage(messageInput, channel.trip_id);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-card/50">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">{channel.name}</h2>
            {channel.description && (
              <p className="text-sm text-gray-400">{channel.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onShowMembers}
            className="text-gray-400 hover:text-white"
          >
            <Users size={16} className="mr-2" />
            {channel.member_count}
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <Settings size={16} />
            </Button>
          )}
        </div>
      </div>

      {/* Unified Chat Shell - Teams-like container */}
      <div
        className="flex-1 mx-4 my-4 rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col"
        style={{
          minHeight: '360px',
          maxHeight: 'max(360px, 75vh)'
        }}
      >
        {loading ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <p className="mb-2">No messages yet</p>
                <p className="text-sm">Be the first to say something!</p>
              </div>
            </div>
          </div>
        ) : (
          <VirtualizedMessageContainer
            messages={messages}
            renderMessage={(message) => (
              <div key={message.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {message.author_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-white">{message.author_name || 'Anonymous'}</span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(message.created_at), 'h:mm a')}
                    </span>
                  </div>
                  <p className="text-gray-200 break-words">{message.content}</p>
                </div>
              </div>
            )}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoadingMore}
            initialVisibleCount={10}
            className="chat-scroll-container native-scroll"
          />
        )}

        {/* Input Area */}
        <div className="border-t border-white/10 bg-black/30 p-3">
          <div className="flex gap-2">
            <Input
              placeholder={`Message #${channel.name}`}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1 bg-card border-border"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || sending}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Send size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
