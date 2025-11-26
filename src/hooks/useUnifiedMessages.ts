import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedMessagingService, Message, SendMessageOptions } from '@/services/unifiedMessagingService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { saveMessagesToCache, loadMessagesFromCache } from '@/services/chatStorage';

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
        const unsubscribe = await unifiedMessagingService.subscribeToTrip(
          tripId,
          (message) => {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === message.id)) return prev;
              return [...prev, message];
            });
          }
        );

        unsubscribeRef.current = unsubscribe;
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize messaging:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to connect to messaging service',
          variant: 'destructive'
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

  // Send message
  const sendMessage = useCallback(async (content: string, privacyMode?: string) => {
    if (!user) {
      toast({
        title: 'Not Authenticated',
        description: 'Please sign in to send messages',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    const userName = user.email?.split('@')[0] || 'Unknown User';
    
    // Create optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
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
      deleted_at: undefined
    };
    
    // Add to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const message = await unifiedMessagingService.sendMessage({
        content,
        tripId,
        userName,
        userId: user.id,
        privacyMode: privacyMode || 'standard'
      });
      
      // Replace optimistic with server response
      setMessages(prev => 
        prev.map(m => m.id === optimisticId ? message : m)
      );
      
      // Update cache with new message
      await saveMessagesToCache(tripId, [message as any]);
    } catch (error) {
      console.error('Failed to send message:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        tripId,
        userId: user.id
      });
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticId));
      
      toast({
        title: 'Send Failed',
        description: 'Failed to send message',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [user, tripId, toast]);

  // Load more messages
  const loadMore = useCallback(async () => {
    if (messages.length === 0 || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const olderMessages = await unifiedMessagingService.getMessages(
        tripId, 
        20, 
        new Date(oldestMessage.created_at)
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
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      await unifiedMessagingService.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete message',
        variant: 'destructive'
      });
    }
  }, [toast]);

  return {
    messages,
    isLoading,
    isSending,
    sendMessage,
    loadMore,
    deleteMessage,
    isConnected: true,
    hasMore,
    isLoadingMore,
  };
}
