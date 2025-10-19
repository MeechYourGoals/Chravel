import React, { useState, useRef, useEffect } from 'react';
import { useOrientation } from '../../hooks/useOrientation';
import { ChatInput } from '../chat/ChatInput';
import { MessageList } from '../chat/MessageList';
import { InlineReplyComponent } from '../chat/InlineReplyComponent';
import { useChatComposer, ChatMessage } from '../../hooks/useChatComposer';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reactions, setReactions] = useState<{ [messageId: string]: { [reaction: string]: { count: number; userReacted: boolean } } }>({});
  
  const {
    inputMessage,
    setInputMessage,
    replyingTo,
    clearReply,
    sendMessage
  } = useChatComposer({ tripId });

  // Pull to refresh
  const { isPulling, isRefreshing, pullDistance, shouldTrigger } = usePullToRefresh({
    onRefresh: async () => {
      setIsLoading(true);
      // Simulate loading new messages
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsLoading(false);
    },
    threshold: 80
  });

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

  // Simulate initial load
  useEffect(() => {
    setTimeout(() => setIsLoading(false), 800);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleMobileSendMessage = async (isBroadcast = false, isPayment = false, paymentData?: any) => {
    await hapticService.light();
    const message = await sendMessage({ isBroadcast, isPayment, paymentData });
    if (message) {
      setMessages(prev => [...prev, message]);
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
      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={80}
      />

      {/* Messages Container - Scrollable with orientation awareness */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 native-scroll"
        style={{
          maxHeight: isKeyboardVisible 
            ? orientation === 'portrait' ? 'calc(100dvh - 300px)' : 'calc(100dvh - 240px)'
            : orientation === 'portrait' ? 'calc(100dvh - 280px)' : 'calc(100dvh - 220px)'
        }}
      >
        {isLoading ? (
          <MessageSkeleton />
        ) : (
          <>
            <MessageList
              messages={messages}
              reactions={reactions}
              onReaction={handleReaction}
              emptyStateTitle="Start the conversation"
              emptyStateDescription="Send your first message to the group"
            />
            <div ref={messagesEndRef} />
          </>
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
