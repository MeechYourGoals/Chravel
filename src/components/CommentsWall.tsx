import React, { useState, useCallback } from 'react';
import { MessageCircle, BarChart3, Plus, Vote, Clock, ListChecks } from 'lucide-react';
import { Button } from './ui/button';
import { PollComponent } from './PollComponent';
import { useTripVariant } from '@/contexts/TripVariantContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './mobile/PullToRefreshIndicator';
import { useQueryClient } from '@tanstack/react-query';

interface PollPermissions {
  canView: boolean;
  canVote: boolean;
  canCreate: boolean;
  canClose: boolean;
  canDelete: boolean;
}

interface CommentsWallProps {
  tripId: string;
  permissions?: PollPermissions;
}

export const CommentsWall = ({ tripId, permissions }: CommentsWallProps) => {
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const { accentColors } = useTripVariant();
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
  }, [queryClient, tripId]);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
  });

  // Default permissions for non-Event trips (full access)
  const effectivePermissions: PollPermissions = permissions ?? {
    canView: true,
    canVote: true,
    canCreate: true,
    canClose: true,
    canDelete: true,
  };

  return (
    <div className="relative p-4 space-y-3">
      {(isRefreshing || pullDistance > 0) && (
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={80}
        />
      )}
      {/* Row 1: Header + Create Poll Button */}
      <div className="grid grid-cols-1 sm:grid-cols-8 gap-2 items-center">
        <h3 className="text-base font-semibold text-white flex items-center gap-2 sm:col-span-7">
          <MessageCircle size={18} className="text-glass-enterprise-blue" />
          Group Polls
        </h3>
        {effectivePermissions.canCreate && (
          <Button
            onClick={() => setShowCreatePoll(true)}
            className={`sm:col-span-1 w-full inline-flex items-center justify-center gap-1.5 bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-black px-3.5 py-2.5 min-h-[42px] rounded-xl font-medium text-sm transition-all duration-200 shadow-lg`}
          >
            <Plus size={14} />
            <span className="whitespace-nowrap">Create Poll</span>
          </Button>
        )}
      </div>

      {/* Row 2: Description + Feature Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-gray-400 text-sm">
          {effectivePermissions.canCreate
            ? "Create polls to get everyone's input on destinations, activities, and more."
            : 'Vote on polls to share your preferences with the group.'}
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
            <Vote size={12} className="text-gray-400" />
            <span className="text-xs text-gray-400">Group Decisions</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
            <Clock size={12} className="text-gray-400" />
            <span className="text-xs text-gray-400">Real-Time</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
            <ListChecks size={12} className="text-gray-400" />
            <span className="text-xs text-gray-400">Multiple Options</span>
          </div>
        </div>
      </div>

      {/* Row 3: Poll Content */}
      <PollComponent
        tripId={tripId}
        showCreatePoll={showCreatePoll}
        onShowCreatePollChange={setShowCreatePoll}
        hideCreateButton
        permissions={effectivePermissions}
      />
    </div>
  );
};
