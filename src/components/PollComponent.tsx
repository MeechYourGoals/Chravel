import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Poll as PollType } from './poll/types';
import { Poll } from './poll/Poll';
import { CreatePollForm } from './poll/CreatePollForm';
import { useTripPolls } from '@/hooks/useTripPolls';
import { useAuth } from '@/hooks/useAuth';

interface PollComponentProps {
  tripId: string;
}

export const PollComponent = ({ tripId }: PollComponentProps) => {
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const { user } = useAuth();
  const {
    polls,
    isLoading,
    createPollAsync,
    votePollAsync,
    isCreatingPoll,
    isVoting
  } = useTripPolls(tripId);

  const userId = user?.id;

  const formattedPolls: PollType[] = useMemo(() => {
    return polls.map(poll => {
      const userVoteOption = poll.options.find(option => option.voters?.includes(userId || ''));
      return {
        id: poll.id,
        question: poll.question,
        options: poll.options.map(option => ({
          id: option.id,
          text: option.text,
          votes: option.votes,
          voters: option.voters
        })),
        totalVotes: poll.total_votes,
        userVote: userVoteOption?.id,
        status: poll.status,
        createdAt: poll.created_at
      };
    });
  }, [polls, userId]);

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      await votePollAsync({ pollId, optionId });
    } catch (error) {
      console.error('Failed to vote on poll:', error);
    }
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    try {
      await createPollAsync({ question, options });
      setShowCreatePoll(false);
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
  };

  return (
    <div className="space-y-6">
      {!showCreatePoll && (
        <Button
          onClick={() => setShowCreatePoll(true)}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-glass-enterprise-blue to-glass-enterprise-blue-light hover:from-glass-enterprise-blue-light hover:to-glass-enterprise-blue font-semibold shadow-enterprise border border-glass-enterprise-blue/50 text-white"
        >
          <BarChart3 size={20} className="mr-2" />
          Create Poll
        </Button>
      )}

      {showCreatePoll && (
        <CreatePollForm
          onCreatePoll={handleCreatePoll}
          onCancel={() => setShowCreatePoll(false)}
          isSubmitting={isCreatingPoll}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : formattedPolls.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No polls have been created yet.
        </div>
      ) : (
        formattedPolls.map(poll => (
          <Poll
            key={poll.id}
            poll={poll}
            onVote={handleVote}
            disabled={poll.status === 'closed' || !userId}
            isVoting={isVoting}
          />
        ))
      )}
    </div>
  );
};
