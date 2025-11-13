import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { demoModeService } from '../services/demoModeService';
import { useDemoMode } from '../hooks/useDemoMode';
import { useChatComposer } from '../hooks/useChatComposer';
import { useOrientation } from '../hooks/useOrientation';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';
import { useRoleChannels } from '@/hooks/useRoleChannels';
import { ChannelChatView } from './pro/channels/ChannelChatView';
import { TypingIndicator } from './chat/TypingIndicator';
import { TypingIndicatorService } from '@/services/typingIndicatorService';
import { markMessageAsRead, subscribeToReadReceipts } from '@/services/readReceiptService';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { MessageSearch } from './chat/MessageSearch';
import { ParsedContentSuggestions } from './chat/ParsedContentSuggestions';
import { supabase } from '@/integrations/supabase/client';
import { parseMessage } from '@/services/chatContentParser';
import { MessageTypeBar } from './chat/MessageTypeBar';

interface TripChatProps {
  enableGroupChat?: boolean;
  showBroadcasts?: boolean;
  isEvent?: boolean;
  tripId?: string;
  isPro?: boolean; // 🆕 Flag to enable role channels for enterprise trips
  userRole?: string; // 🆕 User's role for channel access
  participants?: Array<{ id: string; name: string; role?: string }>; // 🆕 Participants with roles for channel generation
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
  userRole = 'member',
  participants = []
}: TripChatProps) => {
  const [demoMessages, setDemoMessages] = useState<MockMessage[]>([]);
  const [demoLoading, setDemoLoading] = useState(true);
  const [reactions, setReactions] = useState<{ [messageId: string]: { [reaction: string]: { count: number; userReacted: boolean } } }>({});
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const typingServiceRef = useRef<TypingIndicatorService | null>(null);
  
  const { isOffline } = useOfflineStatus();
  const params = useParams<{ tripId?: string; proTripId?: string; eventId?: string }>();
  const resolvedTripId = useMemo(() => {
    return tripIdProp || params.tripId || params.proTripId || params.eventId || '';
  }, [tripIdProp, params.tripId, params.proTripId, params.eventId]);
  
  const demoMode = useDemoMode();
  const { user } = useAuth();

  // Live chat hooks - always initialize normally
  const { tripMembers } = useTripMembers(resolvedTripId);
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

  // Extract unique roles from participants for channel generation
  const participantRoles = useMemo(() => {
    if (!isPro) return [];
    return [...new Set(participants.map(p => p.role).filter(Boolean))];
  }, [isPro, participants]);

  // Initialize role channels hook for Pro/Enterprise trips
  const {
    availableChannels,
    activeChannel,
    messages: channelMessages,
    setActiveChannel,
    sendMessage: sendChannelMessage
  } = useRoleChannels(resolvedTripId, userRole, participantRoles);

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

  // Track unread counts with real-time updates
  const { unreadCount, broadcastCount } = useUnreadCounts({
    tripId: resolvedTripId,
    messages: liveMessages as any,
    userId: user?.id || null,
    enabled: !shouldUseDemoData && !!user?.id
  });

  // Initialize typing indicators
  useEffect(() => {
    if (shouldUseDemoData || !user?.id || !resolvedTripId) return;

    const userName = user?.displayName || user?.email?.split('@')[0] || 'You';
    typingServiceRef.current = new TypingIndicatorService(resolvedTripId, user.id, userName);

    typingServiceRef.current.initialize(setTypingUsers).catch(error => {
      if (import.meta.env.DEV) {
        console.error(error);
      }
    });

    return () => {
      typingServiceRef.current?.cleanup().catch(error => {
        if (import.meta.env.DEV) {
          console.error(error);
        }
      });
    };
  }, [shouldUseDemoData, user?.id, resolvedTripId]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (shouldUseDemoData || !user?.id || !resolvedTripId) return;

    const subscription = subscribeToReadReceipts(resolvedTripId, () => {
      // Read receipt updates handled via realtime
    });

    // Mark visible messages as read
    const markVisibleAsRead = async () => {
      const visibleMessages = liveMessages.slice(-10); // Last 10 messages
      for (const msg of visibleMessages) {
        if (msg.user_id !== user.id) {
          await markMessageAsRead(msg.id, resolvedTripId, user.id).catch(error => {
            if (import.meta.env.DEV) {
              console.error(error);
            }
          });
        }
      }
    };

    markVisibleAsRead();

    return () => {
      supabase.removeChannel(subscription).catch(error => {
        if (import.meta.env.DEV) {
          console.error(error);
        }
      });
    };
  }, [liveMessages, user?.id, resolvedTripId, shouldUseDemoData]);

  const liveFormattedMessages = useMemo(() => {
    if (shouldUseDemoData) return [];
    return liveMessages.map(message => ({
      id: message.id,
      text: message.content,
      sender: {
        id: message.user_id || message.author_name || 'unknown',
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
      await sendTripMessage(message.text, authorName, undefined, undefined, user?.id, isBroadcast ? 'broadcast' : 'normal');
      
      // 🆕 Auto-parse message for entities (dates, times, locations)
      if (message.text && message.text.trim().length > 10) {
        try {
          const parsed = await parseMessage(message.text, resolvedTripId);
          // Parsed content available for future UI integration
        } catch (parseError) {
          // Silently fail - don't interrupt message sending
          if (import.meta.env.DEV) {
            console.warn('[TripChat] Message parsing failed:', parseError);
          }
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to send chat message:', error);
      }
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
        
        // Detect if this is a Pro or Event trip
        const isProTrip = isPro || params.proTripId;
        const isEventTrip = isEvent || params.eventId;
        
        let demoMessagesData;
        
        if (isProTrip) {
          // Load Pro-specific demo messages
          demoMessagesData = await demoModeService.getProMockMessages('pro', user?.id || 'demo-user');
        } else if (isEventTrip) {
          // Load Event-specific demo messages
          demoMessagesData = await demoModeService.getProMockMessages('event', user?.id || 'demo-user');
        } else {
          // Load consumer trip demo messages (existing logic)
          demoMessagesData = await demoModeService.getMockMessages('friends-trip', true, user?.id || 'demo-user');
        }

        const formattedMessages = demoMessagesData.map(msg => ({
          id: msg.id,
          text: msg.message_content || '',
          sender: {
            id: msg.sender_id || msg.sender_name || msg.id,
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
          const demoMessagesData = await demoModeService.getMockMessages('friends-trip', true, user?.id || 'demo-user');

          const formattedMessages = demoMessagesData.map(msg => ({
            id: msg.id,
            text: msg.message_content || '',
            sender: {
              id: msg.sender_id || msg.sender_name || msg.id,
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
  }, [shouldUseDemoData, isEvent, isPro, resolvedTripId, liveFormattedMessages.length, user?.id]);

  // Auto-select first channel when switching to 'channels' filter
  useEffect(() => {
    if (messageFilter === 'channels' && availableChannels.length > 0 && !activeChannel) {
      // Sort alphabetically and select first
      const sortedChannels = [...availableChannels].sort((a, b) => 
        a.channelName.localeCompare(b.channelName)
      );
      setActiveChannel(sortedChannels[0]);
    }
  }, [messageFilter, availableChannels, activeChannel, setActiveChannel]);

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
      {/* Offline Mode Banner */}
      {isOffline && (
        <Alert className="mx-4 mt-2 mb-0 border-warning/50 bg-warning/10">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Offline Mode – viewing cached messages
          </AlertDescription>
        </Alert>
      )}

      {/* Chat Container - Messages with Integrated Filter Tabs */}
      <div className="flex-1 flex flex-col min-h-0 pb-4" data-chat-container>
        <div className="rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex-1 flex flex-col max-h-[70vh]">
          {/* Filter Tabs - ALWAYS VISIBLE */}
          <MessageTypeBar
            activeFilter={messageFilter}
            onFilterChange={setMessageFilter}
            hasChannels={availableChannels.length > 0 || participantRoles.length > 0}
            isPro={isPro}
            broadcastCount={broadcastCount}
            unreadCount={unreadCount}
            availableChannels={availableChannels}
            activeChannel={activeChannel}
            onChannelSelect={(channel) => {
              setActiveChannel(channel);
              setMessageFilter('channels');
            }}
          />

          {/* Conditional Content Area */}
          {messageFilter === 'channels' && activeChannel ? (
            <ChannelChatView
              channel={activeChannel}
              availableChannels={availableChannels}
              onChannelChange={setActiveChannel}
            />
          ) : (
            <>
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
                  onLoadMore={(shouldUseDemoData || isConsumerTripWithNoMessages) ? () => {} : loadMoreMessages}
                  hasMore={(shouldUseDemoData || isConsumerTripWithNoMessages) ? false : hasMore}
                  isLoading={isLoadingMore}
                  initialVisibleCount={10}
                  className="chat-scroll-container native-scroll px-3"
                  autoScroll={true}
                  restoreScroll={true}
                  scrollKey={`chat-scroll-${resolvedTripId}`}
                />
              )}
              
              {/* Typing Indicator */}
              {!shouldUseDemoData && typingUsers.length > 0 && (
                <TypingIndicator typingUsers={typingUsers} />
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
            </>
          )}
        </div>
      </div>

      {/* Persistent Chat Input - Fixed at Bottom (Hidden when in Channels mode) */}
      {messageFilter !== 'channels' && (
        <div className="chat-input-persistent pb-[env(safe-area-inset-bottom)]">
          <div className="px-4 py-3 pb-4">
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
              onTypingChange={(isTyping) => {
                if (!shouldUseDemoData && typingServiceRef.current) {
                  if (isTyping) {
                    typingServiceRef.current.startTyping().catch(error => {
                      if (import.meta.env.DEV) {
                        console.error(error);
                      }
                    });
                  } else {
                    typingServiceRef.current.stopTyping().catch(error => {
                      if (import.meta.env.DEV) {
                        console.error(error);
                      }
                    });
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
