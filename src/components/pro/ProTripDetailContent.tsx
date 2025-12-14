
import React, { useState } from 'react';
import { RoomAssignmentsModal } from './RoomAssignmentsModal';
import { ProTabNavigation } from './ProTabNavigation';
import { ProTabContent } from './ProTabContent';
import { RoleSwitcher } from './RoleSwitcher';
import { getVisibleTabs } from './ProTabsConfig';
import { useAuth } from '../../hooks/useAuth';
import { useDemoMode } from '../../hooks/useDemoMode';
import { supabase } from '../../integrations/supabase/client';

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
  tripCreatorId
}: ProTripDetailContentProps) => {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  const userRole = user?.proRole || 'staff';
  const userPermissions = user?.permissions || ['read'];

  const visibleTabs = getVisibleTabs(userRole, userPermissions, selectedCategory);

  const handleUpdateRoomAssignments = (assignments: any[]) => {
    // In a real app, this would update the trip data
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const trimmedRole = newRole.trim();
      if (!trimmedRole) {
        throw new Error('Role is required');
      }

      // Demo mode: local-only updates
      if (isDemoMode) {
        const updatedRoster = tripData.roster?.map(member =>
          member.id === memberId ? { ...member, role: trimmedRole } : member
        ) || [];
        onUpdateTripData?.({ roster: updatedRoster, participants: updatedRoster });
        return;
      }

      // Authenticated mode: trip-scoped roles only (source of truth = trip_roles)
      // 1) Find or create the role for this trip
      const { data: existingRole, error: roleLookupError } = await supabase
        .from('trip_roles')
        .select('id')
        .eq('trip_id', tripId)
        .eq('role_name', trimmedRole)
        .maybeSingle();

      if (roleLookupError) throw roleLookupError;

      let roleId: string | undefined = existingRole?.id;

      if (!roleId) {
        const { data, error } = await supabase.rpc('create_trip_role' as any, {
          _trip_id: tripId,
          _role_name: trimmedRole,
          _permission_level: 'edit',
          _feature_permissions: null,
        });

        if (error) throw error;

        const result = data as { success: boolean; message: string; role_id?: string };
        if (!result?.success || !result.role_id) {
          throw new Error(result?.message || 'Failed to create role');
        }
        roleId = result.role_id;
      }

      // 2) Assign role to the user (set as primary to keep roster + UI consistent)
      const { data: assignData, error: assignError } = await supabase.rpc('assign_trip_role' as any, {
        _trip_id: tripId,
        _user_id: memberId,
        _role_id: roleId,
        _set_as_primary: true,
      });

      if (assignError) throw assignError;

      const assignResult = assignData as { success: boolean; message: string };
      if (!assignResult?.success) {
        throw new Error(assignResult?.message || 'Failed to assign role');
      }

      // 3) Optimistically update local roster so UI updates immediately (no reload)
      const updatedRoster = tripData.roster?.map(member =>
        member.id === memberId ? { ...member, role: trimmedRole } : member
      ) || [];

      onUpdateTripData?.({ roster: updatedRoster, participants: updatedRoster });

    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  };


  return (
    <>
      {/* Role Switcher for Testing - Now Dynamic */}
      <RoleSwitcher category={selectedCategory} />

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
