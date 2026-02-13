import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventChannelService } from '../services/eventChannelService';
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
        const baseChannels = await eventChannelService.getChannels(tripId);

        // Fetch member counts for all channels from channel_members
        const channelIds = baseChannels.map(ch => ch.id);
        let memberCountMap = new Map<string, number>();
        if (channelIds.length > 0) {
          const { data: memberData } = await import('../integrations/supabase/client').then(
            m => m.supabase
              .from('channel_members')
              .select('channel_id')
              .in('channel_id', channelIds)
          );
          if (memberData) {
            const counts = new Map<string, number>();
            (memberData as Array<{ channel_id: string }>).forEach(row => {
              counts.set(row.channel_id, (counts.get(row.channel_id) || 0) + 1);
            });
            memberCountMap = counts;
          }
        }

        // Add ChannelWithStats properties with real member counts
        return baseChannels.map(ch => {
          const count = memberCountMap.get(ch.id) || 0;
          return {
            ...ch,
            stats: { channel_id: ch.id, member_count: count, message_count: 0 },
            member_count: count,
            is_unread: false
          };
        }) as ChannelWithStats[];
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
    mutationFn: (request: CreateChannelRequest) => eventChannelService.createChannel(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Update channel mutation
  const updateChannelMutation = useMutation({
    mutationFn: ({ channelId, updates }: { channelId: string; updates: UpdateChannelRequest }) =>
      eventChannelService.updateChannel(channelId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Archive channel mutation
  const archiveChannelMutation = useMutation({
    mutationFn: (channelId: string) => eventChannelService.archiveChannel(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Add members mutation
  const addMembersMutation = useMutation({
    mutationFn: ({ channelId, userIds }: { channelId: string; userIds: string[] }) =>
      eventChannelService.addMembers(channelId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: ({ channelId, userId }: { channelId: string; userId: string }) =>
      eventChannelService.removeMember(channelId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', tripId] });
    },
  });

  // Create default role channels
  const createDefaultChannelsMutation = useMutation({
    mutationFn: () => eventChannelService.createDefaultRoleChannels(tripId),
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
      const msgs = await eventChannelService.getChannelMessages(channelId, 10);
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
      await eventChannelService.sendMessage({
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
      const olderMessages = await eventChannelService.getChannelMessages(channelId, 20, oldestMessage.created_at);
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
