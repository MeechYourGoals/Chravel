import React from 'react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { RolesView } from './team/RolesView';

interface TeamTabProps {
  roster: ProParticipant[];
  userRole: string;
  isReadOnly?: boolean;
  category: ProTripCategory;
  tripId?: string;
  onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>;
}

export const TeamTab = ({ roster, userRole, isReadOnly = false, category, onUpdateMemberRole }: TeamTabProps) => {
  return (
    <div className="space-y-6">
      <RolesView
        roster={roster}
        userRole={userRole}
        isReadOnly={isReadOnly}
        category={category}
        onUpdateMemberRole={onUpdateMemberRole}
      />
    </div>
  );
};