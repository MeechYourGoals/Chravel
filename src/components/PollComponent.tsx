import React, { useMemo } from 'react';
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

interface PollPermissions {
  canView: boolean;
  canVote: boolean;
  canCreate: boolean;
  canClose: boolean;
  canDelete: boolean;
}

interface PollComponentProps {
  tripId: string;
  showCreatePoll?: boolean;
  onShowCreatePollChange?: (show: boolean) => void;
  hideCreateButton?: boolean;
  permissions?: PollPermissions;
}

export const PollComponent = ({ 
  tripId, 
  showCreatePoll: controlledShowCreatePoll,
  onShowCreatePollChange,
  hideCreateButton = false,
  permissions
}: PollComponentProps) => {
  const { isDemoMode } = useDemoMode();
  
  // Default permissions for non-Event trips (full access)
  // In demo mode, all permissions are enabled
  const effectivePermissions: PollPermissions = isDemoMode 
    ? { canView: true, canVote: true, canCreate: true, canClose: true, canDelete: true }
    : (permissions ?? { canView: true, canVote: true, canCreate: true, canClose: true, canDelete: true });
  
  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledShowCreatePoll !== undefined && onShowCreatePollChange !== undefined;
  const [internalShowCreatePoll, setInternalShowCreatePoll] = React.useState(false);
  
  const showCreatePoll = isControlled ? controlledShowCreatePoll : internalShowCreatePoll;
  const setShowCreatePoll = isControlled ? onShowCreatePollChange : setInternalShowCreatePoll;

  const { user } = useAuth();
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
    const poll = formattedPolls.find(p => p.id === pollId);
    if (!poll) return;

    if (isPollClosedForVoting(poll)) {
      toast.error('Voting is closed for this poll');
      return;
    }

    if (!effectivePermissions.canVote) {
      toast.error('You don\'t have permission to vote');
      return;
    }
    try {
      await votePollAsync({ pollId, optionIds });
    } catch (error) {
      console.error('Failed to vote on poll:', error);
    }
  };

  const handleCreatePoll = async (question: string, options: string[], settings: PollSettings) => {
    if (!effectivePermissions.canCreate) {
      toast.error('You don\'t have permission to create polls');
      return;
    }
    try {
      await createPollAsync({ question, options, settings });
      setShowCreatePoll(false);
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    if (!effectivePermissions.canClose) {
      toast.error('You don\'t have permission to close polls');
      return;
    }
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
    if (!effectivePermissions.canDelete) {
      toast.error('You don\'t have permission to delete polls');
      return;
    }
    try {
      await deletePollAsync(pollId);
    } catch (error) {
      console.error('Failed to delete poll:', error);
    }
  };


  const isPollClosedForVoting = (poll: PollType) => {
    if (poll.status === 'closed') return true;
    if (!poll.deadline_at) return false;
    return new Date(poll.deadline_at).getTime() <= Date.now();
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

  return (
    <div className="space-y-3">
      {/* Show create button only if not hidden, user can create, and not showing form */}
      {!hideCreateButton && effectivePermissions.canCreate && !showCreatePoll && (
        <Button
          onClick={() => setShowCreatePoll(true)}
          className="w-full h-10 rounded-xl bg-gradient-to-r from-glass-enterprise-blue to-glass-enterprise-blue-light hover:from-glass-enterprise-blue-light hover:to-glass-enterprise-blue font-semibold shadow-enterprise border border-glass-enterprise-blue/50 text-white text-sm"
        >
          <BarChart3 size={18} className="mr-2" />
          Create Poll
        </Button>
      )}

      {showCreatePoll && effectivePermissions.canCreate && (
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
      ) : formattedPolls.length === 0 && !showCreatePoll ? (
        <PollsEmptyState />
      ) : (
        formattedPolls.map(poll => (
          <Poll
            key={poll.id}
            poll={poll}
            onVote={effectivePermissions.canVote ? handleVote : undefined}
            onRemoveVote={handleRemoveVote}
            onClose={effectivePermissions.canClose ? handleClosePoll : undefined}
            onDelete={effectivePermissions.canDelete ? handleDeletePoll : undefined}
            onExport={handleExportPoll}
            disabled={isPollClosedForVoting(poll) || !userId || !effectivePermissions.canVote}
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
