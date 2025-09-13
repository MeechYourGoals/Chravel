import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { rateLimiter } from '@/utils/concurrencyUtils';
import { InputValidator } from '@/utils/securityUtils';

interface TripChatMessage {
  id: string;
  trip_id: string;
  content: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  media_type?: string;
  media_url?: string;
  sentiment?: string;
  link_preview?: any;
  privacy_mode?: string;
  privacy_encrypted?: boolean;
}

interface CreateMessageRequest {
  content: string;
  author_name: string;
  media_type?: string;
  media_url?: string;
}

export const useTripChat = (tripId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch messages from database
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ['tripChat', tripId],
    queryFn: async (): Promise<TripChatMessage[]> => {
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!tripId
  });

  // Enhanced real-time subscription with rate limiting and batching
  useEffect(() => {
    if (!tripId) return;

    let messageCount = 0;
    const maxMessagesPerMinute = 100;
    const rateLimitWindow = 60000; // 1 minute
    let windowStart = Date.now();

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
          const now = Date.now();
          
          // Reset rate limit window if needed
          if (now - windowStart > rateLimitWindow) {
            messageCount = 0;
            windowStart = now;
          }
          
          // Rate limit protection
          if (messageCount >= maxMessagesPerMinute) {
            console.warn('Message rate limit exceeded, dropping message');
            return;
          }
          
          messageCount++;
          
          // Update query data with optimistic ordering
          queryClient.setQueryData(['tripChat', tripId], (old: TripChatMessage[] = []) => {
            const newMessage = payload.new as TripChatMessage;
            
            // Prevent duplicate messages
            if (old.some(msg => msg.id === newMessage.id)) {
              return old;
            }
            
            // Insert message in correct chronological order
            const newMessages = [...old, newMessage];
            return newMessages.sort((a, b) => 
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  // Create message mutation with rate limiting
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

      const { data, error } = await supabase
        .from('trip_chat_messages')
        .insert({
          trip_id: tripId,
          content: sanitizedContent,
          author_name: InputValidator.sanitizeText(message.author_name),
          media_type: message.media_type,
          media_url: message.media_url
        })
        .select()
        .single();

      if (error) throw error;
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

  const sendMessage = (content: string, authorName: string, mediaType?: string, mediaUrl?: string) => {
    createMessageMutation.mutate({
      content,
      author_name: authorName,
      media_type: mediaType,
      media_url: mediaUrl
    });
  };

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    isCreating: createMessageMutation.isPending
  };
};