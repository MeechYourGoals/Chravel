import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { demoModeService } from '@/services/demoModeService';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useChatComposer } from '../hooks/useChatComposer';
import { useKeyboardHandler } from '@/hooks/useKeyboardHandler';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { ChatInput } from './ChatInput';
import { InlineReplyComponent } from './InlineReplyComponent';
import { VirtualizedMessageContainer } from './VirtualizedMessageContainer';
import { MessageItem } from './MessageItem';
import { MessageSkeleton } from '@/components/mobile/SkeletonLoader';
import { getMockAvatar, defaultAvatar } from '@/utils/mockAvatars';
import { useTripMembers } from '@/hooks/useTripMembers';
import { useTripChat } from '../hooks/useTripChat';
import { useAuth } from '@/hooks/useAuth';
import { hapticService } from '@/services/hapticService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';
import { useRoleChannels } from '@/hooks/useRoleChannels';
import { ChannelChatView } from '@/components/pro/channels/ChannelChatView';
import { TypingIndicator } from './TypingIndicator';
import { TypingIndicatorService } from '@/services/typingIndicatorService';
import { markMessagesAsRead, subscribeToReadReceipts } from '@/services/readReceiptService';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { supabase } from '@/integrations/supabase/client';
import { parseMessage } from '@/services/chatContentParser';
import { MessageTypeBar } from './MessageTypeBar';
import { ChatSearchOverlay } from './ChatSearchOverlay';
import { useEffectiveSystemMessagePreferences } from '@/hooks/useSystemMessagePreferences';
import { isConsumerTrip } from '@/utils/tripTierDetector';
import {
  toggleMessageReaction,
  getMessagesReactions,
  subscribeToReactions,
  type ReactionType,
  type ReactionCount,
  pinMessage,
  unpinMessage,
} from '@/services/chatService';
import { ThreadView } from './ThreadView';
import { useTripPrivacyConfig, getEffectivePrivacyMode } from '@/hooks/useTripPrivacyConfig';
import { PinnedMessageBanner } from './PinnedMessageBanner';
import { toast } from 'sonner';

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
  isPinned?: boolean; // Add isPinned to mock message
}

// Match the interface from useTripChat.ts
interface TripChatMessage {
  id: string;
  trip_id: string;
  content: string;
  author_name: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  media_type?: string;
  media_url?: string;
  sentiment?: string;
  link_preview?: any;
  privacy_mode?: string;
  privacy_encrypted?: boolean;
  message_type?: string;
  is_edited?: boolean;
  edited_at?: string;
  reply_to_id?: string;
  payload?: any; // Add payload for pinned status
}

export const TripChat = ({
  enableGroupChat: _enableGroupChat = true,
  showBroadcasts: _showBroadcasts = true,
  isEvent = false,
  tripId: tripIdProp,
  isPro = false,
  userRole = 'member',
  participants = [],
}: TripChatProps) => {
  const [demoMessages, setDemoMessages] = useState<MockMessage[]>([]);
  const [reactions, setReactions] = useState<
    Record<string, Record<string, { count: number; userReacted: boolean }>>
  >({});
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
  const typingServiceRef = useRef<TypingIndicatorService | null>(null);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showPinnedMessage, setShowPinnedMessage] = useState(true); // Toggle state for pinned banner
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [activeThreadMessage, setActiveThreadMessage] = useState<{
    id: string;
    content: string;
    authorName: string;
    authorAvatar?: string;
    createdAt: string;
    tripId: string;
  } | null>(null);
  const [failedMessages, setFailedMessages] = useState<
    Array<{ id: string; text: string; authorName: string }>
  >([]);

  const { isOffline } = useOfflineStatus();
  const params = useParams<{ tripId?: string; proTripId?: string; eventId?: string }>();
  const resolvedTripId = useMemo(() => {
    return tripIdProp || params.tripId || params.proTripId || params.eventId || '';
  }, [tripIdProp, params.tripId, params.proTripId, params.eventId]);

  const demoMode = useDemoMode();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Optimistic cache updates for edit/delete (MessageActions does the API call)
  const handleMessageEdit = useCallback(
    (messageId: string, newContent: string) => {
      if (demoMode.isDemoMode || !resolvedTripId) return;
      queryClient.setQueryData(['tripChat', resolvedTripId], (old: TripChatMessage[] = []) =>
        old.map(msg =>
          msg.id === messageId
            ? { ...msg, content: newContent, is_edited: true, edited_at: new Date().toISOString() }
            : msg,
        ),
      );
    },
    [demoMode.isDemoMode, resolvedTripId, queryClient],
  );

  const handleMessageDelete = useCallback(
    (messageId: string) => {
      if (demoMode.isDemoMode || !resolvedTripId) return;
      queryClient.setQueryData(['tripChat', resolvedTripId], (old: TripChatMessage[] = []) =>
        old.filter(msg => msg.id !== messageId),
      );
    },
    [demoMode.isDemoMode, resolvedTripId, queryClient],
  );

  // System message preferences - only for consumer trips
  const isConsumer = isConsumerTrip(resolvedTripId);
  const { data: systemMessagePrefs } = useEffectiveSystemMessagePreferences(
    isConsumer ? resolvedTripId : '',
  );

  // ⚡ PERFORMANCE: Skip expensive hooks in demo mode for numeric trip IDs
  const shouldSkipLiveChat = demoMode.isDemoMode && /^\d+$/.test(resolvedTripId);

  // Fetch privacy config for the trip (after shouldSkipLiveChat is defined)
  const { data: privacyConfig } = useTripPrivacyConfig(
    shouldSkipLiveChat ? undefined : resolvedTripId,
  );

  // Live chat hooks - only initialize for authenticated trips
  const { tripMembers } = useTripMembers(shouldSkipLiveChat ? undefined : resolvedTripId);
  const {
    messages: liveMessages,
    isLoading: liveLoading,
    sendMessageAsync: sendTripMessage,
    isCreating: isSendingMessage,
    loadMore: loadMoreMessages,
    hasMore,
    isLoadingMore,
  } = useTripChat(shouldSkipLiveChat ? undefined : resolvedTripId);

  const {
    inputMessage,
    setInputMessage,
    messageFilter,
    setMessageFilter,
    replyingTo,
    setReply,
    clearReply,
    sendMessage,
    filterMessages,
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
    sendMessage: sendChannelMessage,
  } = useRoleChannels(resolvedTripId, userRole, participantRoles);

  // Mobile-specific hooks
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard visibility for better UX
  const { isKeyboardVisible } = useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true,
    onShow: () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    },
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
    threshold: 50,
  });

  // Track unread counts with real-time updates
  const { unreadCount, broadcastCount } = useUnreadCounts({
    tripId: resolvedTripId,
    messages: liveMessages,
    userId: user?.id || null,
    enabled: !demoMode.isDemoMode && !!user?.id,
  });

  // Initialize typing indicators
  useEffect(() => {
    if (demoMode.isDemoMode || !user?.id || !resolvedTripId) return;

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
  }, [demoMode.isDemoMode, user?.id, resolvedTripId]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (demoMode.isDemoMode || !user?.id || !resolvedTripId) return;

    const subscription = subscribeToReadReceipts(resolvedTripId, () => {
      // Read receipt updates handled via realtime
    });

    // Mark all messages from other users as read
    const markVisibleAsRead = async () => {
      // Get all message IDs from other users that need to be marked as read
      const messageIdsToMark = liveMessages
        .filter(msg => msg.user_id !== user.id)
        .map(msg => msg.id);

      if (messageIdsToMark.length > 0) {
        await markMessagesAsRead(messageIdsToMark, resolvedTripId, user.id).catch(error => {
          if (import.meta.env.DEV) {
            console.error(error);
          }
        });
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
  }, [liveMessages, user?.id, resolvedTripId, demoMode.isDemoMode]);

  const liveFormattedMessages = useMemo(() => {
    if (demoMode.isDemoMode) return [];

    // Create a map for quick message lookup for reply resolution
    const messageMap = new Map(liveMessages.map(msg => [msg.id, msg]));

    return liveMessages.map(message => {
      // Resolve replyTo context if reply_to_id exists
      let replyTo;
      if (message.reply_to_id) {
          const parentMsg = messageMap.get(message.reply_to_id);
          if (parentMsg) {
              replyTo = {
                  id: parentMsg.id,
                  text: parentMsg.content,
                  sender: parentMsg.author_name
              };
          }
      }

      return {
        id: message.id,
        text: message.content,
        sender: {
          // Prefer user_id for accurate ownership detection, fallback to author_name for display.
          // For system messages user_id may be null (by design).
          id: message.user_id || message.author_name || 'system',
          name: (() => {
            const member = tripMembers.find(m => m.id === (message.user_id || ''));
            // If member found and has a resolved profile name, use it.
            // If member not found (left trip / deleted account), prefer stored author_name snapshot.
            if (member) return member.name;
            return message.author_name || 'System';
          })(),
          // Canonical avatar comes from `profiles.avatar_url` via `useTripMembers`.
          // System messages should render without avatar in MessageItem.
          avatar: tripMembers.find(m => m.id === (message.user_id || ''))?.avatar || defaultAvatar,
          // Store original user_id separately for ownership checks
          userId: message.user_id,
        },
        createdAt: message.created_at,
        isBroadcast: message.message_type === 'broadcast',
        isPayment: message.message_type === 'payment',
        isEdited: message.is_edited || false,
        editedAt: message.edited_at,
        // Ensure system messages are never filtered out by dedupe/memoization layers
        // and can be rendered via the special system-message UI path.
        tags: message.message_type === 'system' ? (['system'] as string[]) : ([] as string[]),
        replyTo, // Pass resolved reply context
        isPinned: message.payload?.pinned === true, // Add pinned status
      };
    });
  }, [liveMessages, demoMode.isDemoMode, tripMembers]);

  // Fetch initial reactions for messages
  useEffect(() => {
    if (demoMode.isDemoMode || !user?.id || liveMessages.length === 0) return;

    const fetchReactions = async () => {
      const messageIds = liveMessages.map(m => m.id);
      try {
        const data = await getMessagesReactions(messageIds, user.id);
        const formatted: Record<
          string,
          Record<string, { count: number; userReacted: boolean }>
        > = {};
        for (const [msgId, typeMap] of Object.entries(data)) {
          formatted[msgId] = {};
          for (const [type, rData] of Object.entries(typeMap)) {
            formatted[msgId][type] = { count: rData.count, userReacted: rData.userReacted };
          }
        }
        setReactions(formatted);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[TripChat] Failed to fetch reactions:', error);
        }
      }
    };

    fetchReactions();
  }, [liveMessages.length, user?.id, demoMode.isDemoMode]);

  // Subscribe to realtime reaction changes
  useEffect(() => {
    if (demoMode.isDemoMode || !resolvedTripId || !user?.id) return;

    const messageIdSet = new Set(liveMessages.map(m => m.id));

    const channel = subscribeToReactions(resolvedTripId, payload => {
      // Only process reactions for messages we have loaded
      if (!messageIdSet.has(payload.messageId)) return;

      setReactions(prev => {
        const updated = { ...prev };
        if (!updated[payload.messageId]) {
          updated[payload.messageId] = {};
        }

        const current = updated[payload.messageId][payload.reactionType] || {
          count: 0,
          userReacted: false,
        };

        if (payload.eventType === 'INSERT') {
          updated[payload.messageId][payload.reactionType] = {
            count: current.count + 1,
            userReacted: payload.userId === user.id ? true : current.userReacted,
          };
        } else if (payload.eventType === 'DELETE') {
          updated[payload.messageId][payload.reactionType] = {
            count: Math.max(0, current.count - 1),
            userReacted: payload.userId === user.id ? false : current.userReacted,
          };
        }

        return updated;
      });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedTripId, user?.id, liveMessages, demoMode.isDemoMode]);

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
        paymentMethods: paymentData.paymentMethods || [],
      };
    }

    // Pass replyingTo ID if replying
    const message = await sendMessage({
      isBroadcast,
      isPayment,
      paymentData: transformedPaymentData,
    });

    if (!message) {
      return;
    }

    // Message send: light haptic (native-only, hard-gated).
    void hapticService.light();

    if (demoMode.isDemoMode) {
      setDemoMessages(prev => [...prev, message as MockMessage]);
      return;
    }

    const authorName = user?.displayName || user?.email?.split('@')[0] || 'You';
    try {
      // Determine message type based on flags
      const messageType = isBroadcast ? 'broadcast' : isPayment ? 'payment' : 'text';
      // Use actual privacy mode from trip config
      const effectivePrivacyMode = getEffectivePrivacyMode(privacyConfig);

      await sendTripMessage(
        message.text,
        authorName,
        undefined,
        undefined,
        user?.id,
        effectivePrivacyMode,
        messageType,
        // TODO: Pass replyingTo?.id here once useTripChat is updated
      );

      // Auto-parse message for entities (dates, times, locations)
      if (message.text && message.text.trim().length > 10) {
        try {
          await parseMessage(message.text, resolvedTripId);
        } catch (parseError) {
          if (import.meta.env.DEV) {
            console.warn('[TripChat] Message parsing failed:', parseError);
          }
        }
      }
    } catch (error) {
      setFailedMessages(prev => [
        ...prev,
        { id: `failed-${Date.now()}`, text: message.text, authorName },
      ]);
      if (import.meta.env.DEV) {
        console.error('Failed to send chat message:', error);
      }
    }
  };

  const handleRetryFailedMessage = useCallback(
    async (failedId: string) => {
      const failed = failedMessages.find(m => m.id === failedId);
      if (!failed || !user?.id) return;

      const authorName = user.displayName || user.email?.split('@')[0] || 'You';
      const effectivePrivacyMode = getEffectivePrivacyMode(privacyConfig);

      try {
        await sendTripMessage(
          failed.text,
          authorName,
          undefined,
          undefined,
          user.id,
          effectivePrivacyMode,
          'text',
        );
        setFailedMessages(prev => prev.filter(m => m.id !== failedId));
      } catch {
        // Keep in failed list; toast from useTripChat
      }
    },
    [failedMessages, user, privacyConfig, sendTripMessage],
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = async (messageId: string, reactionType: string) => {
    // Handle Pin reaction specifically
    if (reactionType === 'pin') {
      if (!user?.id) {
          toast.error("You must be logged in to pin messages");
          return;
      }

      // Check current pin status from the message object
      // We need to find the message in liveMessages or demoMessages
      const message = liveMessages.find(m => m.id === messageId) || demoMessages.find(m => m.id === messageId);
      if (!message) return;

      // In demo mode, just toggle local state
      if (demoMode.isDemoMode) {
          // Unpin any other message first
          setDemoMessages(prev => prev.map(m => {
            if (m.id === messageId) {
                // Toggle clicked message
                return { ...m, isPinned: !m.isPinned };
            } else if (m.isPinned) {
                // Unpin others
                return { ...m, isPinned: false };
            }
            return m;
          }));
          return;
      }

      const isPinned = (message as TripChatMessage).payload?.pinned === true;

      try {
          if (isPinned) {
              await unpinMessage(messageId);
              toast.success("Message unpinned");
          } else {
              // Pass tripId to enforce single pin
              await pinMessage(messageId, user.id, resolvedTripId);
              toast.success("Message pinned");
              setShowPinnedMessage(true); // Auto-show banner when pinning
          }
          // The subscription to trip_chat_messages (handled in PinnedMessageBanner)
          // or React Query invalidation should update the UI.
          // For immediate feedback in the chat stream, we might rely on the realtime subscription
          // in useTripChat which listens to UPDATE events.
      } catch (error) {
          console.error("Failed to toggle pin:", error);
          toast.error("Failed to update pin status");
      }
      return;
    }

    if (demoMode.isDemoMode || !user?.id) {
      // Demo mode: local-only reactions
      const updatedReactions = { ...reactions };
      if (!updatedReactions[messageId]) {
        updatedReactions[messageId] = {};
      }

      const currentReaction = updatedReactions[messageId][reactionType] || {
        count: 0,
        userReacted: false,
      };
      currentReaction.userReacted = !currentReaction.userReacted;
      currentReaction.count += currentReaction.userReacted ? 1 : -1;

      updatedReactions[messageId][reactionType] = currentReaction;
      setReactions(updatedReactions);
      return;
    }

    // Authenticated mode: persist to database
    // Optimistic update
    setReactions(prev => {
      const updated = { ...prev };
      if (!updated[messageId]) {
        updated[messageId] = {};
      }
      const current = updated[messageId][reactionType] || { count: 0, userReacted: false };
      const wasReacted = current.userReacted;
      updated[messageId][reactionType] = {
        count: wasReacted ? Math.max(0, current.count - 1) : current.count + 1,
        userReacted: !wasReacted,
      };
      return updated;
    });

    // Persist to database
    const result = await toggleMessageReaction(messageId, user.id, reactionType as ReactionType);
    if (result.error) {
      console.error('[TripChat] Failed to toggle reaction:', result.error);
      // Revert on failure - refetch reactions
      const messageIds = liveMessages.map(m => m.id);
      const freshReactions = await getMessagesReactions(messageIds, user.id);
      const formatted: Record<string, Record<string, { count: number; userReacted: boolean }>> = {};
      for (const [msgId, typeMap] of Object.entries(freshReactions)) {
        formatted[msgId] = {};
        for (const [type, data] of Object.entries(typeMap)) {
          formatted[msgId][type] = { count: data.count, userReacted: data.userReacted };
        }
      }
      setReactions(formatted);
    }
  };

  // Handle opening a thread
  const handleOpenThread = (messageId: string) => {
    const message =
      liveMessages.find(m => m.id === messageId) || demoMessages.find(m => m.id === messageId);
    if (!message) return;

    // For inline reply:
    const content = demoMode.isDemoMode ? (message as MockMessage).text : (message as TripChatMessage).content;
    const authorName = demoMode.isDemoMode
        ? (message as MockMessage).sender.name
        : ((message as TripChatMessage).author_name || 'User'); // Fallback

    setReply(messageId, content, authorName);
  };

  // ⚡ PERFORMANCE: Synchronous demo message loading (no unnecessary async wrapper)
  useEffect(() => {
    if (!demoMode.isDemoMode) {
      setDemoMessages([]);
      return;
    }

    // Detect if this is a Pro or Event trip
    const isProTripContext = isPro || params.proTripId;
    const isEventContext = isEvent || params.eventId;

    let demoMessagesData;

    if (isProTripContext) {
      demoMessagesData = demoModeService.getProMockMessages('pro', user?.id || 'demo-user');
    } else if (isEventContext) {
      demoMessagesData = demoModeService.getProMockMessages('event', user?.id || 'demo-user');
    } else {
      demoMessagesData = demoModeService.getMockMessages(
        'friends-trip',
        true,
        user?.id || 'demo-user',
      );
    }

    const formattedMessages = demoMessagesData.map(msg => ({
      id: msg.id,
      text: msg.message_content || '',
      sender: {
        id: msg.sender_id || msg.sender_name || msg.id,
        name: msg.sender_name || 'Unknown',
        avatar: getMockAvatar(msg.sender_name || 'Unknown'),
      },
      createdAt: new Date(Date.now() - (msg.timestamp_offset_days || 0) * 86400000).toISOString(),
      isBroadcast:
        msg.tags?.includes('broadcast') ||
        msg.tags?.includes('logistics') ||
        msg.tags?.includes('urgent') ||
        false,
      trip_type: msg.trip_type,
      sender_name: msg.sender_name,
      message_content: msg.message_content,
      delay_seconds: msg.delay_seconds,
      timestamp_offset_days: msg.timestamp_offset_days,
      tags: msg.tags,
    }));

    setDemoMessages(formattedMessages);
  }, [demoMode.isDemoMode, isPro, isEvent, params.proTripId, params.eventId, user?.id]);

  // Auto-select first channel when switching to 'channels' filter
  useEffect(() => {
    if (messageFilter === 'channels' && availableChannels.length > 0 && !activeChannel) {
      // Sort alphabetically and select first
      const sortedChannels = [...availableChannels].sort((a, b) =>
        a.channelName.localeCompare(b.channelName),
      );
      setActiveChannel(sortedChannels[0]);
    }
  }, [messageFilter, availableChannels, activeChannel, setActiveChannel]);

  // Determine which messages to show - authenticated trips show ONLY live messages
  const messagesToShow = demoMode.isDemoMode ? demoMessages : liveFormattedMessages;

  const filteredMessages = filterMessages(messagesToShow);

  const messagesWithFailed = useMemo(() => {
    if (failedMessages.length === 0) return filteredMessages;
    const failedFormatted = failedMessages.map(fm => ({
      id: fm.id,
      text: fm.text,
      sender: { id: user?.id || 'unknown', name: fm.authorName, avatar: user?.avatar },
      createdAt: new Date().toISOString(),
      status: 'failed' as const,
    }));
    return [...filteredMessages, ...failedFormatted];
  }, [filteredMessages, failedMessages, user?.id, user?.avatar]);

  const isLoading = demoMode.isDemoMode ? false : liveLoading;

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

  // Global keyboard shortcut for search (Ctrl+F or Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && messageFilter !== 'channels') {
        e.preventDefault();
        setShowSearchOverlay(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messageFilter]);

  if (isLoading) {
    return <div>Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Overlay Modal */}
      {showSearchOverlay && (
        <ChatSearchOverlay
          tripId={resolvedTripId}
          onClose={() => setShowSearchOverlay(false)}
          onResultSelect={scrollToMessage}
          isDemoMode={demoMode.isDemoMode}
          demoMessages={demoMessages}
        />
      )}

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
      <div className="flex-1 flex flex-col min-h-0" data-chat-container>
        <div
          ref={messagesContainerRef}
          className="rounded-2xl border border-white/10 bg-black/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden flex-1 flex flex-col relative min-h-0"
        >
          {/* Pinned Messages Banner */}
          {showPinnedMessage && <PinnedMessageBanner tripId={resolvedTripId} />}

          {/* Filter Tabs */}
          <MessageTypeBar
            activeFilter={messageFilter}
            onFilterChange={setMessageFilter}
            hasChannels={availableChannels.length > 0 || participantRoles.length > 0}
            onSearchClick={() => setShowSearchOverlay(true)}
            isPro={isPro}
            broadcastCount={broadcastCount}
            unreadCount={unreadCount}
            availableChannels={availableChannels}
            activeChannel={activeChannel}
            onChannelSelect={channel => {
              setActiveChannel(channel);
              setMessageFilter('channels');
            }}
            // Pass props for pin toggle
            onTogglePin={() => setShowPinnedMessage(prev => !prev)}
            isPinVisible={showPinnedMessage}
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
                  messages={messagesWithFailed as any}
                  renderMessage={(message: any) => (
                    <div data-message-id={message.id}>
                      <MessageItem
                        message={message}
                        reactions={reactions[message.id]}
                        onReaction={handleReaction}
                        onReply={handleOpenThread}
                        onEdit={demoMode.isDemoMode ? undefined : handleMessageEdit}
                        onDelete={demoMode.isDemoMode ? undefined : handleMessageDelete}
                        onRetry={handleRetryFailedMessage}
                        systemMessagePrefs={isConsumer ? systemMessagePrefs : undefined}
                      />
                    </div>
                  )}
                  onLoadMore={demoMode.isDemoMode ? () => {} : loadMoreMessages}
                  hasMore={demoMode.isDemoMode ? false : hasMore}
                  isLoading={isLoadingMore}
                  initialVisibleCount={10}
                  className="chat-scroll-container native-scroll px-3"
                  autoScroll={true}
                  restoreScroll={true}
                  scrollKey={`chat-scroll-${resolvedTripId}`}
                />
              )}

              {/* Typing Indicator */}
              {!demoMode.isDemoMode && typingUsers.length > 0 && (
                <TypingIndicator typingUsers={typingUsers} />
              )}

              {/* Reply Bar */}
              {replyingTo && (
                <div className="border-t border-white/10 bg-black/30 px-4 py-2">
                  <InlineReplyComponent
                    replyTo={{
                      id: replyingTo.id,
                      text: replyingTo.text,
                      senderName: replyingTo.senderName,
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
        <div className="chat-input-persistent w-full pb-[env(safe-area-inset-bottom)]">
          <div className="w-full">
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
              onTypingChange={isTyping => {
                if (!demoMode.isDemoMode && typingServiceRef.current) {
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

      {/* Thread View Drawer/Modal */}
      {activeThreadMessage && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center">
          <div className="w-full max-w-lg h-[70vh] md:h-[60vh] m-4 md:m-0">
            <ThreadView
              parentMessage={activeThreadMessage}
              onClose={() => setActiveThreadMessage(null)}
              tripMembers={tripMembers}
            />
          </div>
        </div>
      )}
    </div>
  );
};
