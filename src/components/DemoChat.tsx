
import React, { useState, useMemo, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { MessageItem } from '@/features/chat/components/MessageItem';
import { VirtualizedMessageContainer } from '@/features/chat/components/VirtualizedMessageContainer';
import { useUnifiedMessages } from '@/features/chat/hooks/useUnifiedMessages';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { ChatMessage } from '@/features/chat/hooks/useChatComposer';
import { useShareAsset } from '@/hooks/useShareAsset';

interface DemoChatProps {
  tripId: string;
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
  const [isTyping, setIsTyping] = useState(false);
  
  // Use share asset hook for file uploads in demo mode
  const { shareMultipleFiles } = useShareAsset(tripId);

  const handleSendMessage = useCallback(async (_isBroadcast?: boolean, _isPayment?: boolean, _paymentData?: unknown) => {
    if (!inputValue.trim()) return;
    await sendMessage(inputValue);
    setInputValue('');
  }, [inputValue, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = useCallback(async (files: FileList, type: 'image' | 'video' | 'document') => {
    try {
      await shareMultipleFiles(files, type);
    } catch (error) {
      console.error('File upload failed:', error);
    }
  }, [shareMultipleFiles]);

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

  // Transform messages from useUnifiedMessages format to ChatMessage format
  // IMPORTANT: Preserve media data for rich content rendering
  const transformedMessages = useMemo((): ChatMessage[] => {
    return messages.map(msg => ({
      id: msg.id,
      text: msg.content,
      sender: {
        id: msg.user_id || 'unknown',
        name: msg.author_name,
        avatar: undefined
      },
      createdAt: msg.created_at,
      isBroadcast: msg.message_type === 'broadcast',
      isPayment: msg.message_type === 'payment',
      reactions: {},
      // Preserve rich media data
      mediaType: msg.media_type as 'image' | 'video' | 'document' | null | undefined,
      mediaUrl: msg.media_url,
      linkPreview: msg.link_preview,
      attachments: msg.attachments as any,
    }));
  }, [messages]);

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
        {transformedMessages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-8">
              <MessageCircle size={32} className="text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No messages yet</p>
            </div>
          </div>
        ) : (
          <VirtualizedMessageContainer
            messages={transformedMessages}
            renderMessage={(message) => (
              <MessageItem
                key={message.id}
                message={message}
                reactions={reactions[message.id]}
                onReaction={handleReaction}
              />
            )}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoading={isLoadingMore}
            initialVisibleCount={10}
          />
        )}

        {/* Message Input - Full ChatInput with media support */}
        <div className="border-t border-gray-700">
          <ChatInput
            inputMessage={inputValue}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            onFileUpload={handleFileUpload}
            apiKey=""
            isTyping={isTyping}
            tripId={tripId}
            onTypingChange={setIsTyping}
            hidePayments={true}
            isInChannelMode={false}
            isPro={false}
          />
          <p className="text-xs text-gray-500 px-4 pb-2">
            Demo mode: Share photos, videos, and links just like in WhatsApp
          </p>
        </div>
      </div>
    </div>
  );
};
