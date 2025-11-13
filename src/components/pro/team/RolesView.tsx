import React, { useState } from 'react';
import { Users, Settings, AlertTriangle, UserPlus, UsersRound } from 'lucide-react';
import { ProParticipant } from '../../../types/pro';
import { ProTripCategory, getCategoryConfig } from '../../../types/proCategories';
import { EditMemberRoleModal } from '../EditMemberRoleModal';
import { TeamOnboardingBanner } from '../TeamOnboardingBanner';
import { BulkRoleAssignmentModal } from '../BulkRoleAssignmentModal';
import { QuickContactMenu } from '../QuickContactMenu';
import { RoleContactSheet } from '../RoleContactSheet';
import { extractUniqueRoles, getRoleColorClass } from '../../../utils/roleUtils';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useDemoMode } from '../../../hooks/useDemoMode';

interface RolesViewProps {
  roster: ProParticipant[];
  userRole: string;
  isReadOnly?: boolean;
  category: ProTripCategory;
  onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>;
  canManageRoles?: boolean;
  onCreateRole?: () => void;
  isLoadingRoles?: boolean;
  adminLoading?: boolean;
}

export const RolesView = ({ 
  roster, 
  userRole, 
  isReadOnly = false, 
  category, 
  onUpdateMemberRole,
  canManageRoles = false,
  onCreateRole,
  isLoadingRoles = false,
  adminLoading = false
}: RolesViewProps) => {
  const { isDemoMode } = useDemoMode();
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [editingMember, setEditingMember] = useState<ProParticipant | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [roleContactSheet, setRoleContactSheet] = useState<{ role: string; members: ProParticipant[] } | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [showRoleCreation, setShowRoleCreation] = useState(false);

  const { terminology: { teamLabel }, roles: categoryRoles } = getCategoryConfig(category);

  // Use category-specific roles or allow all for manual input
  const roles = categoryRoles.length > 0 ? ['all', ...categoryRoles] : ['all'];
  const existingRoles = extractUniqueRoles(roster);
  
  // Check if there are unassigned roles (members with default/empty roles)
  const hasUnassignedRoles = roster.some(member => 
    !member.role || member.role === '' || member.role === 'Member' || member.role === 'Participant'
  );
  
  const filteredRoster = selectedRole === 'all' 
    ? roster 
    : roster.filter(member => member.role === selectedRole);

  const handleEditMember = (member: ProParticipant) => {
    if (isReadOnly || !onUpdateMemberRole) return;
    setEditingMember(member);
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!onUpdateMemberRole) return;
    await onUpdateMemberRole(memberId, newRole);
  };

  const handleAssignRolesClick = () => {
    // Find first member without proper role and open edit modal
    const firstUnassigned = roster.find(member => 
      !member.role || member.role === '' || member.role === 'Member' || member.role === 'Participant'
    );
    if (firstUnassigned) {
      setEditingMember(firstUnassigned);
    }
    setShowOnboarding(false);
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;

    // Reset form
    setNewRoleName('');
    setShowRoleCreation(false);

    // Show success feedback
    alert(`Role "${newRoleName}" created! You can now assign this role to team members.`);
  };

  const isAdmin = userRole === 'admin' || userRole === 'tour manager' || userRole === 'manager';

  return (
    <div className="space-y-6">
      {/* Onboarding Banner */}
      {showOnboarding && hasUnassignedRoles && !isReadOnly && (
        <TeamOnboardingBanner
          hasUnassignedRoles={hasUnassignedRoles}
          onAssignRoles={handleAssignRolesClick}
          onDismiss={() => setShowOnboarding(false)}
        />
      )}

      {/* Read-only notice */}
      {isReadOnly && !isDemoMode && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-yellow-400 text-sm">Read-only access for your role</p>
        </div>
      )}

      {/* Header with Stats and Admin Indicator */}
      <div className="bg-gradient-to-br from-white/5 via-white/3 to-transparent backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 shadow-xl">
        {/* Row 1: Team Label + Stats + Admin Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="text-red-400" size={20} />
            <h2 className="text-lg font-bold text-white">{teamLabel}</h2>
            <span className="text-gray-400 text-sm">{roster.length} members</span>
          </div>
          {canManageRoles && !isReadOnly && (
            <span className="text-xs text-gray-500">Admin Access</span>
          )}
        </div>

        {/* Row 2: Centered Admin Action Buttons */}
        {canManageRoles && !isReadOnly && (
          <div className="flex items-center justify-center gap-3 mb-4">
            <Button
              onClick={onCreateRole}
              disabled={adminLoading || isLoadingRoles}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
            <Button
              onClick={() => setShowBulkModal(true)}
              variant="outline"
              size="sm"
              disabled={roster.length === 0}
              className="rounded-full"
              title="Assign roles to multiple members"
            >
              <UsersRound size={16} className="mr-2" />
              Assign Roles
            </Button>
          </div>
        )}

        {/* Role Creation Form - Admin Only */}
        {showRoleCreation && isAdmin && !isReadOnly && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-6">
            <h3 className="text-purple-300 font-medium mb-3 text-sm">Create New Role</h3>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter role name (e.g., 'Stage Manager', 'Chef')"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateRole();
                  }
                }}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500"
              />
              <Button
                onClick={handleCreateRole}
                disabled={!newRoleName.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Create
              </Button>
              <Button
                onClick={() => {
                  setShowRoleCreation(false);
                  setNewRoleName('');
                }}
                variant="outline"
                className="border-gray-600 hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Once created, you can assign this role to team members using the edit button on their profile.
            </p>
          </div>
        )}

        {/* Row 3: Centered Role Filter Pills */}
        {categoryRoles.length > 0 && (
          <div className="flex justify-center">
            <div className="flex flex-wrap gap-2 justify-center items-center max-w-5xl">
              {roles.map((role) => {
                const roleMembers = roster.filter(m => m.role === role);
                const hasMembers = role !== 'all' && roleMembers.length > 0;
                
                return (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      selectedRole === role
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105'
                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:scale-102 border border-gray-600'
                    }`}
                  >
                    {role === 'all' ? 'All' : role}
                    {role !== 'all' && (
                      <span className="ml-1 text-xs opacity-75">
                        {roleMembers.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Manual Role Input Notice for Corporate & Business */}
        {categoryRoles.length === 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              Team members can have custom titles entered manually. {isAdmin && 'Use the "Create Role" button above to add new roles.'}
            </p>
          </div>
        )}
      </div>

      {/* Team Grid View - Optimized for 3-4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredRoster.map((member) => (
          <div key={member.id} className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
            <div className="flex items-start gap-2.5">
              <img
                src={member.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'}
                alt={member.name}
                className="w-10 h-10 rounded-full border-2 border-gray-600 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <QuickContactMenu
                  member={member}
                >
                  <h3 className="text-white text-sm font-medium truncate cursor-pointer hover:text-blue-400 transition-colors leading-tight">
                    {member.name}
                  </h3>
                </QuickContactMenu>
                <p className="text-gray-400 text-xs truncate leading-tight">{member.email}</p>
                {member.phone && (
                  <p className="text-gray-500 text-xs truncate leading-tight">{member.phone}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`${getRoleColorClass(member.role, category)} px-1.5 py-0.5 rounded text-xs font-medium`}>
                    {member.role}
                  </span>
                </div>
              </div>
              {userRole === 'admin' && !isReadOnly && onUpdateMemberRole && (
                <button 
                  onClick={() => handleEditMember(member)}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 flex-shrink-0"
                  title="Edit role"
                >
                  <Settings size={14} />
                </button>
              )}
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
        ))}
      </div>

      {filteredRoster.length === 0 && (
        <div className="text-center py-12">
          <Users size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No team members found for the selected role.</p>
        </div>
      )}

      {/* Role Edit Modal */}
      <EditMemberRoleModal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        category={category}
        existingRoles={existingRoles}
        onUpdateRole={handleUpdateRole}
      />

      {/* Bulk Role Assignment Modal */}
      {onUpdateMemberRole && (
        <BulkRoleAssignmentModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          roster={roster}
          category={category}
          existingRoles={existingRoles}
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
    </div>
  );
};
