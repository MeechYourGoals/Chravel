import React, { useState, useRef, useEffect } from 'react';
import { useOrientation } from '../../hooks/useOrientation';
import { ChatInput } from '../chat/ChatInput';
import { MessageList } from '../chat/MessageList';
import { InlineReplyComponent } from '../chat/InlineReplyComponent';
import { VirtualizedMessageContainer } from '../chat/VirtualizedMessageContainer';
import { MessageItem } from '../chat/MessageItem';
import { useChatComposer, ChatMessage } from '../../hooks/useChatComposer';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useUnifiedMessages } from '../../hooks/useUnifiedMessages';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { MessageSkeleton } from './SkeletonLoader';
import { hapticService } from '../../services/hapticService';

interface MobileTripChatProps {
  tripId: string;
  isEvent?: boolean;
}

export const MobileTripChat = ({ tripId, isEvent = false }: MobileTripChatProps) => {
  const orientation = useOrientation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [reactions, setReactions] = useState<{ [messageId: string]: { [reaction: string]: { count: number; userReacted: boolean } } }>({});
  
  // Use unified messages hook for real-time chat
  const {
    messages: rawMessages,
    isLoading,
    sendMessage: sendUnifiedMessage,
    loadMore,
    hasMore,
    isLoadingMore
  } = useUnifiedMessages({ tripId, enabled: true });

  // Convert unified messages to chat messages format
  const messages: ChatMessage[] = rawMessages.map(msg => ({
    id: msg.id,
    text: msg.content,
    sender: {
      id: msg.user_id || 'unknown',
      name: msg.author_name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.author_name}`
    },
    createdAt: new Date(msg.created_at).toISOString(),
    isBroadcast: false
  }));
  
  const {
    inputMessage,
    setInputMessage,
    replyingTo,
    clearReply,
    sendMessage
  } = useChatComposer({ tripId });

  // Handle keyboard visibility for better UX
  const { isKeyboardVisible } = useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true,
    onShow: () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  });

  const handleMobileSendMessage = async (isBroadcast = false, isPayment = false, paymentData?: any) => {
    await hapticService.light();
    if (inputMessage.trim()) {
      await sendUnifiedMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleReaction = async (messageId: string, reactionType: string) => {
    await hapticService.light();
    const updatedReactions = { ...reactions };
    if (!updatedReactions[messageId]) {
      updatedReactions[messageId] = {};
    }

    const currentReaction = updatedReactions[messageId][reactionType] || { count: 0, userReacted: false };
    currentReaction.userReacted = !currentReaction.userReacted;
    currentReaction.count += currentReaction.userReacted ? 1 : -1;

    updatedReactions[messageId][reactionType] = currentReaction;
    setReactions(updatedReactions);
  };

  const handleFileSelect = async (files: FileList) => {
    await hapticService.medium();
    // File upload logic will be handled by ChatInput
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Messages Container - Scrollable with orientation awareness */}
      <div 
        className="flex-1 flex flex-col"
        style={{
          maxHeight: isKeyboardVisible 
            ? orientation === 'portrait' ? 'calc(100dvh - 300px)' : 'calc(100dvh - 240px)'
            : orientation === 'portrait' ? 'calc(100dvh - 280px)' : 'calc(100dvh - 220px)'
        }}
      >
        {isLoading ? (
          <div className="flex-1 p-4">
            <MessageSkeleton />
          </div>
        ) : (
          <VirtualizedMessageContainer
            messages={messages}
            renderMessage={(message) => (
              <MessageItem
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
      </div>

      {/* Reply Bar (if replying) */}
      {replyingTo && (
        <div className="px-4 py-2 border-t border-white/10 bg-black/80">
          <InlineReplyComponent
            replyTo={replyingTo}
            onCancel={clearReply}
          />
        </div>
      )}

      {/* Input Area - Sticky at bottom */}
      <div className="sticky bottom-0 bg-black border-t border-white/10 px-4 py-3 safe-bottom">
        <ChatInput
          inputMessage={inputMessage}
          onInputChange={setInputMessage}
          onSendMessage={handleMobileSendMessage}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleMobileSendMessage();
            }
          }}
          apiKey=""
          isTyping={false}
          tripMembers={[]}
          hidePayments={true}
        />
      </div>
    </div>
  );
};
