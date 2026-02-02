import React, { useState, useRef, useEffect } from 'react';
import { useOrientation } from '../../hooks/useOrientation';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { MessageList } from '@/features/chat/components/MessageList';
import { InlineReplyComponent } from '@/features/chat/components/InlineReplyComponent';
import { VirtualizedMessageContainer } from '@/features/chat/components/VirtualizedMessageContainer';
import { MessageItem } from '@/features/chat/components/MessageItem';
import { useChatComposer, ChatMessage } from '@/features/chat/hooks/useChatComposer';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';
import { useUnifiedMessages } from '@/features/chat/hooks/useUnifiedMessages';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { MessageSkeleton } from './SkeletonLoader';
import { hapticService } from '../../services/hapticService';
import { ChatFilterTabs } from '@/features/chat/components/ChatFilterTabs';
import { ChatSearchOverlay } from '@/features/chat/components/ChatSearchOverlay';
import { supabase } from '@/integrations/supabase/client';
import { markMessagesAsRead } from '@/services/readReceiptService';
import { useRoleChannels } from '@/hooks/useRoleChannels';
import { TripChannel } from '@/types/roleChannels';
import { useEffectiveSystemMessagePreferences } from '@/hooks/useSystemMessagePreferences';
import { isConsumerTrip } from '@/utils/tripTierDetector';

interface MobileTripChatProps {
  tripId: string;
  isEvent?: boolean;
  isPro?: boolean;
  userRole?: string;
}

export const MobileTripChat = ({ tripId, isEvent = false, isPro = false, userRole = 'member' }: MobileTripChatProps) => {
  const orientation = useOrientation();
  const chatPaneRef = useRef<HTMLDivElement>(null);
  const [reactions, setReactions] = useState<{ [messageId: string]: { [reaction: string]: { count: number; userReacted: boolean } } }>({});
  const [messageFilter, setMessageFilter] = useState<'all' | 'broadcasts' | 'channels'>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [profileByUserId, setProfileByUserId] = useState<Record<string, { display_name: string | null; avatar_url: string | null }>>({});

  // System message preferences - only for consumer trips
  const isConsumer = isConsumerTrip(tripId);
  const { data: systemMessagePrefs } = useEffectiveSystemMessagePreferences(isConsumer ? tripId : '');

  // Initialize role channels hook for Pro/Enterprise trips
  const {
    availableChannels,
    activeChannel,
    setActiveChannel,
  } = useRoleChannels(tripId, userRole, []);

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

  // Load canonical profiles for message senders (display name + avatar)
  useEffect(() => {
    const loadProfiles = async () => {
      const senderIds = Array.from(
        new Set(rawMessages.map(m => m.user_id).filter((id): id is string => !!id)),
      );

      if (senderIds.length === 0) {
        setProfileByUserId({});
        return;
      }

      // Use public view for co-member profile data (respects privacy settings)
      const { data, error } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', senderIds);

      if (error) {
        // Don't block chat rendering if profiles fail to load.
        return;
      }

      const nextMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      for (const row of data ?? []) {
        const name = row.display_name
          || [row.first_name, row.last_name].filter(Boolean).join(' ')
          || null;
        nextMap[row.user_id] = { display_name: name, avatar_url: row.avatar_url };
      }
      setProfileByUserId(nextMap);
    };

    loadProfiles().catch(() => {
      // ignore
    });
  }, [rawMessages]);

  // Convert unified messages to chat messages format
  const messages: ChatMessage[] = rawMessages.map(msg => ({
    id: msg.id,
    text: msg.content,
    sender: {
      id: msg.user_id || 'unknown',
      name: profileByUserId[msg.user_id || '']?.display_name || msg.author_name,
      // Canonical avatar: profiles.avatar_url. No silent AI/stock avatar assignment.
      avatar: profileByUserId[msg.user_id || '']?.avatar_url || undefined
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
      // Get all message IDs from other users that need to be marked as read
      const messageIdsToMark = rawMessages
        .filter(msg => msg.user_id !== userId)
        .map(msg => msg.id);

      if (messageIdsToMark.length > 0) {
        try {
          await markMessagesAsRead(messageIdsToMark, tripId, userId);
        } catch (error) {
          console.error('Failed to mark messages as read:', error);
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
      // After the viewport resizes, keep the user pinned to the bottom (chat-app behavior).
      // We intentionally target the scroll container inside the chat pane, not the whole page.
      setTimeout(() => {
        const scroller = chatPaneRef.current?.querySelector<HTMLElement>('.chat-scroll-container');
        if (!scroller) return;
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
      }, 150);
    }
  });

  const handleMobileSendMessage = async (isBroadcast = false, isPayment = false, paymentData?: any) => {
    if (!inputMessage.trim()) return;

    // Message send: light haptic (native-only, hard-gated).
    void hapticService.light();
    await sendUnifiedMessage(inputMessage, isBroadcast ? 'broadcast' : 'standard');
    setInputMessage('');
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
    ? (isKeyboardVisible ? 'calc(100dvh - 280px)' : 'calc(100dvh - 240px)')
    : (isKeyboardVisible ? 'calc(100dvh - 200px)' : 'calc(100dvh - 180px)');

  const filteredMessages = filterMessages(messages);

  // Scroll to specific message with highlight animation
  const scrollToMessage = (messageId: string, type: 'message' | 'broadcast') => {
    setShowSearchOverlay(false);

    // Switch to appropriate filter
    if (type === 'broadcast' && messageFilter !== 'broadcasts') {
      setMessageFilter('broadcasts');
    } else if (type === 'message' && messageFilter !== 'all') {
      setMessageFilter('all');
    }

    // Wait for filter to apply, then scroll
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Add highlight animation
        messageElement.classList.add('search-highlight-flash');
        setTimeout(() => {
          messageElement.classList.remove('search-highlight-flash');
        }, 1000);
      }
    }, 100);
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Search Overlay Modal */}
      {showSearchOverlay && (
        <ChatSearchOverlay
          tripId={tripId}
          onClose={() => setShowSearchOverlay(false)}
          onResultSelect={scrollToMessage}
          isDemoMode={false}
          demoMessages={[]}
        />
      )}
      
      {/* Chat Container - Messages with Filter Tabs (flex-1 to fill available space) */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div
          ref={chatPaneRef}
          className="rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex-1 flex flex-col mx-4 mt-4 mb-2"
        >
          {/* Filter Tabs - Sticky Inside Chat Pane */}
          <ChatFilterTabs
            activeFilter={messageFilter}
            onFilterChange={setMessageFilter}
            hasChannels={availableChannels.length > 0}
            isPro={isPro}
            broadcastCount={broadcastCount}
            unreadCount={unreadCount}
            onSearchClick={() => setShowSearchOverlay(true)}
            availableChannels={availableChannels}
            activeChannel={activeChannel}
            onChannelSelect={(channel: TripChannel | null) => {
              setActiveChannel(channel);
              if (channel) {
                setMessageFilter('channels');
              }
            }}
          />
          
          {/* Message List - flex-1 with overflow for scrolling */}
          {isLoading ? (
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
                  systemMessagePrefs={isConsumer ? systemMessagePrefs : undefined}
                />
              )}
              onLoadMore={loadMore}
              hasMore={hasMore}
              isLoading={isLoadingMore}
              initialVisibleCount={10}
              className="flex-1 min-h-0 overflow-y-auto chat-scroll-container native-scroll"
            />
          )}
          
          {/* Reply Bar */}
          {replyingTo && (
            <div className="border-t border-white/10 bg-black/30 px-4 py-2 flex-shrink-0">
              <InlineReplyComponent
                replyTo={replyingTo}
                onCancel={clearReply}
              />
            </div>
          )}
        </div>
      </div>

      {/* Chat Input - Fixed to Bottom with Safe Area (ONLY component with safe-area padding) */}
      <div className="flex-shrink-0 sticky bottom-0 z-20 bg-black/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
        <div className="px-4 py-3">
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
            safeAreaBottom={false}
            tripId={tripId}
          />
        </div>
      </div>
    </div>
  );
};
