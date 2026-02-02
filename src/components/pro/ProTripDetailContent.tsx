import React, { useState, useCallback } from 'react';
import { RoomAssignmentsModal } from './RoomAssignmentsModal';
import { ProTabNavigation } from './ProTabNavigation';
import { ProTabContent } from './ProTabContent';
import { getVisibleTabs } from './ProTabsConfig';
import { useAuth } from '../../hooks/useAuth';
import { useRoleAssignments } from '../../hooks/useRoleAssignments';
import { useTripRoles } from '../../hooks/useTripRoles';
import { toast } from 'sonner';

import { ProTripData } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';

interface ProTripDetailContentProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onShowTripsPlusModal: () => void;
  tripId: string;
  basecamp: { name: string; address: string };
  tripData: ProTripData;
  selectedCategory: ProTripCategory;
  onUpdateTripData?: (updates: Partial<ProTripData>) => void;
  trip?: any;
  tripCreatorId?: string;
}

export const ProTripDetailContent = ({
  activeTab,
  onTabChange,
  onShowTripsPlusModal,
  tripId,
  basecamp,
  tripData,
  selectedCategory,
  onUpdateTripData,
  trip,
  tripCreatorId,
}: ProTripDetailContentProps) => {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const { user } = useAuth();

  // Hooks for role assignment persistence
  const { assignRole, isProcessing: isAssigningRole } = useRoleAssignments({
    tripId,
    enabled: !!tripId,
  });
  const { roles, refetch: refetchRoles } = useTripRoles({ tripId, enabled: !!tripId });

  const userRole = user?.proRole || 'staff';
  const userPermissions = user?.permissions || ['read'];

  const visibleTabs = getVisibleTabs(userRole, userPermissions, selectedCategory);

  const handleUpdateRoomAssignments = (assignments: any[]) => {
    // In a real app, this would update the trip data
  };

  /**
   * Handle role assignment for a member.
   * This function:
   * 1. Looks up the role ID from the role name (or creates a role if needed)
   * 2. Persists the assignment to the database via useRoleAssignments
   * 3. Updates local state optimistically
   */
  const handleUpdateMemberRole = useCallback(
    async (memberId: string, newRole: string) => {
      if (!tripId) {
        console.error('Cannot assign role: tripId is missing');
        throw new Error('Trip ID is required');
      }

      try {
        // Look up the role ID from the role name
        const roleRecord = roles.find(r => r.roleName === newRole);

        if (!roleRecord) {
          // Role doesn't exist in trip_roles - this is a custom role that wasn't created first
          toast.error(
            `Role "${newRole}" doesn't exist. Please create the role first using "Create Role".`,
          );
          throw new Error(`Role "${newRole}" not found. Create it first.`);
        }

        // Find the user_id for this member from the roster
        // The memberId might be the roster participant ID or user_id
        const member = tripData.roster?.find(m => m.id === memberId);
        if (!member) {
          console.error('Member not found in roster:', memberId);
          throw new Error('Member not found');
        }

        // Get the actual user_id - roster may have it stored as 'id' or 'userId'
        const userId = (member as any).userId || member.id;

        // Persist the role assignment to the database
        await assignRole(userId, roleRecord.id);

        // Refetch roles to update member counts
        await refetchRoles();

        // Update local state optimistically for immediate UI feedback
        const updatedRoster =
          tripData.roster?.map(m => (m.id === memberId ? { ...m, role: newRole } : m)) || [];

        if (onUpdateTripData) {
          onUpdateTripData({ roster: updatedRoster });
        }
      } catch (error) {
        console.error('Failed to update member role:', error);
        throw error;
      }
    },
    [tripId, roles, tripData.roster, assignRole, refetchRoles, onUpdateTripData],
  );

  return (
    <>
      {/* Category-Specific Tab Navigation */}
      <ProTabNavigation
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={onTabChange}
        category={selectedCategory}
      />

      {/* Tab Content */}
      <ProTabContent
        activeTab={activeTab}
        tripId={tripId}
        basecamp={basecamp}
        tripData={tripData}
        category={selectedCategory}
        onUpdateRoomAssignments={handleUpdateRoomAssignments}
        onUpdateMemberRole={handleUpdateMemberRole}
        trip={trip}
        tripCreatorId={tripCreatorId}
      />

      {/* Room Assignments Modal */}
      <RoomAssignmentsModal
        isOpen={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        roomAssignments={tripData.roomAssignments || []}
        roster={tripData.roster || []}
        onUpdateAssignments={handleUpdateRoomAssignments}
      />
    </>
  );
};
