import { useState, useEffect, useCallback, useRef } from 'react';
import {
  unifiedMessagingService,
  Message,
  SendMessageOptions,
} from '@/services/unifiedMessagingService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { saveMessagesToCache, loadMessagesFromCache } from '@/services/chatStorage';
import { resolveDisplayName } from '@/lib/resolveDisplayName';

interface UseUnifiedMessagesOptions {
  tripId: string;
  enabled?: boolean;
}

export function useUnifiedMessages({ tripId, enabled = true }: UseUnifiedMessagesOptions) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [user, setUser] = useState<{
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // Initialize messaging
  useEffect(() => {
    if (!enabled || !user || !tripId) return;

    const initMessaging = async () => {
      try {
        // Load from cache first for instant display
        const cachedMessages = await loadMessagesFromCache(tripId);
        if (cachedMessages.length > 0) {
          setMessages(cachedMessages as any);
          setIsLoading(false);
        }

        // Load initial messages from server (last 10)
        const initialMessages = await unifiedMessagingService.getMessages(tripId, 10);
        setMessages(initialMessages);
        setHasMore(initialMessages.length === 10);

        // Cache the fresh messages
        await saveMessagesToCache(tripId, initialMessages as any);

        // Subscribe to real-time updates
        const unsubscribe = await unifiedMessagingService.subscribeToTrip(tripId, message => {
          setMessages(prev => {
            if (message.is_deleted) {
              return prev.filter(m => m.id !== message.id);
            }
            const existing = prev.find(m => m.id === message.id);
            if (existing) {
              return prev.map(m => (m.id === message.id ? message : m));
            }
            return [...prev, message];
          });
        });

        unsubscribeRef.current = unsubscribe;
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize messaging:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to messaging service',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    initMessaging();

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [enabled, user, tripId, toast]);

  // Send message with enhanced error handling
  const sendMessage = useCallback(
    async (content: string, privacyMode?: string) => {
      if (!user) {
        toast({
          title: 'Not Authenticated',
          description: 'Please sign in to send messages',
          variant: 'destructive',
        });
        return;
      }

      setIsSending(true);

      // Resolve display name from profile (snapshot at send time)
      let userName = user.email?.split('@')[0] || 'Anonymous';
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, first_name, last_name')
          .eq('user_id', user.id)
          .single();
        userName = resolveDisplayName(profile, userName);
      } catch {
        // Profile lookup failed; use email-derived fallback
      }

      // Create optimistic message with status tracking
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticMessage: Message & {
        status?: 'sending' | 'sent' | 'failed';
        originalContent?: string;
      } = {
        id: optimisticId,
        trip_id: tripId,
        content,
        author_name: userName,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        privacy_mode: privacyMode || 'standard',
        is_deleted: false,
        is_edited: false,
        attachments: [],
        media_type: null,
        media_url: null,
        reply_to_id: undefined,
        thread_id: undefined,
        link_preview: null,
        privacy_encrypted: false,
        edited_at: undefined,
        deleted_at: undefined,
        status: 'sending',
        originalContent: content,
      };

      // Add to UI immediately
      setMessages(prev => [...prev, optimisticMessage]);

      try {
        const message = await unifiedMessagingService.sendMessage({
          content,
          tripId,
          userName,
          userId: user.id,
          privacyMode: privacyMode || 'standard',
        });

        // Replace optimistic with server response (mark as sent)
        setMessages(prev =>
          prev.map(m => (m.id === optimisticId ? { ...message, status: 'sent' as const } : m)),
        );

        // Update cache with new message
        await saveMessagesToCache(tripId, [message as any]);
      } catch (error) {
        const errorCode = (error as any)?.code;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        console.error('Failed to send message:', {
          error: errorMessage,
          errorCode,
          errorDetails: (error as any)?.details,
          tripId,
          userId: user.id,
        });

        // Mark message as failed instead of removing it (allows retry)
        setMessages(prev =>
          prev.map(m => (m.id === optimisticId ? { ...m, status: 'failed' as const } : m)),
        );

        // Specific error handling with actionable messages
        let userErrorMessage = 'Failed to send message. Tap to retry.';
        if (errorCode === '42501') {
          userErrorMessage = 'You may not have permission to send messages in this trip.';
        } else if (errorCode === 'PGRST301') {
          userErrorMessage = 'Connection lost. Please refresh the page.';
        } else if (error instanceof TypeError && errorMessage.includes('fetch')) {
          userErrorMessage = 'Network error. Please check your connection and try again.';
        } else if (errorCode === '23503') {
          userErrorMessage = 'You must be a trip member to send messages.';
        }

        toast({
          title: 'Send Failed',
          description: userErrorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsSending(false);
      }
    },
    [user, tripId, toast],
  );

  // Retry failed message
  const retrySendMessage = useCallback(
    async (failedMessageId: string) => {
      const failedMessage = messages.find(
        m => m.id === failedMessageId && (m as any).status === 'failed',
      );
      if (!failedMessage || !user) return;

      // Remove the failed message and resend
      setMessages(prev => prev.filter(m => m.id !== failedMessageId));

      // Resend with original content
      await sendMessage(failedMessage.content, failedMessage.privacy_mode);
    },
    [messages, user, sendMessage],
  );

  // Load more messages
  const loadMore = useCallback(async () => {
    if (messages.length === 0 || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const olderMessages = await unifiedMessagingService.getMessages(
        tripId,
        20,
        new Date(oldestMessage.created_at),
      );
      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
        setHasMore(olderMessages.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [tripId, messages, hasMore, isLoadingMore]);

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      try {
        await unifiedMessagingService.deleteMessage(messageId);
        setMessages(prev => prev.filter(m => m.id !== messageId));
      } catch (error) {
        console.error('Failed to delete message:', error);
        toast({
          title: 'Delete Failed',
          description: 'Failed to delete message',
          variant: 'destructive',
        });
      }
    },
    [toast],
  );

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    loadMore,
    deleteMessage,
    retrySendMessage,
    isConnected: true,
    hasMore,
    isLoadingMore,
  };
}
