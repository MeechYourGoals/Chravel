import React, { useState, useMemo } from 'react';
import { Users, AlertTriangle, UserPlus, Clock, Cog, LayoutGrid, Network, UserCheck } from 'lucide-react';
import { ProParticipant, TeamTripContext } from '../../../types/pro';
import { ProTripCategory, getCategoryConfig } from '../../../types/proCategories';
import { TeamOnboardingBanner } from '../TeamOnboardingBanner';
import { BulkRoleAssignmentModal } from '../BulkRoleAssignmentModal';
import { QuickContactMenu } from '../QuickContactMenu';
import { RoleContactSheet } from '../RoleContactSheet';
import { extractUniqueRoles, getRoleColorClass } from '../../../utils/roleUtils';
import { Button } from '../../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { getInitials } from '../../../utils/avatarUtils';
import { useDemoMode } from '../../../hooks/useDemoMode';
import { useSuperAdmin } from '../../../hooks/useSuperAdmin';
import { useIsMobile } from '../../../hooks/use-mobile';
import { JoinRequestsDialog } from '../admin/JoinRequestsDialog';
import { RoleManagerDialog } from '../admin/RoleManagerDialog';
import { TeamOrgChart } from '../TeamOrgChart';
import { VirtualizedRosterGrid } from './VirtualizedRosterGrid';
import { TripRole } from '../../../types/roleChannels';
import { useRoleAssignments } from '../../../hooks/useRoleAssignments';
import { useTripAdmins } from '../../../hooks/useTripAdmins';
import {
  PARITY_ACTION_BUTTON_SIZE_CLASS,
  PRO_PARITY_COL_START,
  PRO_PARITY_ROW_CLASS,
} from '@/lib/tabParity';

interface RolesViewProps {
  roster: ProParticipant[];
  userRole: string;
  isReadOnly?: boolean;
  category: ProTripCategory;
  /** Callback receives memberId, roleId (for DB), and roleName (for display/local state) */
  onUpdateMemberRole?: (memberId: string, roleId: string, roleName: string) => Promise<void>;
  canManageRoles?: boolean;
  onCreateRole?: () => void;
  onAssignRole?: () => void;
  isLoadingRoles?: boolean;
  adminLoading?: boolean;
  isLoadingRoster?: boolean;
  tripId?: string;
  tripCreatorId?: string;
  trip?: TeamTripContext;
  availableRoles?: TripRole[];
}

export const RolesView = ({
  roster,
  userRole,
  isReadOnly = false,
  category,
  onUpdateMemberRole,
  canManageRoles = false,
  onCreateRole,
  onAssignRole,
  isLoadingRoles = false,
  adminLoading = false,
  isLoadingRoster = false,
  tripId,
  tripCreatorId,
  trip,
  availableRoles = [],
}: RolesViewProps) => {
  const { isDemoMode } = useDemoMode();
  const { isSuperAdmin } = useSuperAdmin();
  const isMobile = useIsMobile();
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [roleContactSheet, setRoleContactSheet] = useState<{
    role: string;
    members: ProParticipant[];
  } | null>(null);
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const [showRoleManagerDialog, setShowRoleManagerDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'orgchart'>('grid');

  // Fetch role assignments and admins to display role pills per member
  const { assignments } = useRoleAssignments({ tripId: tripId || '', enabled: !!tripId });
  const { admins } = useTripAdmins({ tripId: tripId || '', enabled: !!tripId });

  // Create a map of userId -> array of assigned role names
  const memberRolesMap = useMemo(() => {
    const map = new Map<string, string[]>();

    // Add roles from assignments
    assignments.forEach(assignment => {
      const userId = assignment.user_id;
      const roleName = assignment.role?.roleName;
      if (userId && roleName) {
        const existing = map.get(userId) || [];
        if (!existing.includes(roleName)) {
          existing.push(roleName);
        }
        map.set(userId, existing);
      }
    });

    return map;
  }, [assignments]);

  // Create a set of admin user IDs
  const adminUserIds = useMemo(() => {
    return new Set(admins.map(admin => admin.user_id));
  }, [admins]);

  // Super admins are never in read-only mode
  const effectiveIsReadOnly = isSuperAdmin ? false : isReadOnly;

  const {
    terminology: { teamLabel },
  } = getCategoryConfig(category);

  // Use dynamic roles if available, otherwise fallback to existing behavior
  const roles =
    availableRoles.length > 0
      ? ['all', ...availableRoles.map(r => r.roleName)]
      : ['all', ...extractUniqueRoles(roster)];

  const existingRoles = extractUniqueRoles(roster);

  // Check if there are unassigned roles (members with default/empty roles)
  const hasUnassignedRoles = roster.some(
    member =>
      !member.role ||
      member.role === '' ||
      member.role === 'Member' ||
      member.role === 'Participant',
  );

  // Filter roster by selected role - use actual role assignments from memberRolesMap
  const filteredRoster = useMemo(() => {
    if (selectedRole === 'all') return roster;

    return roster.filter(member => {
      const memberUserId = member.userId || member.id;
      const assignedRoles = memberUserId ? memberRolesMap.get(memberUserId) || [] : [];

      // Check if member is assigned to the selected role via user_trip_roles
      const hasAssignedRole = assignedRoles.includes(selectedRole);

      // Fallback: also check legacy member.role field for backwards compatibility
      const hasLegacyRole = member.role === selectedRole;

      return hasAssignedRole || hasLegacyRole;
    });
  }, [selectedRole, roster, memberRolesMap]);

  const handleAssignRolesClick = () => {
    // Open the role manager dialog instead of the per-member modal
    setShowRoleManagerDialog(true);
    setShowOnboarding(false);
  };

  // Super admins are always treated as admins
  const isAdmin =
    isSuperAdmin || userRole === 'admin' || userRole === 'tour manager' || userRole === 'manager';

  return (
    <div className="space-y-6">
      {/* Onboarding Banner */}
      {showOnboarding && hasUnassignedRoles && !effectiveIsReadOnly && (
        <TeamOnboardingBanner
          hasUnassignedRoles={hasUnassignedRoles}
          onAssignRoles={handleAssignRolesClick}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}

      {/* Read-only notice - Never shown for super admins */}
      {effectiveIsReadOnly && !isDemoMode && !isSuperAdmin && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-yellow-400 text-sm">Read-only access for your role</p>
        </div>
      )}

      {/* Header with Stats and Admin Indicator */}
      <div className="bg-gradient-to-br from-white/5 via-white/3 to-transparent backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 shadow-xl">
        {/* Row 1: Team Label + Stats + Admin Badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="text-red-400" size={20} />
            <h2 className="text-lg font-bold text-white">{teamLabel}</h2>
            <span className="text-gray-400 text-sm">{roster.length} members</span>
          </div>
          {(canManageRoles || isSuperAdmin) && !effectiveIsReadOnly && (
            <span className="text-xs text-gray-500">Admin Access</span>
          )}
        </div>

        {/* Row 2: Consolidated Admin Action Buttons (3 buttons) - Mobile optimized */}
        {(canManageRoles || isSuperAdmin) && !effectiveIsReadOnly && (
          <div className={`${isMobile ? 'flex flex-col gap-2' : PRO_PARITY_ROW_CLASS} mb-3`}>
            <Button
              onClick={onCreateRole}
              disabled={adminLoading || isLoadingRoles}
              variant="outline"
              size="sm"
              className={`rounded-full bg-black/40 hover:bg-black/60 hover:text-amber-400 hover:border-amber-400/50 text-white border-white/20 transition-colors ${
                isMobile
                  ? 'min-h-[44px] justify-center text-xs'
                  : `${PRO_PARITY_COL_START.media} ${PARITY_ACTION_BUTTON_SIZE_CLASS} rounded-full px-2.5 font-medium text-xs lg:text-sm`
              }`}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Create Role
            </Button>
            <Button
              onClick={() => setShowRoleManagerDialog(true)}
              variant="outline"
              size="sm"
              className={`rounded-full bg-black/40 hover:bg-black/60 hover:text-amber-400 hover:border-amber-400/50 text-white border-white/20 transition-colors ${
                isMobile
                  ? 'min-h-[44px] justify-center text-xs'
                  : `${PRO_PARITY_COL_START.payments} ${PARITY_ACTION_BUTTON_SIZE_CLASS} rounded-full px-2 font-medium text-xs lg:text-sm`
              }`}
              title="Manage roles, assignments, and admins"
            >
              <Cog className="w-4 h-4 shrink-0 mr-0.5" />
              Manage Roles
            </Button>
            {onAssignRole && (
              <Button
                onClick={onAssignRole}
                variant="outline"
                size="sm"
                className={`rounded-full bg-black/40 hover:bg-black/60 hover:text-amber-400 hover:border-amber-400/50 text-white border-white/20 transition-colors ${
                  isMobile
                    ? 'min-h-[44px] justify-center text-xs'
                    : `${PRO_PARITY_COL_START.places} ${PARITY_ACTION_BUTTON_SIZE_CLASS} rounded-full px-2.5 font-medium text-xs lg:text-sm`
                }`}
                title="Assign role to members"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Assign Role
              </Button>
            )}
            <Button
              onClick={() => setShowRequestsDialog(true)}
              variant="outline"
              size="sm"
              className={`rounded-full bg-black/40 hover:bg-black/60 hover:text-amber-400 hover:border-amber-400/50 text-white border-white/20 transition-colors ${
                isMobile
                  ? 'min-h-[44px] justify-center text-xs'
                  : `${PRO_PARITY_COL_START.places} ${PARITY_ACTION_BUTTON_SIZE_CLASS} rounded-full px-2.5 font-medium text-xs lg:text-sm`
              }`}
              title="View join requests"
            >
              <Clock className="w-4 h-4 mr-1" />
              Requests
            </Button>
          </div>
        )}

        {/* Row 3: View mode toggle (Grid vs Org Chart) + Role Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">View:</span>
            <div className="flex rounded-lg bg-white/5 border border-gray-600 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <LayoutGrid size={14} />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode('orgchart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'orgchart'
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Network size={14} />
                Org Chart
              </button>
            </div>
          </div>
        </div>

        {(availableRoles.length > 0 || existingRoles.length > 0) && (
          <div
            className={`flex ${isMobile ? 'overflow-x-auto scrollbar-hide -mx-3 px-3' : 'justify-center'}`}
          >
            <div
              className={`flex ${isMobile ? 'gap-2 min-w-max' : 'flex-wrap gap-2 justify-center items-center max-w-5xl'}`}
            >
              {roles.map(role => {
                // Count members assigned to this role from actual role assignments (memberRolesMap)
                const assignmentCount = Array.from(memberRolesMap.values()).filter(roleNames =>
                  roleNames.includes(role),
                ).length;

                // Check if this is a role from availableRoles (modern system) or legacy
                const roleFromAvailable = availableRoles.find(r => r.roleName === role);

                // Fallback: count members with legacy role field for backwards compatibility
                const legacyRoleMembers = roster.filter(m => m.role === role);

                // Use assignment count if role exists in availableRoles, otherwise use legacy count
                const memberCount = roleFromAvailable ? assignmentCount : legacyRoleMembers.length;

                // Always show 'all', and for other roles show if they exist in availableRoles or have legacy members
                const shouldShow =
                  role === 'all' ||
                  availableRoles.some(r => r.roleName === role) ||
                  legacyRoleMembers.length > 0;

                if (!shouldShow) return null;

                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      selectedRole === role
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:scale-[1.02] border border-gray-600'
                    }`}
                  >
                    {role === 'all' ? 'All' : role}
                    {role !== 'all' && (
                      <span className="ml-1 text-xs opacity-75">{memberCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual Role Input Notice for Corporate & Business */}
        {availableRoles.length === 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              Team members can have custom titles entered manually.{' '}
              {isAdmin && 'Use the "Create Role" button above to add new roles.'}
            </p>
          </div>
        )}
      </div>

      {/* Team content: Grid or Org Chart */}
      {isLoadingRoster ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white/5 border border-gray-700 rounded-lg p-3 animate-pulse"
            >
              <div className="flex gap-2.5">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'orgchart' ? (
        <TeamOrgChart
          roster={filteredRoster}
          category={category}
          onMemberClick={() => {}}
        />
      ) : filteredRoster.length > 50 ? (
        <VirtualizedRosterGrid
          members={filteredRoster}
          category={category}
          memberRolesMap={memberRolesMap}
          adminUserIds={adminUserIds}
          isMobile={isMobile}
        />
      ) : (
        <>
      <div
        className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4'}`}
      >
        {filteredRoster.map(member => {
          // Get all roles for this member: admin status + assigned roles
          // Fall back to member.id when userId is absent (e.g., demo/mock data stores user ID in id)
          const memberUserId = member.userId || member.id;
          const isAdminMember = memberUserId ? adminUserIds.has(memberUserId) : false;
          const assignedRoles = memberUserId ? memberRolesMap.get(memberUserId) || [] : [];

          // Combine roles: admin first, then assigned roles sorted alphabetically
          const allRolePills: { name: string; isAdmin: boolean }[] = [];

          // Add admin pill if applicable
          if (isAdminMember) {
            allRolePills.push({ name: 'admin', isAdmin: true });
          }

          // Add assigned roles (sorted alphabetically, case-insensitive)
          const sortedRoles = [...assignedRoles].sort((a, b) =>
            a.toLowerCase().localeCompare(b.toLowerCase()),
          );
          sortedRoles.forEach(roleName => {
            // Avoid duplicating if somehow "admin" is also an assigned role
            if (roleName.toLowerCase() !== 'admin') {
              allRolePills.push({ name: roleName, isAdmin: false });
            }
          });

          // Fallback to member.role if no assigned roles (ignore admin pill for this check)
          // Also exclude 'admin' from fallback to prevent duplicate admin pills
          const showFallbackRole =
            assignedRoles.length === 0 &&
            member.role &&
            member.role !== '' &&
            member.role !== 'Member' &&
            member.role !== 'Participant' &&
            member.role.toLowerCase() !== 'admin';

          return (
            <div
              key={member.id}
              className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-lg p-3"
            >
              <div className="flex items-start gap-2.5">
                <Avatar className="w-10 h-10 border-2 border-gray-600 flex-shrink-0">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <QuickContactMenu member={member}>
                    <h3 className="text-white text-sm font-medium truncate cursor-pointer hover:text-blue-400 transition-colors leading-tight">
                      {member.name}
                    </h3>
                  </QuickContactMenu>
                  <p className="text-gray-400 text-xs truncate leading-tight">{member.email}</p>
                  {member.phone && (
                    <p className="text-gray-500 text-xs truncate leading-tight">{member.phone}</p>
                  )}
                  {/* Role pills - admin first, then assigned roles alphabetically */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {allRolePills.map((pill, index) => (
                      <span
                        key={`${pill.name}-${index}`}
                        className={`${
                          pill.isAdmin
                            ? 'bg-blue-600/30 text-blue-300 border border-blue-500/30'
                            : getRoleColorClass(pill.name, category)
                        } px-1.5 py-0.5 rounded text-xs font-medium`}
                      >
                        {pill.name}
                      </span>
                    ))}
                    {showFallbackRole && (
                      <span
                        className={`${getRoleColorClass(member.role, category)} px-1.5 py-0.5 rounded text-xs font-medium`}
                      >
                        {member.role}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Alerts - Compact */}
              {member.medicalNotes && (
                <div className="mt-2 p-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-yellow-400 flex-shrink-0" />
                  <span className="text-yellow-400 text-xs font-medium">Medical Alert</span>
                </div>
              )}

              {/* Dietary Restrictions - Compact */}
              {member.dietaryRestrictions && member.dietaryRestrictions.length > 0 && (
                <div className="mt-1.5">
                  <p className="text-gray-400 text-xs leading-tight">
                    Dietary: {member.dietaryRestrictions.join(', ')}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredRoster.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No team members found for the selected role.</p>
        </div>
      )}
        </>
      )}

      {/* Bulk Role Assignment Modal */}
      {onUpdateMemberRole && (
        <BulkRoleAssignmentModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          roster={roster}
          category={category}
          existingRoles={existingRoles}
          availableRoles={availableRoles}
          onUpdateMemberRole={onUpdateMemberRole}
        />
      )}

      {/* Role Contact Sheet */}
      {roleContactSheet && (
        <RoleContactSheet
          isOpen={true}
          onClose={() => setRoleContactSheet(null)}
          role={roleContactSheet.role}
          members={roleContactSheet.members}
          category={category}
        />
      )}

      {/* Join Requests and Role Manager Dialogs */}
      {tripId && tripCreatorId && (
        <>
          <JoinRequestsDialog
            open={showRequestsDialog}
            onOpenChange={setShowRequestsDialog}
            tripId={tripId}
          />
          <RoleManagerDialog
            open={showRoleManagerDialog}
            onOpenChange={setShowRoleManagerDialog}
            tripId={tripId}
            tripCreatorId={tripCreatorId}
          />
        </>
      )}
    </div>
  );
};
