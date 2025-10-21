import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { demoModeService } from '../services/demoModeService';
import { useDemoMode } from '../hooks/useDemoMode';
import { useChatComposer } from '../hooks/useChatComposer';
import { useOrientation } from '../hooks/useOrientation';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { ChatInput } from './chat/ChatInput';
import { MessageList } from './chat/MessageList';
import { MessageFilters } from './chat/MessageFilters';
import { InlineReplyComponent } from './chat/InlineReplyComponent';
import { VirtualizedMessageContainer } from './chat/VirtualizedMessageContainer';
import { MessageItem } from './chat/MessageItem';
import { PullToRefreshIndicator } from './mobile/PullToRefreshIndicator';
import { MessageSkeleton } from './mobile/SkeletonLoader';
import { getMockAvatar } from '../utils/mockAvatars';
import { useTripMembers } from '../hooks/useTripMembers';
import { useTripChat } from '@/hooks/useTripChat';
import { useAuth } from '@/hooks/useAuth';
import { PaymentData } from '@/types/payments';
import { hapticService } from '../services/hapticService';

interface TripChatProps {
  enableGroupChat?: boolean;
  showBroadcasts?: boolean;
  isEvent?: boolean;
  tripId?: string;
  isPro?: boolean; // 🆕 Flag to enable role channels for enterprise trips
  userRole?: string; // 🆕 User's role for channel access
}

interface MockMessage {
  id: string;
  text: string;
  sender: { id: string; name: string; avatar?: string };
  createdAt: string;
  isAiMessage?: boolean;
  isBroadcast?: boolean;
  
  reactions?: { [key: string]: string[] };
  replyTo?: { id: string; text: string; sender: string };
  trip_type?: string;
  sender_name?: string;
  message_content?: string;
  delay_seconds?: number;
  timestamp_offset_days?: number;
  tags?: string[];
}

export const TripChat = ({
  enableGroupChat = true,
  showBroadcasts = true,
  isEvent = false,
  tripId: tripIdProp,
  isPro = false,
  userRole = 'member'
}: TripChatProps) => {
  const [demoMessages, setDemoMessages] = useState<MockMessage[]>([]);
  const [demoLoading, setDemoLoading] = useState(true);
  const [reactions, setReactions] = useState<{ [messageId: string]: { [reaction: string]: { count: number; userReacted: boolean } } }>({});

  const params = useParams<{ tripId?: string; proTripId?: string; eventId?: string }>();
  const resolvedTripId = useMemo(() => {
    return tripIdProp || params.tripId || params.proTripId || params.eventId || '';
  }, [tripIdProp, params.tripId, params.proTripId, params.eventId]);
  const demoMode = useDemoMode();
  const { tripMembers } = useTripMembers(resolvedTripId);
  const { user } = useAuth();
  const {
    messages: liveMessages,
    isLoading: liveLoading,
    sendMessageAsync: sendTripMessage,
    isCreating: isSendingMessage,
    loadMore: loadMoreMessages,
    hasMore,
    isLoadingMore
  } = useTripChat(resolvedTripId);

  const {
    inputMessage,
    setInputMessage,
    messageFilter,
    setMessageFilter,
    replyingTo,
    setReply,
    clearReply,
    sendMessage,
    filterMessages
  } = useChatComposer({ tripId: resolvedTripId, demoMode: demoMode.isDemoMode, isEvent });

  // Mobile-specific hooks
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const orientation = useOrientation();
  
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

  // Pull to refresh functionality
  const { isPulling, isRefreshing, pullDistance, shouldTrigger } = usePullToRefresh({
    onRefresh: async () => {
      // Refresh messages logic here
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    threshold: 80
  });

  // Swipe gestures for mobile navigation
  const swipeRef = useRef<HTMLDivElement>(null);
  useSwipeGesture(swipeRef, {
    onSwipeLeft: () => {
      // Handle swipe left gesture
      hapticService.light();
    },
    onSwipeRight: () => {
      // Handle swipe right gesture
      hapticService.light();
    },
    threshold: 50
  });

  const shouldUseDemoData = demoMode.isDemoMode || !resolvedTripId;

  const liveFormattedMessages = useMemo(() => {
    if (shouldUseDemoData) return [];
    return liveMessages.map(message => ({
      id: message.id,
      text: message.content,
      sender: {
        id: message.author_name || 'unknown',
        name: message.author_name || 'Unknown',
        avatar: getMockAvatar(message.author_name || 'Unknown')
      },
      createdAt: message.created_at,
      isBroadcast: message.privacy_mode === 'broadcast',
      isPayment: false,
      tags: [] as string[]
    }));
  }, [liveMessages, shouldUseDemoData]);

  const handleSendMessage = async (isBroadcast = false, isPayment = false, paymentData?: any) => {
    // Transform paymentData if needed to match useChatComposer expectations
    let transformedPaymentData;
    if (isPayment && paymentData) {
      transformedPaymentData = {
        amount: paymentData.amount,
        currency: paymentData.currency,
        description: paymentData.description,
        splitCount: paymentData.splitCount,
        splitParticipants: paymentData.splitParticipants || [],
        paymentMethods: paymentData.paymentMethods || []
      };
    }

    const message = await sendMessage({
      isBroadcast, 
      isPayment, 
      paymentData: transformedPaymentData 
    });
    
    if (!message) {
      return;
    }

    if (shouldUseDemoData) {
      setDemoMessages(prev => [...prev, message as MockMessage]);
      return;
    }

    const authorName = user?.displayName || user?.email?.split('@')[0] || 'You';
    try {
      await sendTripMessage(message.text, authorName);
    } catch (error) {
      console.error('Failed to send chat message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = (messageId: string, reactionType: string) => {
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

  useEffect(() => {
    const loadDemoData = async () => {
      if (shouldUseDemoData) {
        setDemoLoading(true);
        // Exclude payment messages from chat
        const demoMessagesData = await demoModeService.getMockMessages('friends-trip', true);

        const formattedMessages = demoMessagesData.map(msg => ({
          id: msg.id,
          text: msg.message_content || '',
          sender: {
            id: msg.id,
            name: msg.sender_name || 'Unknown',
            avatar: getMockAvatar(msg.sender_name || 'Unknown')
          },
          createdAt: new Date(Date.now() - (msg.timestamp_offset_days || 0) * 86400000).toISOString(),
          isBroadcast: msg.tags?.includes('broadcast') || msg.tags?.includes('logistics') || msg.tags?.includes('urgent') || false,

          trip_type: msg.trip_type,
          sender_name: msg.sender_name,
          message_content: msg.message_content,
          delay_seconds: msg.delay_seconds,
          timestamp_offset_days: msg.timestamp_offset_days,
          tags: msg.tags
        }));

        setDemoMessages(formattedMessages);
        setDemoLoading(false);
      } else {
        // Clear demo messages when not in demo mode
        setDemoMessages([]);
        
        // BUT if we're on a consumer trip (1-12) and have no live messages, load demo
        const tripIdNum = parseInt(resolvedTripId);
        if (tripIdNum >= 1 && tripIdNum <= 12 && liveFormattedMessages.length === 0) {
          setDemoLoading(true);
          const demoMessagesData = await demoModeService.getMockMessages('friends-trip', true);

          const formattedMessages = demoMessagesData.map(msg => ({
            id: msg.id,
            text: msg.message_content || '',
            sender: {
              id: msg.id,
              name: msg.sender_name || 'Unknown',
              avatar: getMockAvatar(msg.sender_name || 'Unknown')
            },
            createdAt: new Date(Date.now() - (msg.timestamp_offset_days || 0) * 86400000).toISOString(),
            isBroadcast: msg.tags?.includes('broadcast') || msg.tags?.includes('logistics') || msg.tags?.includes('urgent') || false,

            trip_type: msg.trip_type,
            sender_name: msg.sender_name,
            message_content: msg.message_content,
            delay_seconds: msg.delay_seconds,
            timestamp_offset_days: msg.timestamp_offset_days,
            tags: msg.tags
          }));

          setDemoMessages(formattedMessages);
          setDemoLoading(false);
        } else {
          setDemoLoading(false);
        }
      }
    };

    loadDemoData();
  }, [shouldUseDemoData, isEvent, resolvedTripId, liveFormattedMessages.length]);

  // Determine which messages to show:
  // 1. Demo mode OR no tripId: show demo messages
  // 2. Consumer trip (1-12) with no live messages: show demo messages as fallback
  // 3. Otherwise: show live messages
  const tripIdNum = parseInt(resolvedTripId);
  const isConsumerTripWithNoMessages =
    tripIdNum >= 1 && tripIdNum <= 12 && liveFormattedMessages.length === 0 && !shouldUseDemoData;

  const messagesToShow = (shouldUseDemoData || isConsumerTripWithNoMessages)
    ? demoMessages
    : liveFormattedMessages;

  const filteredMessages = filterMessages(messagesToShow);

  const isLoading = shouldUseDemoData ? demoLoading : liveLoading;

  if (isLoading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message Filters */}
      {filteredMessages.length > 0 && (
        <div className="p-4 border-b border-gray-700">
          <MessageFilters
            activeFilter={messageFilter}
            onFilterChange={setMessageFilter}
            hidePayments={true}
          />
        </div>
      )}

      {/* Unified Chat Shell - Teams-like container */}
      <div
        className="mx-4 mb-6 rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex flex-col"
        style={{
          minHeight: '360px',
          maxHeight: 'max(360px, 78vh)'
        }}
      >
        {isLoading ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-slate-700" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-700 rounded w-1/4 mb-2" />
                    <div className="h-16 bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
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
            onLoadMore={(shouldUseDemoData || isConsumerTripWithNoMessages) ? () => {} : loadMoreMessages}
            hasMore={(shouldUseDemoData || isConsumerTripWithNoMessages) ? false : hasMore}
            isLoading={isLoadingMore}
            initialVisibleCount={10}
            className="chat-scroll-container native-scroll"
          />
        )}
        
        {/* Reply Bar */}
        {replyingTo && (
          <div className="border-t border-white/10 bg-black/30 px-4 py-2">
            <InlineReplyComponent 
              replyTo={{ 
                id: replyingTo.id, 
                text: replyingTo.text,
                senderName: replyingTo.senderName 
              }}
              onCancel={clearReply} 
            />
          </div>
        )}
        
        {/* Input Area */}
        <div className="border-t border-white/10 bg-black/30 p-3">
          <ChatInput
            inputMessage={inputMessage}
            onInputChange={setInputMessage}
            onSendMessage={handleSendMessage}
            onKeyPress={handleKeyPress}
            apiKey=""
            isTyping={isSendingMessage}
            tripMembers={tripMembers}
            hidePayments={true}
            isPro={isPro}
            tripId={resolvedTripId}
          />
        </div>
      </div>
    </div>
  );
};
