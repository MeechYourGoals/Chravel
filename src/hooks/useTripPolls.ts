import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useDemoMode } from './useDemoMode';
import { mockPolls } from '@/mockData/polls';
import { pollStorageService } from '@/services/pollStorageService';
import { getStorageItem, setStorageItem } from '@/platform/storage';
import { offlineSyncService } from '@/services/offlineSyncService';
import { cacheEntity, getCachedEntities } from '@/offline/cache';
import * as haptics from '@/native/haptics';

interface TripPoll {
  id: string;
  trip_id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  status: 'active' | 'closed';
  created_by: string;
  created_at: string;
  updated_at: string;
  allow_multiple?: boolean;
  is_anonymous?: boolean;
  allow_vote_change?: boolean;
  deadline_at?: string;
  closed_at?: string;
  closed_by?: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
  voters: string[];
}

interface CreatePollRequest {
  question: string;
  options: string[];
  settings?: {
    allow_multiple?: boolean;
    is_anonymous?: boolean;
    allow_vote_change?: boolean;
    deadline_at?: string;
  };
}

interface VotePollRequest {
  pollId: string;
  optionIds: string | string[];
}

interface ClosePollRequest {
  pollId: string;
}

interface MockPollVotes {
  [pollId: string]: {
    optionIds: string[];
    votedAt: string;
  };
}

// Helper to get mock poll votes from storage
const getMockPollVotes = async (tripId: string): Promise<MockPollVotes> => {
  return await getStorageItem<MockPollVotes>(`mock_poll_votes_${tripId}`, {});
};

// Helper to save mock poll votes to storage
const saveMockPollVotes = async (tripId: string, votes: MockPollVotes): Promise<void> => {
  await setStorageItem(`mock_poll_votes_${tripId}`, votes);
};

export const useTripPolls = (tripId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  // Fetch polls from database or localStorage
  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['tripPolls', tripId],
    staleTime: 60 * 1000, // 1 minute - polls are stable
    gcTime: 5 * 60 * 1000, // Keep in cache 5 min for instant tab switching
    queryFn: async (): Promise<TripPoll[]> => {
      if (isDemoMode) {
        // Get storage polls (user-created in demo mode)
        const storagePolls = await pollStorageService.getPolls(tripId);

        // Get mock poll votes from storage
        const mockVotes = await getMockPollVotes(tripId);

        // Get mock polls (pre-defined demo data) and apply stored votes
        const formattedMockPolls = mockPolls.filter(p => p.trip_id === tripId).map(poll => {
          const userVotes = mockVotes[poll.id];
          
          // Calculate votes including user's stored votes
          const options = poll.options.map(opt => {
            const baseVotes = opt.voteCount;
            const hasUserVote = userVotes?.optionIds?.includes(opt.id);
            
            return {
              id: opt.id,
              text: opt.text,
              votes: hasUserVote ? baseVotes + 1 : baseVotes,
              voters: hasUserVote ? [...opt.voters, 'demo-user'] : opt.voters
            };
          });

          const totalVotes = userVotes 
            ? poll.total_votes + userVotes.optionIds.length 
            : poll.total_votes;

          return {
            id: poll.id,
            trip_id: poll.trip_id,
            question: poll.question,
            options,
            total_votes: totalVotes,
            status: poll.status as 'active' | 'closed',
            created_by: poll.created_by,
            created_at: poll.created_at,
            updated_at: poll.updated_at,
            allow_multiple: (poll as any).allow_multiple ?? false,
            is_anonymous: (poll as any).is_anonymous ?? false,
            allow_vote_change: (poll as any).allow_vote_change ?? true
          };
        });

        // Merge storage polls with mock polls (storage polls first, as they're newer)
        return [...storagePolls, ...formattedMockPolls];
      }

      // Offline-first: read cached polls for fallback.
      const cachedEntities = await getCachedEntities({ tripId, entityType: 'trip_polls' });
      const cachedPolls = cachedEntities
        .map(c => c.data as TripPoll)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (navigator.onLine === false && cachedPolls.length > 0) {
        return cachedPolls;
      }

      const { data, error } = await supabase
        .from('trip_polls')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) {
        // If fetch fails, return cached polls if available.
        if (cachedPolls.length > 0) return cachedPolls;
        throw error;
      }

      // Transform the data to handle JSON types
      const transformed = (data || []).map(poll => ({
        ...poll,
        options: Array.isArray(poll.options) ? (poll.options as any[]).filter(o => o && typeof o === 'object') as PollOption[] : [],
        status: poll.status as 'active' | 'closed'
      }));

      // Cache polls for offline access (best-effort)
      await Promise.all(
        transformed.map(p =>
          cacheEntity({
            entityType: 'trip_polls',
            entityId: p.id,
            tripId,
            data: p,
            version: (p as any).version ?? undefined,
          }),
        ),
      );

      return transformed;
    },
    enabled: !!tripId,
    // Ensure we reconcile server state after connectivity is restored.
    refetchOnReconnect: true,
  });

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async (poll: CreatePollRequest) => {
      if (isDemoMode) {
        return await pollStorageService.createPoll(tripId, poll);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const pollOptions = poll.options.map((text, index) => ({
        id: `option_${index}`,
        text,
        votes: 0,
        voters: []
      }));

      const { data, error } = await supabase
        .from('trip_polls')
        .insert({
          trip_id: tripId,
          question: poll.question,
          options: pollOptions,
          total_votes: 0,
          status: 'active',
          created_by: user.id,
          allow_multiple: poll.settings?.allow_multiple || false,
          is_anonymous: poll.settings?.is_anonymous || false,
          allow_vote_change: poll.settings?.allow_vote_change !== false,
          deadline_at: poll.settings?.deadline_at || null
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
      toast({
        title: 'Poll created',
        description: 'Your poll has been added to the trip.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create poll. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Vote on poll mutation
  const votePollMutation = useMutation({
    mutationFn: async ({ pollId, optionIds }: VotePollRequest) => {
      const optionIdsArray = Array.isArray(optionIds) ? optionIds : [optionIds];

      if (isDemoMode) {
        // First try localStorage (user-created polls)
        const result = await pollStorageService.voteOnPoll(tripId, pollId, optionIdsArray);
        
        if (result) {
          return { pollId, optionIds: optionIdsArray };
        }
        
        // If not found in localStorage, this is a mock poll - store vote separately
        const mockVotes = await getMockPollVotes(tripId);
        mockVotes[pollId] = {
          optionIds: optionIdsArray,
          votedAt: new Date().toISOString()
        };
        await saveMockPollVotes(tripId, mockVotes);
        
        return { pollId, optionIds: optionIdsArray };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Offline: queue vote for replay on reconnect.
      if (navigator.onLine === false) {
        await offlineSyncService.queueOperation(
          'poll_vote',
          'create',
          tripId,
          { optionIds: optionIdsArray },
          pollId,
        );

        throw new Error('OFFLINE: Vote queued for sync when connection is restored.');
      }

      const { data: poll, error: fetchError } = await supabase
        .from('trip_polls')
        .select('version, allow_multiple, allow_vote_change')
        .eq('id', pollId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching poll:', fetchError);
        throw fetchError;
      }
      
      if (!poll) {
        throw new Error('Poll not found');
      }

      for (const optionId of optionIdsArray) {
        const { error } = await supabase
          .rpc('vote_on_poll', {
            p_poll_id: pollId,
            p_option_id: optionId,
            p_user_id: user.id,
            p_current_version: poll.version ?? null
          });

        if (error) {
          console.error('Vote RPC error:', error);
          if (error.message?.includes('modified by another user')) {
            toast({
              title: 'Poll Updated',
              description: 'This poll was updated by someone else. Refreshing...',
            });
            await queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
            throw error;
          }
          throw error;
        }
      }

      return { pollId, optionIds: optionIdsArray };
    },
    onMutate: async ({ pollId, optionIds }) => {
      const optionIdsArray = Array.isArray(optionIds) ? optionIds : [optionIds];

      await queryClient.cancelQueries({ queryKey: ['tripPolls', tripId] });
      const previous = queryClient.getQueryData<TripPoll[]>(['tripPolls', tripId]);

      // Minimal optimistic update: increment selected option vote counts + total.
      queryClient.setQueryData<TripPoll[]>(['tripPolls', tripId], old => {
        if (!old) return old;
        return old.map(p => {
          if (p.id !== pollId) return p;
          const nextOptions = p.options.map(opt => {
            if (!optionIdsArray.includes(opt.id)) return opt;
            return {
              ...opt,
              votes: (opt.votes ?? 0) + 1,
            };
          });
          return {
            ...p,
            options: nextOptions,
            total_votes: (p.total_votes ?? 0) + optionIdsArray.length,
          };
        });
      });

      // Persist the optimistic update into the offline snapshot so refetches while offline
      // cannot overwrite the optimistic state with stale IndexedDB data.
      try {
        const next = queryClient.getQueryData<TripPoll[]>(['tripPolls', tripId]);
        const updatedPoll = next?.find(p => p.id === pollId);
        if (updatedPoll) {
          void cacheEntity({
            entityType: 'trip_polls',
            entityId: updatedPoll.id,
            tripId,
            data: updatedPoll,
            version: (updatedPoll as any).version ?? undefined,
          });
        }
      } catch {
        // Best-effort only; UI state is already updated in React Query cache.
      }

      return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
      void haptics.medium();
      toast({
        title: 'Vote recorded',
        description: 'Your vote has been saved.'
      });
    },
    onError: (error: any, vars, context) => {
      // Keep optimistic update when offline (queued).
      if (!error?.message?.includes('OFFLINE:') && context?.previous) {
        queryClient.setQueryData(['tripPolls', tripId], context.previous);

        // Also rollback the offline snapshot if we applied an optimistic write.
        const previousPoll = context.previous.find(p => p.id === vars.pollId);
        if (previousPoll) {
          void cacheEntity({
            entityType: 'trip_polls',
            entityId: previousPoll.id,
            tripId,
            data: previousPoll,
            version: (previousPoll as any).version ?? undefined,
          });
        }
      }

      if (error?.message?.includes('OFFLINE:')) {
        toast({
          title: 'Vote queued',
          description: "We'll sync your vote when you're back online.",
        });
        return;
      }

      if (!error.message?.includes('modified by another user')) {
        toast({
          title: 'Error',
          description: 'Failed to record vote. Please try again.',
          variant: 'destructive'
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
    },
  });

  // Remove vote mutation
  const removeVoteMutation = useMutation({
    mutationFn: async ({ pollId }: { pollId: string }) => {
      if (isDemoMode) {
        // First try localStorage (user-created polls)
        const result = await pollStorageService.removeVote(tripId, pollId);
        
        if (result) {
          return { pollId };
        }
        
        // If not found in localStorage, this is a mock poll - remove from mock votes
        const mockVotes = await getMockPollVotes(tripId);
        if (mockVotes[pollId]) {
          delete mockVotes[pollId];
          await saveMockPollVotes(tripId, mockVotes);
        }
        
        return { pollId };
      }

      // Authenticated mode - use database function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .rpc('remove_vote_from_poll', {
          p_poll_id: pollId,
          p_user_id: user.id
        });

      if (error) {
        console.error('Remove vote RPC error:', error);
        throw error;
      }

      return { pollId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
      toast({
        title: 'Vote removed',
        description: 'Your vote has been removed.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove vote. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Close poll mutation
  const closePollMutation = useMutation({
    mutationFn: async ({ pollId }: ClosePollRequest) => {
      if (isDemoMode) {
        return await pollStorageService.closePoll(tripId, pollId);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('trip_polls')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closed_by: user.id
        })
        .eq('id', pollId)
        .eq('created_by', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
      void haptics.success();
      toast({
        title: 'Poll closed',
        description: 'No more votes will be accepted.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to close poll. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Delete poll mutation - only creator can delete
  const deletePollMutation = useMutation({
    mutationFn: async (pollId: string) => {
      if (isDemoMode) {
        const success = await pollStorageService.deletePoll(tripId, pollId);
        if (!success) throw new Error('Failed to delete poll');
        return pollId;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('trip_polls')
        .delete()
        .eq('id', pollId)
        .eq('created_by', user.id); // Only creator can delete

      if (error) throw error;
      return pollId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
      toast({
        title: 'Poll deleted',
        description: 'The poll has been removed.'
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete poll. Only the creator can delete.',
        variant: 'destructive'
      });
    }
  });

  return {
    polls,
    isLoading,
    createPoll: createPollMutation.mutate,
    createPollAsync: createPollMutation.mutateAsync,
    votePoll: votePollMutation.mutate,
    votePollAsync: votePollMutation.mutateAsync,
    removeVote: removeVoteMutation.mutate,
    removeVoteAsync: removeVoteMutation.mutateAsync,
    closePoll: closePollMutation.mutate,
    closePollAsync: closePollMutation.mutateAsync,
    deletePoll: deletePollMutation.mutate,
    deletePollAsync: deletePollMutation.mutateAsync,
    isCreatingPoll: createPollMutation.isPending,
    isVoting: votePollMutation.isPending,
    isRemovingVote: removeVoteMutation.isPending,
    isClosing: closePollMutation.isPending,
    isDeleting: deletePollMutation.isPending
  };
};
