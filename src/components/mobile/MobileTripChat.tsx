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
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { MessageSkeleton } from './SkeletonLoader';
import { hapticService } from '../../services/hapticService';
import { ChatFilterTabs } from '../chat/ChatFilterTabs';
import { supabase } from '@/integrations/supabase/client';
import { markMessageAsRead } from '@/services/readReceiptService';

interface MobileTripChatProps {
  tripId: string;
  isEvent?: boolean;
}

export const MobileTripChat = ({ tripId, isEvent = false }: MobileTripChatProps) => {
  const orientation = useOrientation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [reactions, setReactions] = useState<{ [messageId: string]: { [reaction: string]: { count: number; userReacted: boolean } } }>({});
  const [messageFilter, setMessageFilter] = useState<'all' | 'broadcasts' | 'channels'>('all');
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);
  
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
    isBroadcast: msg.privacy_mode === 'broadcast'
  }));

  // Track unread counts with real-time updates
  const { unreadCount, broadcastCount } = useUnreadCounts({
    tripId,
    messages: rawMessages,
    userId,
    enabled: true
  });

  // Mark messages as read when viewing
  useEffect(() => {
    if (!userId || rawMessages.length === 0) return;

    const markVisibleMessagesAsRead = async () => {
      // Mark the latest messages as read
      const latestMessages = rawMessages.slice(-10);
      for (const msg of latestMessages) {
        if (msg.user_id !== userId) {
          try {
            await markMessageAsRead(msg.id, tripId, userId);
          } catch (error) {
            console.error('Failed to mark message as read:', error);
          }
        }
      }
    };

    // Debounce to avoid excessive updates
    const timer = setTimeout(markVisibleMessagesAsRead, 1000);
    return () => clearTimeout(timer);
  }, [rawMessages, tripId, userId]);
  
  const {
    inputMessage,
    setInputMessage,
    replyingTo,
    clearReply,
    sendMessage,
    filterMessages
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

  const filteredMessages = filterMessages(messages);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Chat Container - Messages with Integrated Filter Tabs */}
      <div className="flex-1 flex flex-col min-h-0 p-4">
        <div className="rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex-1 flex flex-col">
          {/* Filter Tabs - Sticky Inside Chat Pane */}
          <ChatFilterTabs
            activeFilter={messageFilter}
            onFilterChange={setMessageFilter}
            hasChannels={false}
            isPro={false}
            broadcastCount={broadcastCount}
            unreadCount={unreadCount}
          />
          
          {isLoading ? (
            <div className="flex-1 overflow-y-auto p-4">
              <MessageSkeleton />
            </div>
          ) : (
            <VirtualizedMessageContainer
              messages={filteredMessages}
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
        </div>
      </div>

      {/* Persistent Chat Input - Fixed at Bottom */}
      <div className="chat-input-persistent pb-[calc(env(safe-area-inset-bottom)+60px)] md:pb-[env(safe-area-inset-bottom)]">
        <div className="chat-composer px-4 py-3">
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
  );
};
