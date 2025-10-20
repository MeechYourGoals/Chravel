import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelService } from '../services/channelService';
import { ChannelWithStats, CreateChannelRequest, UpdateChannelRequest } from '../types/channels';

export const useChannels = (tripId: string) => {
  const queryClient = useQueryClient();

  // Get channels
  const {
    data: channels,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['channels', tripId],
    queryFn: async () => {
      try {
        return await channelService.getChannels(tripId);
      } catch (error) {
        console.error('Failed to load channels:', error);
        return []; // Return empty array on error to prevent app crash
      }
    },
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on error to prevent infinite loops
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: (request: CreateChannelRequest) => channelService.createChannel(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: ({ channelId, updates }: { channelId: string; updates: UpdateChannelRequest }) =>
      channelService.updateChannel(channelId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Archive channel mutation
  const archiveChannelMutation = useMutation({
    mutationFn: (channelId: string) => channelService.archiveChannel(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: ({ channelId, userIds }: { channelId: string; userIds: string[] }) =>
      channelService.addMembers(channelId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ channelId, userId }: { channelId: string; userId: string }) =>
      channelService.removeMember(channelId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Create default role channels
  const createDefaultChannelsMutation = useMutation({
    mutationFn: () => channelService.createDefaultRoleChannels(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  return {
    channels: channels || [],
    isLoading,
    error,
    refetch,
    createChannel: createChannelMutation.mutateAsync,
    updateChannel: updateChannelMutation.mutateAsync,
    archiveChannel: archiveChannelMutation.mutateAsync,
    addMembers: addMembersMutation.mutateAsync,
    removeMember: removeMemberMutation.mutateAsync,
    createDefaultChannels: createDefaultChannelsMutation.mutateAsync,
    isCreating: createChannelMutation.isPending,
    isUpdating: updateChannelMutation.isPending,
    isArchiving: archiveChannelMutation.isPending,
    isAddingMembers: addMembersMutation.isPending,
    isRemovingMember: removeMemberMutation.isPending,
    isCreatingDefault: createDefaultChannelsMutation.isPending,
  };
};

export const useChannelMessages = (channelId: string) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Load initial messages (last 10)
  const loadMessages = async () => {
    try {
      setLoading(true);
      const msgs = await channelService.getChannelMessages(channelId, 10);
      setMessages(msgs);
      setHasMore(msgs.length === 10);
    } catch (error) {
      console.error('Failed to load channel messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      loadMessages();
      
      // Poll for new messages every 5 seconds
      const interval = setInterval(loadMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [channelId]);

  const sendMessage = async (content: string, tripId: string) => {
    try {
      setSending(true);
      await channelService.sendMessage({
        trip_id: tripId,
        channel_id: channelId,
        content,
      });
      await loadMessages(); // Refresh messages
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    } finally {
      setSending(false);
    }
  };

  // Load more messages
  const loadMore = async () => {
    if (!hasMore || isLoadingMore || messages.length === 0) return;

    setIsLoadingMore(true);
    try {
      const oldestMessage = messages[0];
      const olderMessages = await channelService.getChannelMessages(channelId, 20, oldestMessage.created_at);
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
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refresh: loadMessages,
    loadMore,
    hasMore,
    isLoadingMore,
  };
};
