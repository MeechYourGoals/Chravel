import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { rateLimiter } from '@/utils/concurrencyUtils';
import { InputValidator } from '@/utils/securityUtils';
import { processQueue } from '@/services/offlineMessageQueue';
import { offlineSyncService } from '@/services/offlineSyncService';
import { saveMessagesToCache, loadMessagesFromCache } from '@/services/chatStorage';
import { useOfflineStatus } from './useOfflineStatus';
import { sendChatMessage } from '@/services/chatService';

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
}

interface CreateMessageRequest {
  content: string;
  author_name: string;
  media_type?: string;
  media_url?: string;
  userId?: string;
  privacyMode?: string;
  messageType?: 'text' | 'broadcast' | 'payment' | 'system';
}

export const useTripChat = (tripId: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isOffline } = useOfflineStatus();
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const createClientMessageId = (): string => {
    // `client_message_id` is stored as a UUID in the DB for dedupe.
    // Prefer native UUID, with a safe fallback for environments without `crypto.randomUUID`.
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const random = Math.random().toString(16).slice(2).padEnd(12, '0').slice(0, 12);
    return `00000000-0000-4000-8000-${random}`;
  };

  // Fetch initial messages (last 10) with offline cache support
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['tripChat', tripId],
    queryFn: async (): Promise<TripChatMessage[]> => {
      if (!tripId) return [];
      // Try to load from cache first for instant display
      const cachedMessages = await loadMessagesFromCache(tripId);
      
      try {
        const { data, error } = await supabase
          .from('trip_chat_messages')
          .select('*')
          .eq('trip_id', tripId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        const reversed = (data || []).reverse();
        setHasMore(data && data.length === 10);
        
        // Cache messages for offline access
        if (data && data.length > 0) {
          await saveMessagesToCache(tripId, data);
        }
        
        return reversed as TripChatMessage[];
      } catch (err) {
        // If online fetch fails, return cached messages
        if (cachedMessages.length > 0) {
          console.warn('Using cached messages due to fetch error:', err);
          const messagesWithTimestamp = cachedMessages.slice(-10).map(msg => ({
            ...msg,
            updated_at: msg.updated_at || msg.created_at
          })) as TripChatMessage[];
          return messagesWithTimestamp;
        }
        throw err;
      }
    },
    enabled: !!tripId,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });

  // Enhanced real-time subscription with rate limiting and batching
  useEffect(() => {
    if (!tripId) return;

    let messageCount = 0;
    const maxMessagesPerMinute = 100;
    const rateLimitWindow = 60000; // 1 minute
    let windowStart = Date.now();

    console.log('[CHAT REALTIME] Subscribing to channel:', `trip_chat_${tripId}`);
    
    const channel = supabase
      .channel(`trip_chat_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_chat_messages',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          console.log('[CHAT REALTIME] INSERT received:', {
            messageId: payload.new?.id,
            author: (payload.new as any)?.author_name,
            content: (payload.new as any)?.content?.substring(0, 50),
            timestamp: new Date().toISOString()
          });
          
          const now = Date.now();
          
          // Reset rate limit window if needed
          if (now - windowStart > rateLimitWindow) {
            messageCount = 0;
            windowStart = now;
          }
          
          // Rate limit protection
          if (messageCount >= maxMessagesPerMinute) {
            console.warn('[CHAT REALTIME] Rate limit exceeded, dropping message');
            return;
          }
          
          messageCount++;
          
          // Update query data with optimistic ordering
          queryClient.setQueryData(['tripChat', tripId], (old: TripChatMessage[] = []) => {
            const newMessage = payload.new as TripChatMessage;
            
            // Prevent duplicate messages
            if (old.some(msg => msg.id === newMessage.id)) {
              console.log('[CHAT REALTIME] Duplicate message ignored:', newMessage.id);
              return old;
            }
            
            // Insert message in correct chronological order
            const newMessages = [...old, newMessage];
            console.log('[CHAT RENDER] Messages count after INSERT:', newMessages.length);
            return newMessages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trip_chat_messages',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          const updatedMessage = payload.new as TripChatMessage & { 
            is_deleted?: boolean;
            client_message_id?: string;
          };

          console.log('[CHAT REALTIME] UPDATE received:', {
            messageId: updatedMessage.id,
            clientMessageId: updatedMessage.client_message_id,
            isDeleted: updatedMessage.is_deleted,
            hasLinkPreview: !!updatedMessage.link_preview,
            timestamp: new Date().toISOString()
          });

          // If message was deleted, remove it completely from the list
          if (updatedMessage.is_deleted) {
            queryClient.setQueryData(['tripChat', tripId], (old: TripChatMessage[] = []) => {
              return old.filter(msg => msg.id !== updatedMessage.id);
            });
            return;
          }

          // Handle message edits and link_preview updates in real-time
          queryClient.setQueryData(['tripChat', tripId], (old: TripChatMessage[] = []) => {
            return old.map(msg =>
              msg.id === payload.new.id
                ? { ...msg, ...payload.new as TripChatMessage }
                : msg
            );
          });
        }
      )
      .subscribe((status) => {
        console.log('[CHAT REALTIME] Subscription status:', status);
      });

    return () => {
      console.log('[CHAT REALTIME] Unsubscribing from channel:', `trip_chat_${tripId}`);
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  // Process offline queue when connection is restored
  // Note: Global sync processor in App.tsx handles all entity types.
  // This hook-specific processing is for immediate feedback on chat messages only.
  // Operations without handlers are preserved (not deleted) to prevent data loss.
  useEffect(() => {
    if (!isOffline && tripId) {
      // Process old queue (backward compatibility)
      processQueue().then((oldResult) => {
        if (oldResult.success > 0) {
          toast({
            title: 'Messages sent',
            description: `${oldResult.success} message${oldResult.success > 1 ? 's' : ''} sent successfully`,
          });
        }
        if (oldResult.failed > 0) {
          toast({
            title: 'Some messages failed',
            description: `${oldResult.failed} message${oldResult.failed > 1 ? 's' : ''} could not be sent. Check your connection.`,
            variant: 'destructive',
          });
        }
      });

      // Note: Global sync processor will handle unified sync queue with all handlers
      // This ensures no operations are dropped due to missing handlers
    }
  }, [isOffline, tripId, toast]);

  // Create message mutation with rate limiting and offline support
  const createMessageMutation = useMutation({
    mutationFn: async (message: CreateMessageRequest) => {
      // Rate limit check - 30 messages per minute per user
      const rateLimitKey = `chat_${tripId}_${message.author_name}`;
      if (!rateLimiter.checkLimit(rateLimitKey, 30, 60000)) {
        throw new Error('Rate limit exceeded. Please slow down your messages.');
      }

      // Sanitize message content
      const sanitizedContent = InputValidator.sanitizeText(message.content);
      if (!sanitizedContent.trim()) {
        throw new Error('Message cannot be empty.');
      }

      // Validate message length
      if (sanitizedContent.length > 1000) {
        throw new Error('Message is too long. Please keep it under 1000 characters.');
      }

      const messageData = {
        trip_id: tripId,
        content: sanitizedContent,
        author_name: InputValidator.sanitizeText(message.author_name),
        user_id: message.userId,
        client_message_id: undefined as string | undefined,
        privacy_mode: message.privacyMode || 'standard',
        message_type: message.messageType || 'text',
        media_type: message.media_type,
        media_url: message.media_url
      };

      // If offline, queue the message using unified sync service
      if (isOffline) {
        // Stable client-side ID for dedupe on reconnect retries.
        const clientMessageId = createClientMessageId();
        messageData.client_message_id = clientMessageId;

        const queueId = await offlineSyncService.queueOperation(
          'chat_message',
          'create',
          tripId,
          messageData
        );
        
        // Do NOT enqueue into the legacy queue. That queue will also attempt to send and can
        // produce duplicate-key failures due to the unique `(trip_id, client_message_id)` index.
        
        toast({
          title: 'Message queued',
          description: 'Your message will be sent when connection is restored.',
        });
        
        // Cache the optimistic message locally
        const optimisticMessage: TripChatMessage = {
          id: queueId,
          ...messageData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Save to cache for immediate display
        await saveMessagesToCache(tripId, [optimisticMessage]);
        
        return optimisticMessage;
      }

      // Online - send immediately
      const data = await sendChatMessage(messageData);
      
      // Cache the new message
      await saveMessagesToCache(tripId, [data]);
      
      return data;
    },
    onError: (error: any) => {
      console.error('Message creation error:', error);
      const errorMessage = error.message || 'Failed to send message. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });

  const sendMessage = (content: string, authorName: string, mediaType?: string, mediaUrl?: string, userId?: string, privacyMode?: string, messageType?: 'text' | 'broadcast' | 'payment' | 'system') => {
    createMessageMutation.mutate({
      content,
      author_name: authorName,
      media_type: mediaType,
      media_url: mediaUrl,
      userId,
      privacyMode,
      messageType
    });
  };

  const sendMessageAsync = (content: string, authorName: string, mediaType?: string, mediaUrl?: string, userId?: string, privacyMode?: string, messageType?: 'text' | 'broadcast' | 'payment' | 'system') => {
    return createMessageMutation.mutateAsync({
      content,
      author_name: authorName,
      media_type: mediaType,
      media_url: mediaUrl,
      userId,
      privacyMode,
      messageType
    });
  };

  // Load more messages
  const loadMore = async () => {
    if (!hasMore || isLoadingMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .select('*')
        .eq('trip_id', tripId)
        .eq('is_deleted', false)
        .lt('created_at', oldestMessage.created_at)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const olderMessages = data.reverse();
        queryClient.setQueryData(['tripChat', tripId], (old: TripChatMessage[] = []) => [
          ...olderMessages,
          ...old
        ]);
        setHasMore(data.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    sendMessageAsync,
    isCreating: createMessageMutation.isPending,
    loadMore,
    hasMore,
    isLoadingMore,
  };
};