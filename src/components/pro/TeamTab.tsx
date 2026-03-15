import React, { useState, useCallback } from 'react';
import { ProParticipant, TeamTripContext } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { RolesView } from './team/RolesView';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '../mobile/PullToRefreshIndicator';
import { CreateRoleDialog } from './admin/CreateRoleDialog';
import { useProTripAdmin } from '@/hooks/useProTripAdmin';
import { useTripRoles } from '@/hooks/useTripRoles';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface TeamTabProps {
  roster: ProParticipant[];
  userRole: string;
  isReadOnly?: boolean;
  category: ProTripCategory;
  tripId?: string;
  /** Callback receives memberId, roleId (for DB), and roleName (for display/local state) */
  onUpdateMemberRole?: (memberId: string, roleId: string, roleName: string) => Promise<void>;
  trip?: TeamTripContext;
  tripCreatorId?: string;
  /** Show loading skeleton when roster is being fetched */
  isLoadingRoster?: boolean;
}

export const TeamTab = ({
  roster,
  userRole,
  isReadOnly = false,
  category,
  tripId,
  onUpdateMemberRole,
  trip,
  tripCreatorId,
  isLoadingRoster = false,
}: TeamTabProps) => {
  const { isAdmin, hasPermission, isLoading: adminLoading } = useProTripAdmin(tripId || '');
  const { isDemoMode } = useDemoMode();
  const { isSuperAdmin } = useSuperAdmin();
  const {
    roles,
    isLoading: isLoadingRoles,
    refetch: refetchRoles,
  } = useTripRoles({ tripId: tripId || '', enabled: !!tripId });
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  // Super admins never have read-only restrictions
  const effectiveIsReadOnly = isSuperAdmin ? false : isReadOnly;

  const handleRefresh = useCallback(async () => {
    await refetchRoles();
  }, [refetchRoles]);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
  });

  const handleRoleCreated = () => {
    refetchRoles();
  };

  // Super admins always have full role management capabilities
  const canManageRoles =
    isSuperAdmin || (isAdmin && hasPermission('can_manage_roles')) || isDemoMode;

  return (
    <div className="relative space-y-6 w-full">
      {(isRefreshing || pullDistance > 0) && (
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={80}
        />
      )}
      {/* Roles View */}
      <RolesView
        roster={roster}
        isLoadingRoster={isLoadingRoster}
        userRole={isSuperAdmin ? 'admin' : userRole}
        isReadOnly={effectiveIsReadOnly}
        category={category}
        onUpdateMemberRole={onUpdateMemberRole}
        canManageRoles={canManageRoles}
        onCreateRole={() => setCreateRoleOpen(true)}
        isLoadingRoles={isLoadingRoles}
        adminLoading={adminLoading}
        tripId={tripId}
        tripCreatorId={tripCreatorId}
        trip={trip}
        availableRoles={roles}
      />

      {/* Dialogs */}
      {tripId && (
        <>
          <CreateRoleDialog
            open={createRoleOpen}
            onOpenChange={setCreateRoleOpen}
            tripId={tripId}
            currentRoleCount={roles.length}
            onRoleCreated={handleRoleCreated}
          />
        </>
      )}
    </div>
  );
};
