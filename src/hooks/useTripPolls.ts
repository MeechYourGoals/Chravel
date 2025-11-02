import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useDemoMode } from './useDemoMode';
import { mockPolls } from '@/mockData/polls';
import { pollStorageService } from '@/services/pollStorageService';

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
}

interface VotePollRequest {
  pollId: string;
  optionId: string;
}

export const useTripPolls = (tripId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  // Fetch polls from database or localStorage
  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['tripPolls', tripId],
    queryFn: async (): Promise<TripPoll[]> => {
      if (isDemoMode) {
        // Get storage polls (user-created in demo mode)
        const storagePolls = await pollStorageService.getPolls(tripId);

        // Get mock polls (pre-defined demo data)
        const formattedMockPolls = mockPolls.filter(p => p.trip_id === tripId).map(poll => ({
          id: poll.id,
          trip_id: poll.trip_id,
          question: poll.question,
          options: poll.options.map(opt => ({
            id: opt.id,
            text: opt.text,
            votes: opt.voteCount,
            voters: opt.voters
          })),
          total_votes: poll.total_votes,
          status: poll.status as 'active' | 'closed',
          created_by: poll.created_by,
          created_at: poll.created_at,
          updated_at: poll.updated_at
        }));

        // Merge storage polls with mock polls (storage polls first, as they're newer)
        return [...storagePolls, ...formattedMockPolls];
      }

      const { data, error } = await supabase
        .from('trip_polls')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to handle JSON types
      return (data || []).map(poll => ({
        ...poll,
        options: Array.isArray(poll.options) ? (poll.options as any[]).filter(o => o && typeof o === 'object') as PollOption[] : [],
        status: poll.status as 'active' | 'closed'
      }));
    },
    enabled: !!tripId
  });

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async (poll: CreatePollRequest) => {
      // Handle demo mode - use local storage
      if (isDemoMode) {
        return await pollStorageService.createPoll(tripId, poll);
      }

      // Handle authenticated mode - use database
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
          created_by: user.id
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
    mutationFn: async ({ pollId, optionId }: VotePollRequest) => {
      // Handle demo mode - use local storage
      if (isDemoMode) {
        await pollStorageService.voteOnPoll(tripId, pollId, optionId);
        return { pollId, optionId };
      }

      // Handle authenticated mode - use database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get current poll version for optimistic locking
      const { data: poll, error: fetchError } = await supabase
        .from('trip_polls')
        .select('version')
        .eq('id', pollId)
        .single();

      if (fetchError) throw fetchError;

      // Use atomic function to vote on poll with optimistic locking
      const { error } = await supabase
        .rpc('vote_on_poll', {
          p_poll_id: pollId,
          p_option_id: optionId,
          p_user_id: user.id,
          p_current_version: poll.version
        });

      if (error) throw error;
      return { pollId, optionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to record vote. Please try again.',
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
    isCreatingPoll: createPollMutation.isPending,
    isVoting: votePollMutation.isPending
  };
};