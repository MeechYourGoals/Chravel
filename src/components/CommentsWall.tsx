import React, { useState, useCallback } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { PollComponent } from './PollComponent';
import { useTripVariant } from '@/contexts/TripVariantContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './mobile/PullToRefreshIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { useDemoMode } from '@/hooks/useDemoMode';
import {
  PARITY_ACTION_BUTTON_CLASS,
  TRIP_PARITY_COL_START,
  TRIP_PARITY_HEADER_SPAN_CLASS,
  TRIP_PARITY_ROW_CLASS,
  PRO_PARITY_ROW_CLASS,
  PRO_PARITY_COL_START,
  PRO_PARITY_HEADER_SPAN_CLASS,
  EVENT_PARITY_ROW_CLASS,
  EVENT_PARITY_COL_START,
  EVENT_PARITY_HEADER_SPAN_CLASS,
} from '@/lib/tabParity';

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
  const { variant, accentColors } = useTripVariant();
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId, isDemoMode] });
  }, [isDemoMode, queryClient, tripId]);

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
      <div
        className={`flex items-center justify-between sm:grid gap-2 ${
          variant === 'pro' ? 'sm:grid-cols-9' : variant === 'events' ? 'sm:grid-cols-8' : 'sm:grid-cols-8'
        }`}
      >
        <h3
          className={`text-base font-semibold text-white flex items-center gap-2 ${variant === 'pro' ? PRO_PARITY_HEADER_SPAN_CLASS : variant === 'events' ? EVENT_PARITY_HEADER_SPAN_CLASS : TRIP_PARITY_HEADER_SPAN_CLASS}`}
        >
          <MessageCircle size={18} className="text-glass-enterprise-blue" />
          Group Polls
        </h3>
        {effectivePermissions.canCreate && (
          <Button
            onClick={() => setShowCreatePoll(true)}
            className={`${variant === 'pro' ? PRO_PARITY_COL_START.team : variant === 'events' ? EVENT_PARITY_COL_START.tasks : TRIP_PARITY_COL_START.tasks} ${PARITY_ACTION_BUTTON_CLASS} flex items-center justify-center gap-1.5 bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-black shadow-lg w-auto sm:w-full min-w-0 sm:min-w-[110px] p-3 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl`}
          >
            <Plus className="w-5 h-5 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap text-sm hidden sm:inline">New Poll</span>
          </Button>
        )}
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
