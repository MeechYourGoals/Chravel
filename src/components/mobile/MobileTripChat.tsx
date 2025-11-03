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

  const baseMaxHeight = orientation === 'portrait'
    ? (isKeyboardVisible ? 'calc(100dvh - 240px)' : 'calc(100dvh - 220px)')
    : (isKeyboardVisible ? 'calc(100dvh - 180px)' : 'calc(100dvh - 160px)');

  return (
    <div className="flex flex-col min-h-screen bg-black">
      {/* Unified Chat Shell - Teams-like container */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div
          className="rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col flex-1"
        >
          {isLoading ? (
            <div className="flex-1 overflow-y-auto p-4">
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
              className="chat-scroll-container native-scroll chat-safe-scroll"
            />
          )}
          
          {/* Reply Bar */}
          {replyingTo && (
            <div className="border-t border-white/10 bg-black/30 px-4 py-2">
              <InlineReplyComponent
                replyTo={replyingTo}
                onCancel={clearReply}
              />
            </div>
          )}

          {/* Input Area */}
          <div className="sticky bottom-0 z-10 border-t border-white/10 bg-black/30 p-3 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-3">
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
              tripId={tripId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
