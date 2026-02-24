import React, { useState, useCallback } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import { PollComponent } from './PollComponent';
import { ActionPill } from './ui/ActionPill';
import { useTripVariant } from '@/contexts/TripVariantContext';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './mobile/PullToRefreshIndicator';
import { useQueryClient } from '@tanstack/react-query';
import { useDemoMode } from '@/hooks/useDemoMode';
import {
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
  const { variant } = useTripVariant();
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

  // Determine responsive breakpoints based on variant parity
  const isMdVariant = variant === 'pro' || variant === 'events';

  const gridClass = isMdVariant ? 'md:grid' : 'sm:grid';
  const gridColsClass =
    variant === 'pro'
      ? 'md:grid-cols-9'
      : variant === 'events'
        ? 'md:grid-cols-8'
        : 'sm:grid-cols-8';

  const headerSpanClass =
    variant === 'pro'
      ? PRO_PARITY_HEADER_SPAN_CLASS
      : variant === 'events'
        ? EVENT_PARITY_HEADER_SPAN_CLASS
        : TRIP_PARITY_HEADER_SPAN_CLASS;

  const buttonColStartClass =
    variant === 'pro'
      ? PRO_PARITY_COL_START.team
      : variant === 'events'
        ? EVENT_PARITY_COL_START.tasks
        : TRIP_PARITY_COL_START.tasks;

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
      <div className={`flex items-center justify-between gap-2 ${gridClass} ${gridColsClass}`}>
        <h3
          className={`text-base font-semibold text-white flex items-center gap-2 ${headerSpanClass}`}
        >
          <MessageCircle size={18} className="text-glass-enterprise-blue" />
          Group Polls
        </h3>
        {effectivePermissions.canCreate && (
          <ActionPill
            variant="manualOutline"
            leftIcon={<Plus />}
            iconOnly
            onClick={() => setShowCreatePoll(true)}
            className={`${buttonColStartClass} w-full`}
          />
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
