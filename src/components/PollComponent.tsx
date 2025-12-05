import React, { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from './ui/button';
import { Poll as PollType } from './poll/types';
import { Poll } from './poll/Poll';
import { CreatePollForm, PollSettings } from './poll/CreatePollForm';
import { PollsEmptyState } from './polls/PollsEmptyState';
import { useTripPolls } from '@/hooks/useTripPolls';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';

interface PollComponentProps {
  tripId: string;
}

export const PollComponent = ({ tripId }: PollComponentProps) => {
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const {
    polls,
    isLoading,
    createPollAsync,
    votePollAsync,
    removeVote,
    closePollAsync,
    deletePollAsync,
    isCreatingPoll,
    isVoting,
    isRemovingVote,
    isClosing,
    isDeleting
  } = useTripPolls(tripId);

  const userId = user?.id;

  const formattedPolls: PollType[] = useMemo(() => {
    return polls.map(poll => {
      const userVoteOptions = poll.options.filter(option => option.voters?.includes(userId || ''));
      const userVote = poll.allow_multiple
        ? userVoteOptions.map(opt => opt.id)
        : userVoteOptions[0]?.id;
        
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
        userVote,
        status: poll.status,
        createdAt: poll.created_at,
        createdBy: poll.created_by,
        allow_multiple: poll.allow_multiple,
        is_anonymous: poll.is_anonymous,
        allow_vote_change: poll.allow_vote_change,
        deadline_at: poll.deadline_at,
        closed_at: poll.closed_at,
        closed_by: poll.closed_by
      };
    });
  }, [polls, userId]);

  const handleVote = async (pollId: string, optionIds: string | string[]) => {
    try {
      await votePollAsync({ pollId, optionIds });
    } catch (error) {
      console.error('Failed to vote on poll:', error);
    }
  };

  const handleCreatePoll = async (question: string, options: string[], settings: PollSettings) => {
    try {
      await createPollAsync({ question, options, settings });
      setShowCreatePoll(false);
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      await closePollAsync({ pollId });
    } catch (error) {
      console.error('Failed to close poll:', error);
    }
  };

  const handleRemoveVote = (pollId: string) => {
    removeVote({ pollId });
  };

  const handleDeletePoll = async (pollId: string) => {
    try {
      await deletePollAsync(pollId);
    } catch (error) {
      console.error('Failed to delete poll:', error);
    }
  };

  const handleExportPoll = (pollId: string) => {
    const poll = formattedPolls.find(p => p.id === pollId);
    if (!poll) return;

    // Create CSV content
    const csvLines = [
      ['Poll Question', poll.question],
      ['Total Votes', poll.totalVotes.toString()],
      ['Status', poll.status],
      [],
      ['Option', 'Votes', 'Percentage', ...(poll.is_anonymous ? [] : ['Voters'])]
    ];

    poll.options.forEach(option => {
      const percentage = poll.totalVotes > 0 ? ((option.votes / poll.totalVotes) * 100).toFixed(1) : '0';
      const row = [
        option.text,
        option.votes.toString(),
        `${percentage}%`,
        ...(poll.is_anonymous ? [] : [option.voters?.join(', ') || ''])
      ];
      csvLines.push(row);
    });

    const csvContent = csvLines.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `poll-${pollId}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Poll exported', {
      description: 'Results saved as CSV file.'
    });
  };

  // Show empty state if no polls and not in demo mode
  if (!isLoading && formattedPolls.length === 0 && !showCreatePoll && !isDemoMode) {
    return (
      <div className="space-y-3 mobile-safe-scroll">
        <PollsEmptyState onCreatePoll={() => setShowCreatePoll(true)} />
        {showCreatePoll && (
          <CreatePollForm
            onCreatePoll={handleCreatePoll}
            onCancel={() => setShowCreatePoll(false)}
            isSubmitting={isCreatingPoll}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 mobile-safe-scroll">
      {!showCreatePoll && (
        <Button
          onClick={() => setShowCreatePoll(true)}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-glass-enterprise-blue to-glass-enterprise-blue-light hover:from-glass-enterprise-blue-light hover:to-glass-enterprise-blue font-semibold shadow-enterprise border border-glass-enterprise-blue/50 text-white text-sm"
        >
          <BarChart3 size={18} className="mr-2" />
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
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      ) : formattedPolls.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No polls have been created yet.
        </div>
      ) : (
        formattedPolls.map(poll => (
          <Poll
            key={poll.id}
            poll={poll}
            onVote={handleVote}
            onRemoveVote={handleRemoveVote}
            onClose={handleClosePoll}
            onDelete={handleDeletePoll}
            onExport={handleExportPoll}
            disabled={poll.status === 'closed' || !userId}
            isVoting={isVoting}
            isRemovingVote={isRemovingVote}
            isClosing={isClosing}
            isDeleting={isDeleting}
          />
        ))
      )}
    </div>
  );
};
