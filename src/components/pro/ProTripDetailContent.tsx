
import React, { useState } from 'react';
import { RoomAssignmentsModal } from './RoomAssignmentsModal';
import { ProTabNavigation } from './ProTabNavigation';
import { ProTabContent } from './ProTabContent';
import { RoleSwitcher } from './RoleSwitcher';
import { getVisibleTabs } from './ProTabsConfig';
import { useAuth } from '../../hooks/useAuth';

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
}

export const ProTripDetailContent = ({
  activeTab,
  onTabChange,
  onShowTripsPlusModal,
  tripId,
  basecamp,
  tripData,
  selectedCategory,
  onUpdateTripData
}: ProTripDetailContentProps) => {
  const [showRoomModal, setShowRoomModal] = useState(false);
  const { user } = useAuth();

  const userRole = user?.proRole || 'staff';
  const userPermissions = user?.permissions || ['read'];

  const visibleTabs = getVisibleTabs(userRole, userPermissions, selectedCategory);

  const handleUpdateRoomAssignments = (assignments: any[]) => {
    // In a real app, this would update the trip data
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      // Update the roster with the new role
      const updatedRoster = tripData.roster?.map(member =>
        member.id === memberId ? { ...member, role: newRole } : member
      ) || [];

      // Update the trip data
      if (onUpdateTripData) {
        onUpdateTripData({ roster: updatedRoster });
      }

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
