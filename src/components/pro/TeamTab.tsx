import React, { useState, useEffect } from 'react';
import { Users, Shield, Settings, UserCheck, AlertTriangle, UserPlus, UsersRound, MessageCircle, Download, Star, Megaphone, Grid3x3, Network } from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory, getCategoryConfig } from '../../types/proCategories';
import { EditMemberRoleModal } from './EditMemberRoleModal';
import { TeamOnboardingBanner } from './TeamOnboardingBanner';
import { BulkRoleAssignmentModal } from './BulkRoleAssignmentModal';
import { QuickContactMenu } from './QuickContactMenu';
import { RoleContactSheet } from './RoleContactSheet';
import { ExportTeamDirectoryModal } from './ExportTeamDirectoryModal';
import { RoleTemplateManager } from './RoleTemplateManager';
import { RoleBroadcastModal } from './RoleBroadcastModal';
import { TeamOrgChart } from './TeamOrgChart';
import { extractUniqueRoles, getRoleColorClass } from '../../utils/roleUtils';
import { Button } from '../ui/button';

interface TeamTabProps {
  roster: ProParticipant[];
  userRole: string;
  isReadOnly?: boolean;
  category: ProTripCategory;
  tripId?: string;
  onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>;
}

export const TeamTab = ({ roster, userRole, isReadOnly = false, category, tripId, onUpdateMemberRole }: TeamTabProps) => {
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showCredentials, setShowCredentials] = useState(false);
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false);
  const [editingMember, setEditingMember] = useState<ProParticipant | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastRole, setBroadcastRole] = useState<string | undefined>();
  const [roleContactSheet, setRoleContactSheet] = useState<{ role: string; members: ProParticipant[] } | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'orgchart'>('grid');

  // Load view preference from localStorage
  useEffect(() => {
    const savedView = localStorage.getItem('team-view-mode') as 'grid' | 'orgchart' | null;
    if (savedView) {
      setViewMode(savedView);
    }
  }, []);

  const handleViewModeChange = (mode: 'grid' | 'orgchart') => {
    setViewMode(mode);
    localStorage.setItem('team-view-mode', mode);
  };

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

  const getCredentialColor = (level: string) => {
    switch (level) {
      case 'AllAccess': return 'bg-green-500';
      case 'Backstage': return 'bg-yellow-500';
      case 'Guest': return 'bg-blue-500';
      case 'Restricted': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
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
      {isReadOnly && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <p className="text-yellow-400 text-sm">Read-only access for your role</p>
        </div>
      )}

      {/* Header with Stats */}
      <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="text-red-400" size={24} />
            <h2 className="text-xl font-bold text-white">{teamLabel}</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400">{roster.length} total members</span>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Grid view"
              >
                <Grid3x3 size={14} />
                Grid
              </button>
              <button
                onClick={() => handleViewModeChange('orgchart')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1 ${
                  viewMode === 'orgchart'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Org chart view"
              >
                <Network size={14} />
                Org Chart
              </button>
            </div>
            
            {/* Broadcast Button */}
            {tripId && (
              <Button
                onClick={() => {
                  setBroadcastRole(undefined);
                  setShowBroadcastModal(true);
                }}
                variant="outline"
                className="border-gray-600"
                title="Send announcement to team roles"
              >
                <Megaphone size={16} className="mr-2" />
                Broadcast
              </Button>
            )}
            
            {/* Templates Button */}
            <Button
              onClick={() => setShowTemplateManager(true)}
              variant="outline"
              className="border-gray-600"
              title="Save or load role templates"
            >
              <Star size={16} className="mr-2" />
              Templates
            </Button>

            {/* Export Button */}
            <Button
              onClick={() => setShowExportModal(true)}
              variant="outline"
              className="border-gray-600"
              title="Export team directory"
            >
              <Download size={16} className="mr-2" />
              Export
            </Button>

            {/* Bulk Edit Button */}
            {!isReadOnly && onUpdateMemberRole && (
              <Button
                onClick={() => setShowBulkModal(true)}
                variant="outline"
                className="border-gray-600"
                title="Assign roles to multiple members at once"
              >
                <UsersRound size={16} className="mr-2" />
                Bulk Edit
              </Button>
            )}
            
            {/* Quick Assign Roles Button */}
            {hasUnassignedRoles && !isReadOnly && (
              <Button
                onClick={handleAssignRolesClick}
                className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                title="Assign roles to team members"
              >
                <UserPlus size={16} className="mr-2" />
                Assign Roles
              </Button>
            )}
            
            <button
              onClick={() => setShowCredentials(!showCredentials)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              title={showCredentials ? 'Hide credential levels' : 'Show credential levels'}
            >
              <Shield size={16} />
              {showCredentials ? 'Hide Credentials' : 'Show Credentials'}
            </button>
            
            <button
              onClick={() => setShowEmergencyContacts(!showEmergencyContacts)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showEmergencyContacts
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
              title={showEmergencyContacts ? 'Hide emergency contacts' : 'Show emergency contacts'}
            >
              <AlertTriangle size={16} />
              Emergency
            </button>
          </div>
        </div>

        {/* Role Filter Chips - Only show if category has predefined roles */}
        {categoryRoles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => {
              const roleMembers = roster.filter(m => m.role === role);
              return (
                <div key={role} className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedRole(role)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedRole === role
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {role === 'all' ? 'All Roles' : role}
                    {role !== 'all' && (
                      <span className="ml-1 text-xs">
                        ({roleMembers.length})
                      </span>
                    )}
                  </button>
                  {/* Contact All Button for specific roles */}
                  {role !== 'all' && roleMembers.length > 0 && (
                    <>
                      <button
                        onClick={() => setRoleContactSheet({ role, members: roleMembers })}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title={`Contact all ${role}`}
                      >
                        <MessageCircle size={14} className="text-blue-400" />
                      </button>
                      {tripId && (
                        <button
                          onClick={() => {
                            setBroadcastRole(role);
                            setShowBroadcastModal(true);
                          }}
                          className="p-1 hover:bg-white/10 rounded transition-colors"
                          title={`Broadcast to all ${role}`}
                        >
                          <Megaphone size={14} className="text-purple-400" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Manual Role Input Notice for Corporate & Business */}
        {categoryRoles.length === 0 && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-blue-400 text-sm">Team members can have custom titles entered manually</p>
          </div>
        )}
      </div>

      {/* Org Chart View */}
      {viewMode === 'orgchart' ? (
        <TeamOrgChart
          roster={roster}
          category={category}
          onMemberClick={(memberId) => {
            const member = roster.find(m => m.id === memberId);
            if (member) {
              setEditingMember(member);
            }
          }}
        />
      ) : (
        /* Team Grid View */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRoster.map((member) => (
          <div key={member.id} className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <img
                src={member.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'}
                alt={member.name}
                className="w-12 h-12 rounded-full border-2 border-gray-600"
              />
              <div className="flex-1 min-w-0">
                <QuickContactMenu
                  member={member}
                  showEmergencyContacts={showEmergencyContacts}
                >
                  <h3 className="text-white font-medium truncate cursor-pointer hover:text-blue-400 transition-colors">
                    {member.name}
                  </h3>
                </QuickContactMenu>
                <p className="text-gray-400 text-sm">{member.email}</p>
                {member.phone && (
                  <p className="text-gray-500 text-xs">{member.phone}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`${getRoleColorClass(member.role, category)} px-2 py-1 rounded text-xs font-medium`}>
                    {member.role}
                  </span>
                  {showCredentials && (
                    <span className={`${getCredentialColor(member.credentialLevel)} text-white px-2 py-1 rounded text-xs font-medium`}>
                      {member.credentialLevel}
                    </span>
                  )}
                </div>
              </div>
              {userRole === 'admin' && !isReadOnly && onUpdateMemberRole && (
                <button 
                  onClick={() => handleEditMember(member)}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10 group relative"
                  title="Click to edit member role"
                >
                  <Settings size={16} />
                  <span className="absolute -top-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Edit Role
                  </span>
                </button>
              )}
            </div>

            {/* Medical Alerts */}
            {member.medicalNotes && (
              <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-yellow-400" />
                  <span className="text-yellow-400 text-xs font-medium">Medical Alert</span>
                </div>
              </div>
            )}

            {/* Dietary Restrictions */}
            {member.dietaryRestrictions && member.dietaryRestrictions.length > 0 && (
              <div className="mt-2">
                <p className="text-gray-400 text-xs">Dietary: {member.dietaryRestrictions.join(', ')}</p>
              </div>
            )}

            {showCredentials && member.permissions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-gray-400 text-xs mb-1">Permissions:</p>
                <div className="flex flex-wrap gap-1">
                  {member.permissions.map((permission, index) => (
                    <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                      {permission}
                    </span>
                  ))}
                </div>
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
        </>
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

      {/* Export Team Directory Modal */}
      <ExportTeamDirectoryModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        roster={roster}
        category={category}
        existingRoles={existingRoles}
      />

      {/* Role Template Manager */}
      {onUpdateMemberRole && (
        <RoleTemplateManager
          isOpen={showTemplateManager}
          onClose={() => setShowTemplateManager(false)}
          roster={roster}
          category={category}
          onApplyTemplate={async (assignments) => {
            // Apply template assignments
            for (const [memberId, role] of assignments.entries()) {
              await onUpdateMemberRole(memberId, role);
            }
          }}
        />
      )}

      {/* Role Broadcast Modal */}
      {tripId && (
        <RoleBroadcastModal
          isOpen={showBroadcastModal}
          onClose={() => {
            setShowBroadcastModal(false);
            setBroadcastRole(undefined);
          }}
          tripId={tripId}
          roster={roster}
          category={category}
          availableRoles={existingRoles}
          preselectedRole={broadcastRole}
        />
      )}
    </div>
  );
};