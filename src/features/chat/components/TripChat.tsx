/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'sonner';
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
import {
  markMessagesAsRead,
  subscribeToReadReceipts,
  getMessagesReadStatus,
} from '@/services/readReceiptService';
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
} from '@/services/chatService';
import { ThreadView } from './ThreadView';
import { useTripPrivacyConfig, getEffectivePrivacyMode } from '@/hooks/useTripPrivacyConfig';
import { useTripChatMode } from '@/hooks/useTripChatMode';
import { useLinkPreviews } from '../hooks/useLinkPreviews';

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
}

export const TripChat = React.memo(
  ({
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
      Record<string, Record<string, { count: number; userReacted: boolean; users: string[] }>>
    >({});

    const [readStatusesByMessage, setReadStatusesByMessage] = useState<Record<string, any[]>>({});
    const [_activeChannelId, _setActiveChannelId] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);
    const typingServiceRef = useRef<TypingIndicatorService | null>(null);
    const [showSearchOverlay, setShowSearchOverlay] = useState(false);
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
      Array<{
        id: string;
        text: string;
        authorName: string;
        messageType?: 'text' | 'broadcast' | 'payment' | 'system';
      }>
    >([]);

    const { isOffline } = useOfflineStatus();
    const params = useParams<{ tripId?: string; proTripId?: string; eventId?: string }>();
    const resolvedTripId = useMemo(() => {
      return tripIdProp || params.tripId || params.proTripId || params.eventId || '';
    }, [tripIdProp, params.tripId, params.proTripId, params.eventId]);

    const demoMode = useDemoMode();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Chat mode enforcement — UI layer (server-side RLS is authoritative)
    const {
      effectiveChatMode,
      canPost: canPostToChat,
      canUploadMedia,
      isLoading: chatModeLoading,
      userRole: chatModeUserRole,
    } = useTripChatMode(demoMode.isDemoMode ? undefined : resolvedTripId, user?.id);

    const isUserAdmin =
      chatModeUserRole === 'admin' ||
      chatModeUserRole === 'organizer' ||
      chatModeUserRole === 'owner';

    // Optimistic cache updates for edit/delete (MessageActions does the API call)
    const handleMessageEdit = useCallback(
      (messageId: string, newContent: string) => {
        if (demoMode.isDemoMode || !resolvedTripId) return;
        queryClient.setQueryData(['tripChat', resolvedTripId], (old: TripChatMessage[] = []) =>
          old.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  content: newContent,
                  is_edited: true,
                  edited_at: new Date().toISOString(),
                }
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

    const reactionUserNamesById = useMemo(
      () => Object.fromEntries(tripMembers.map(member => [member.id, member.name])),
      [tripMembers],
    );

    const participantRoles = useMemo(() => {
      if (!isPro) return [];
      return [...new Set(participants.map(p => p.role).filter(Boolean))];
    }, [isPro, participants]);

    // Initialize role channels hook for Pro/Enterprise trips
    const {
      availableChannels,
      activeChannel,
      messages: _channelMessages,
      setActiveChannel,
      sendMessage: _sendChannelMessage,
    } = useRoleChannels(resolvedTripId, userRole, participantRoles);

    // Mobile-specific hooks
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const _containerRef = useRef<HTMLDivElement>(null);

    // Handle keyboard visibility for better UX
    const { isKeyboardVisible: _isKeyboardVisible } = useKeyboardHandler({
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
    const { broadcastCount, messageUnreadCount } = useUnreadCounts({
      tripId: resolvedTripId,
      messages: liveMessages,
      userId: user?.id || null,
      enabled: !demoMode.isDemoMode && !!user?.id,
    });

    // Initialize typing indicators — disabled for restricted chat modes or large groups
    const shouldEnableTyping =
      !demoMode.isDemoMode &&
      !!user?.id &&
      !!resolvedTripId &&
      effectiveChatMode === 'everyone' &&
      tripMembers.length <= 50;

    useEffect(() => {
      if (!shouldEnableTyping) return;

      const userName = user?.displayName || user?.email?.split('@')[0] || 'You';
      typingServiceRef.current = new TypingIndicatorService(resolvedTripId, user!.id, userName);

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
    }, [shouldEnableTyping, resolvedTripId, user?.id, user?.displayName, user?.email]);

    // Refs for incremental read receipt tracking (declared before effects that use them)
    const markedMessageIdsRef = useRef<Set<string>>(new Set());
    const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track own message IDs so the read receipt subscription accepts receipts for them
    const ownMessageIdsRef = useRef<Set<string>>(new Set());

    // Keep ownMessageIdsRef in sync with liveMessages so the read receipt
    // subscription can accept receipts for freshly sent own messages.
    useEffect(() => {
      if (!user?.id) return;
      ownMessageIdsRef.current = new Set(
        liveMessages.filter(msg => msg.user_id === user.id).map(msg => msg.id),
      );
    }, [liveMessages, user?.id]);

    // Realtime subscription for read receipts (stable — does NOT depend on liveMessages).
    // NOTE: message_read_receipts has no trip_id column, so the Supabase realtime
    // subscription receives ALL inserts globally. We filter client-side below using
    // readStatusesByMessage keys (only own-message IDs are displayed). At Stage B,
    // consider adding trip_id to message_read_receipts for server-side filtering.
    useEffect(() => {
      if (demoMode.isDemoMode || !user?.id || !resolvedTripId) return;

      const subscription = subscribeToReadReceipts(resolvedTripId, newStatus => {
        setReadStatusesByMessage(prev => {
          const msgId = newStatus.message_id;
          // Only track receipts for messages we already know about.
          // Accept if: already in state, OR we marked it as read, OR it's our own message.
          // This prevents accumulating state for unrelated trips.
          if (
            !prev[msgId] &&
            !markedMessageIdsRef.current.has(msgId) &&
            !ownMessageIdsRef.current.has(msgId)
          )
            return prev;
          const currentStatuses = prev[msgId] || [];
          if (currentStatuses.some((s: any) => s.user_id === newStatus.user_id)) {
            return prev;
          }
          return {
            ...prev,
            [msgId]: [...currentStatuses, newStatus],
          };
        });
      });

      return () => {
        supabase.removeChannel(subscription).catch(error => {
          if (import.meta.env.DEV) {
            console.error(error);
          }
        });
      };
    }, [user?.id, resolvedTripId, demoMode.isDemoMode]);

    // Mark NEW messages as read (debounced, incremental — not all messages every time).
    // Uses markedMessageIdsRef to track already-marked IDs so we never re-mark the same message.
    // The 1s debounce batches rapid incoming messages into a single upsert call.
    useEffect(() => {
      if (demoMode.isDemoMode || !user?.id || !resolvedTripId || liveMessages.length === 0) return;

      const newUnmarkedIds = liveMessages
        .filter(msg => msg.user_id !== user.id && !markedMessageIdsRef.current.has(msg.id))
        .map(msg => msg.id);

      if (newUnmarkedIds.length === 0) return;

      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
      markReadTimerRef.current = setTimeout(async () => {
        try {
          await markMessagesAsRead(newUnmarkedIds, resolvedTripId, user.id);
          newUnmarkedIds.forEach(id => markedMessageIdsRef.current.add(id));
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error(error);
          }
        }
      }, 1000);

      return () => {
        if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
      };
    }, [liveMessages, user?.id, resolvedTripId, demoMode.isDemoMode]);

    // Fetch read statuses for own messages (only when own message count changes)
    const ownMessageCountRef = useRef(0);
    useEffect(() => {
      if (demoMode.isDemoMode || !user?.id || liveMessages.length === 0) return;

      const ownMessages = liveMessages.filter(msg => msg.user_id === user.id);
      if (ownMessages.length === ownMessageCountRef.current) return;
      ownMessageCountRef.current = ownMessages.length;

      const ownMessageIds = ownMessages.map(msg => msg.id);
      if (ownMessageIds.length === 0) return;

      getMessagesReadStatus(ownMessageIds)
        .then(statuses => setReadStatusesByMessage(prev => ({ ...prev, ...statuses })))
        .catch(e => {
          if (import.meta.env.DEV) {
            console.error('Failed to fetch read statuses', e);
          }
        });
    }, [liveMessages, user?.id, demoMode.isDemoMode]);

    const liveFormattedMessages = useMemo(() => {
      if (demoMode.isDemoMode) return [];

      // Create a map for quick message lookup for reply resolution
      const messageMap = new Map(liveMessages.map(msg => [msg.id, msg]));

      return liveMessages.map(message => {
        // Resolve replyTo context if reply_to_id exists
        let replyTo;
        if ((message as any).reply_to_id) {
          const parentMsg = messageMap.get((message as any).reply_to_id);
          if (parentMsg) {
            replyTo = {
              id: parentMsg.id,
              text: parentMsg.content,
              sender: parentMsg.author_name,
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
            avatar:
              tripMembers.find(m => m.id === (message.user_id || ''))?.avatar || defaultAvatar,
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
          linkPreview: message.link_preview,
          replyTo, // Pass resolved reply context
        };
      });
    }, [liveMessages, demoMode.isDemoMode, tripMembers]);

    // Fetch reactions for messages whose reactions haven't been loaded yet.
    // Handles both initial load and pagination (loadMore adds older messages).
    // Realtime subscription below handles incremental INSERT/DELETE for new reactions.
    const reactionsFetchedIdsRef = useRef<Set<string>>(new Set());
    useEffect(() => {
      if (demoMode.isDemoMode || !user?.id || liveMessages.length === 0) return;

      // Only fetch for messages we haven't fetched reactions for yet
      const unfetchedIds = liveMessages
        .map(m => m.id)
        .filter(id => !reactionsFetchedIdsRef.current.has(id));

      if (unfetchedIds.length === 0) return;

      const fetchReactions = async () => {
        try {
          const data = await getMessagesReactions(unfetchedIds, user.id);
          // Mark as fetched before updating state
          unfetchedIds.forEach(id => reactionsFetchedIdsRef.current.add(id));
          const formatted: Record<
            string,
            Record<string, { count: number; userReacted: boolean; users: string[] }>
          > = {};
          for (const [msgId, typeMap] of Object.entries(data)) {
            formatted[msgId] = {};
            for (const [type, rData] of Object.entries(typeMap)) {
              formatted[msgId][type] = {
                count: rData.count,
                userReacted: rData.userReacted,
                users: rData.users || [],
              };
            }
          }
          // Merge with existing reactions (don't replace — preserves data for
          // already-loaded messages and any realtime updates that arrived since)
          setReactions(prev => ({ ...prev, ...formatted }));
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
            users: [],
          };

          if (payload.eventType === 'INSERT') {
            updated[payload.messageId][payload.reactionType] = {
              count: current.count + 1,
              userReacted: payload.userId === user.id ? true : current.userReacted,
              users: current.users.includes(payload.userId)
                ? current.users
                : [...current.users, payload.userId],
            };
          } else if (payload.eventType === 'DELETE') {
            updated[payload.messageId][payload.reactionType] = {
              count: Math.max(0, current.count - 1),
              userReacted: payload.userId === user.id ? false : current.userReacted,
              users: current.users.filter(id => id !== payload.userId),
            };
          }

          return updated;
        });
      });

      return () => {
        supabase.removeChannel(channel);
      };
    }, [resolvedTripId, user?.id, liveMessages, demoMode.isDemoMode]);

    const handleSendMessage = async (
      isBroadcast = false,
      isPayment = false,
      paymentData?: any,
      _linkPreview?: any,
      mentionedUserIds?: string[],
    ) => {
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
      const messageType = isBroadcast ? 'broadcast' : isPayment ? 'payment' : 'text';
      try {
        // Use actual privacy mode from trip config
        const effectivePrivacyMode = getEffectivePrivacyMode(privacyConfig);

        await sendTripMessage(
          message.text,
          authorName,
          undefined,
          undefined,
          user?.id,
          effectivePrivacyMode,
          messageType as 'text' | 'broadcast' | 'payment' | 'system',
          replyingTo?.id,
          mentionedUserIds,
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
        const errorMsg = error instanceof Error ? error.message : 'Failed to send message';
        setFailedMessages(prev => [
          ...prev,
          {
            id: `failed-${Date.now()}`,
            text: message.text,
            authorName,
            messageType: messageType as 'text' | 'broadcast' | 'payment' | 'system',
          },
        ]);
        toast.error(isBroadcast ? 'Broadcast failed to send' : 'Message failed to send', {
          description: errorMsg,
        });
        if (import.meta.env.DEV) {
          console.error('[TripChat] Failed to send message:', error);
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
            failed.messageType || 'text',
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
      if (demoMode.isDemoMode || !user?.id) {
        // Demo mode: local-only reactions
        const updatedReactions = { ...reactions };
        if (!updatedReactions[messageId]) {
          updatedReactions[messageId] = {};
        }

        const currentReaction = updatedReactions[messageId][reactionType] || {
          count: 0,
          userReacted: false,
          users: [],
        };
        currentReaction.userReacted = !currentReaction.userReacted;
        currentReaction.count += currentReaction.userReacted ? 1 : -1;
        if (user?.id) {
          currentReaction.users = currentReaction.userReacted
            ? Array.from(new Set([...currentReaction.users, user.id]))
            : currentReaction.users.filter(id => id !== user.id);
        }

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
        const current = updated[messageId][reactionType] || {
          count: 0,
          userReacted: false,
          users: [],
        };
        const wasReacted = current.userReacted;
        updated[messageId][reactionType] = {
          count: wasReacted ? Math.max(0, current.count - 1) : current.count + 1,
          userReacted: !wasReacted,
          users: wasReacted
            ? current.users.filter(id => id !== user.id)
            : Array.from(new Set([...current.users, user.id])),
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
        const formatted: Record<
          string,
          Record<string, { count: number; userReacted: boolean; users: string[] }>
        > = {};
        for (const [msgId, typeMap] of Object.entries(freshReactions)) {
          formatted[msgId] = {};
          for (const [type, data] of Object.entries(typeMap)) {
            formatted[msgId][type] = {
              count: data.count,
              userReacted: data.userReacted,
              users: data.users || [],
            };
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
      const content = demoMode.isDemoMode
        ? (message as MockMessage).text
        : (message as TripChatMessage).content;
      const authorName = demoMode.isDemoMode
        ? (message as MockMessage).sender.name
        : (message as TripChatMessage).author_name || 'User'; // Fallback

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
        linkPreview: undefined as undefined,
      }));
      return [...filteredMessages, ...failedFormatted];
    }, [filteredMessages, failedMessages, user?.id, user?.avatar]);

    const linkPreviewFallbacks = useLinkPreviews(
      messagesWithFailed.map(message => ({
        id: message.id,
        text: message.text || '',
        linkPreview: message.linkPreview,
      })),
    );

    const messagesWithPreviewFallbacks = useMemo(
      () =>
        messagesWithFailed.map(message => ({
          ...message,
          linkPreview: message.linkPreview || linkPreviewFallbacks[message.id],
        })),
      [messagesWithFailed, linkPreviewFallbacks],
    );

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
            {/* Filter Tabs */}
            <MessageTypeBar
              activeFilter={messageFilter}
              onFilterChange={setMessageFilter}
              hasChannels={availableChannels.length > 0 || participantRoles.length > 0}
              onSearchClick={() => setShowSearchOverlay(true)}
              isPro={isPro}
              broadcastCount={broadcastCount}
              unreadCount={messageUnreadCount}
              availableChannels={availableChannels}
              activeChannel={activeChannel}
              onChannelSelect={channel => {
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
                    messages={messagesWithPreviewFallbacks as any}
                    renderMessage={(message: any, _index: number, showSenderInfo: boolean) => (
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
                          tripMembers={tripMembers}
                          readStatuses={readStatusesByMessage[message.id]}
                          showSenderInfo={showSenderInfo}
                          reactionUserNamesById={reactionUserNamesById}
                          isAdmin={isUserAdmin}
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

        {/* Persistent Chat Input - Hidden when in Channels mode or user cannot post */}
        {messageFilter !== 'channels' && canPostToChat && (
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
                disableFileUpload={!canUploadMedia}
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

        {/* Chat mode restriction banner */}
        {messageFilter !== 'channels' && !canPostToChat && !chatModeLoading && (
          <div className="w-full border-t border-white/10 bg-black/40 px-4 py-3 text-center">
            <p className="text-sm text-white/60">
              {effectiveChatMode === 'broadcasts'
                ? 'This chat is in announcements-only mode. Only admins can post.'
                : effectiveChatMode === 'admin_only'
                  ? 'This chat is in admin-only mode. Only admins can post.'
                  : 'You do not have permission to post in this chat.'}
            </p>
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
  },
);
