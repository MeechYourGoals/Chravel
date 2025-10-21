import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Shield, Plus, Trash2, Users, UserPlus, X, MessageSquare, Settings } from 'lucide-react';
import { TripRole, UserRoleAssignment, TripChannel } from '../../../types/roleChannels';
import { channelService } from '../../../services/channelService';
import { useToast } from '../../../hooks/use-toast';
import { ProParticipant } from '../../../types/pro';

interface AdminRoleManagerProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  roster: ProParticipant[];
  onRolesUpdated?: () => void;
}

interface AdminPermissions {
  can_manage_roles: boolean;
  can_manage_channels: boolean;
  can_designate_admins: boolean;
}

export const AdminRoleManager = ({
  isOpen,
  onClose,
  tripId,
  roster,
  onRolesUpdated
}: AdminRoleManagerProps) => {
  const [roles, setRoles] = useState<TripRole[]>([]);
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [channels, setChannels] = useState<TripChannel[]>([]);
  const [admins, setAdmins] = useState<Array<{
    userId: string;
    permissions: AdminPermissions;
    grantedBy?: string;
    grantedAt: string;
  }>>([]);
  const [loading, setLoading] = useState(false);

  // Section 1: Role Management State
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [assigningRole, setAssigningRole] = useState<TripRole | null>(null);

  // Section 2: Channel Management State
  const [showChannelCreator, setShowChannelCreator] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [selectedRolesForChannel, setSelectedRolesForChannel] = useState<Set<string>>(new Set());

  // Section 3: Admin Management State
  const [showAdminDesignator, setShowAdminDesignator] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<string | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions>({
    can_manage_roles: true,
    can_manage_channels: true,
    can_designate_admins: false
  });

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, tripId]);

  const loadData = async () => {
    setLoading(true);
    const [rolesData, assignmentsData, adminsData] = await Promise.all([
      channelService.getRoles(tripId),
      channelService.getRoleAssignments(tripId),
      channelService.getAdmins(tripId)
    ]);
    setRoles(rolesData);
    setAssignments(assignmentsData);
    setAdmins(adminsData);

    // Load channels for section 2
    // Note: This needs to be updated to load all channels for the trip, not just accessible ones
    // For now, we'll leave this as a TODO for future implementation
    setChannels([]);

    setLoading(false);
  };

  // ========================================
  // SECTION 1: Role Management Handlers
  // ========================================

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast({
        title: 'Role name required',
        variant: 'destructive'
      });
      return;
    }

    const role = await channelService.createRole({
      tripId,
      roleName: newRoleName.trim(),
      description: newRoleDesc.trim() || undefined
    });

    if (role) {
      toast({
        title: 'Role created',
        description: `${role.roleName} role has been created`
      });
      setNewRoleName('');
      setNewRoleDesc('');
      await loadData();
      onRolesUpdated?.();
    } else {
      toast({
        title: 'Failed to create role',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRole = async (role: TripRole) => {
    if (!confirm(`Delete "${role.roleName}" role? This will also remove associated channel access.`)) {
      return;
    }

    const success = await channelService.deleteRole(role.id);
    if (success) {
      toast({
        title: 'Role deleted',
        description: `${role.roleName} role has been removed`
      });
      await loadData();
      onRolesUpdated?.();
    } else {
      toast({
        title: 'Failed to delete role',
        variant: 'destructive'
      });
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    const success = await channelService.assignUserToRole({
      tripId,
      userId,
      roleId,
      isPrimary: true // Always assign as primary role
    });

    if (success) {
      toast({
        title: 'Role assigned'
      });
      await loadData();
      onRolesUpdated?.();
    } else {
      toast({
        title: 'Failed to assign role',
        description: 'User may already have a primary role',
        variant: 'destructive'
      });
    }
  };

  const handleRevokeRole = async (userId: string, roleId: string) => {
    const success = await channelService.revokeUserFromRole(tripId, userId, roleId);

    if (success) {
      toast({
        title: 'Role revoked'
      });
      await loadData();
      onRolesUpdated?.();
    } else {
      toast({
        title: 'Failed to revoke role',
        variant: 'destructive'
      });
    }
  };

  // ========================================
  // SECTION 2: Channel Management Handlers
  // ========================================

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast({
        title: 'Channel name required',
        variant: 'destructive'
      });
      return;
    }

    if (selectedRolesForChannel.size === 0) {
      toast({
        title: 'Select at least one role',
        description: 'Channels must grant access to at least one role',
        variant: 'destructive'
      });
      return;
    }

    const channelSlug = newChannelName.toLowerCase().replace(/\s+/g, '-');
    const roleIds = Array.from(selectedRolesForChannel);

    const channel = await channelService.createChannelWithRoles(
      tripId,
      newChannelName.trim(),
      channelSlug,
      roleIds,
      newChannelDesc.trim() || undefined
    );

    if (channel) {
      toast({
        title: 'Channel created',
        description: `#${channelSlug} channel has been created with ${roleIds.length} role(s)`
      });
      setNewChannelName('');
      setNewChannelDesc('');
      setSelectedRolesForChannel(new Set());
      setShowChannelCreator(false);
      await loadData();
    } else {
      toast({
        title: 'Failed to create channel',
        variant: 'destructive'
      });
    }
  };

  const toggleRoleForChannel = (roleId: string) => {
    const newSelection = new Set(selectedRolesForChannel);
    if (newSelection.has(roleId)) {
      newSelection.delete(roleId);
    } else {
      newSelection.add(roleId);
    }
    setSelectedRolesForChannel(newSelection);
  };

  // ========================================
  // SECTION 3: Admin Management Handlers
  // ========================================

  const handleDesignateAdmin = async () => {
    if (!selectedAdminUser) {
      toast({
        title: 'Select a user',
        variant: 'destructive'
      });
      return;
    }

    const success = await channelService.designateAdmin(
      tripId,
      selectedAdminUser,
      adminPermissions
    );

    if (success) {
      toast({
        title: 'Admin designated',
        description: 'User has been granted admin permissions'
      });
      setSelectedAdminUser(null);
      setShowAdminDesignator(false);
      await loadData();
    } else {
      toast({
        title: 'Failed to designate admin',
        description: 'You may not have permission to designate admins',
        variant: 'destructive'
      });
    }
  };

  const handleRevokeAdmin = async (userId: string) => {
    if (!confirm('Revoke admin access for this user?')) {
      return;
    }

    const success = await channelService.revokeAdmin(tripId, userId);

    if (success) {
      toast({
        title: 'Admin access revoked'
      });
      await loadData();
    } else {
      toast({
        title: 'Failed to revoke admin access',
        variant: 'destructive'
      });
    }
  };

  // Helper functions
  const getUserRoleIds = (userId: string): Set<string> => {
    return new Set(
      assignments
        .filter(a => a.userId === userId)
        .map(a => a.roleId)
    );
  };

  const getRoleMemberCount = (roleId: string): number => {
    return assignments.filter(a => a.roleId === roleId).length;
  };

  const getRoleName = (userId: string): string => {
    const userAssignment = assignments.find(a => a.userId === userId);
    return userAssignment?.roleName || 'No role assigned';
  };

  const isUserAdmin = (userId: string): boolean => {
    return admins.some(a => a.userId === userId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white w-full h-full md:max-w-6xl max-h-screen md:max-h-[90vh] overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={20} className="text-red-400" />
            Admin Role Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {/* Info Banner */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              <strong>Admin Only:</strong> Manage roles, channels, and admin permissions for your team.
            </p>
          </div>

          {/* ========================================
              SECTION 1: Manage Roles (Job Titles)
              ======================================== */}
          <div className="space-y-4 border border-gray-700 rounded-lg p-6 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                Manage Roles (Job Titles)
              </h3>
            </div>

            {/* Existing Roles */}
            <div className="space-y-2">
              <Label>Existing Roles ({roles.length})</Label>
              {roles.length === 0 ? (
                <div className="text-center py-6 bg-white/5 rounded-lg border border-gray-700">
                  <Shield size={32} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No roles created yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {roles.map(role => {
                    const memberCount = getRoleMemberCount(role.id);
                    return (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-3 bg-white/5 border border-gray-700 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-white">{role.roleName}</h4>
                            <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">
                              {memberCount} member{memberCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {role.description && (
                            <p className="text-sm text-gray-400 mt-0.5">{role.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => setAssigningRole(role)}
                            size="sm"
                            variant="outline"
                            className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                          >
                            <UserPlus size={14} className="mr-1" />
                            Assign
                          </Button>
                          <Button
                            onClick={() => handleDeleteRole(role)}
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600/10"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Create New Role */}
            <div className="space-y-3 border-t border-gray-700 pt-4 mt-4">
              <Label className="text-base font-semibold">Create New Role</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Role Name *</Label>
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="e.g., Player, Coach, Medical Staff"
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Description (optional)</Label>
                  <Input
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    placeholder="Brief description"
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateRole}
                disabled={!newRoleName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Plus size={16} className="mr-2" />
                Create Role
              </Button>
            </div>
          </div>

          {/* ========================================
              SECTION 2: Manage Channels
              ======================================== */}
          <div className="space-y-4 border border-gray-700 rounded-lg p-6 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MessageSquare size={18} className="text-purple-400" />
                Manage Channels
              </h3>
              <Button
                onClick={() => setShowChannelCreator(!showChannelCreator)}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus size={14} className="mr-1" />
                Create Custom Channel
              </Button>
            </div>

            {/* Channel Creator */}
            {showChannelCreator && (
              <div className="space-y-3 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <h4 className="font-medium text-purple-300">Create Custom Channel</h4>

                <div>
                  <Label className="text-sm">Channel Name *</Label>
                  <Input
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g., Game Day, Team Leadership"
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm">Description (optional)</Label>
                  <Input
                    value={newChannelDesc}
                    onChange={(e) => setNewChannelDesc(e.target.value)}
                    placeholder="Channel purpose"
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                  />
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Grant access to these roles: *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {roles.map(role => {
                      const isSelected = selectedRolesForChannel.has(role.id);
                      const memberCount = getRoleMemberCount(role.id);
                      return (
                        <button
                          key={role.id}
                          onClick={() => toggleRoleForChannel(role.id)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                              : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-purple-600 border-purple-600' : 'border-gray-500'
                            }`}>
                              {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{role.roleName}</div>
                              <div className="text-xs opacity-75">{memberCount} members</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {roles.length === 0 && (
                    <p className="text-sm text-yellow-400 mt-2">
                      Create roles first before creating channels
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleCreateChannel}
                    disabled={!newChannelName.trim() || selectedRolesForChannel.size === 0}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus size={16} className="mr-2" />
                    Create Channel
                  </Button>
                  <Button
                    onClick={() => {
                      setShowChannelCreator(false);
                      setNewChannelName('');
                      setNewChannelDesc('');
                      setSelectedRolesForChannel(new Set());
                    }}
                    variant="outline"
                    className="border-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Channels - Placeholder for now */}
            <div className="text-center py-4 text-gray-500 text-sm">
              Channel list view coming soon
            </div>
          </div>

          {/* ========================================
              SECTION 3: Manage Admins
              ======================================== */}
          <div className="space-y-4 border border-gray-700 rounded-lg p-6 bg-gray-800/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield size={18} className="text-orange-400" />
                Manage Admins
              </h3>
              <Button
                onClick={() => setShowAdminDesignator(!showAdminDesignator)}
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus size={14} className="mr-1" />
                Designate New Admin
              </Button>
            </div>

            {/* Existing Admins */}
            <div className="space-y-2">
              <Label>Current Admins ({admins.length})</Label>
              {admins.length === 0 ? (
                <div className="text-center py-6 bg-white/5 rounded-lg border border-gray-700">
                  <Shield size={32} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No admins designated yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {admins.map(admin => {
                    const member = roster.find(m => m.id === admin.userId);
                    return (
                      <div
                        key={admin.userId}
                        className="flex items-center justify-between p-3 bg-white/5 border border-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-white">{member?.name || 'Unknown User'}</h4>
                          <div className="flex gap-2 mt-1">
                            {admin.permissions.can_manage_roles && (
                              <span className="text-xs bg-blue-600/20 text-blue-300 px-2 py-0.5 rounded">
                                Roles
                              </span>
                            )}
                            {admin.permissions.can_manage_channels && (
                              <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded">
                                Channels
                              </span>
                            )}
                            {admin.permissions.can_designate_admins && (
                              <span className="text-xs bg-orange-600/20 text-orange-300 px-2 py-0.5 rounded">
                                Full Access
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleRevokeAdmin(admin.userId)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600/10"
                        >
                          <X size={14} className="mr-1" />
                          Revoke
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Admin Designator */}
            {showAdminDesignator && (
              <div className="space-y-3 bg-orange-900/20 border border-orange-500/30 rounded-lg p-4">
                <h4 className="font-medium text-orange-300">Designate New Admin</h4>

                <div>
                  <Label className="text-sm">Select User *</Label>
                  <select
                    value={selectedAdminUser || ''}
                    onChange={(e) => setSelectedAdminUser(e.target.value)}
                    className="w-full mt-1 bg-gray-800 border border-gray-600 text-white rounded px-3 py-2"
                  >
                    <option value="">-- Select a user --</option>
                    {roster
                      .filter(member => !isUserAdmin(member.id))
                      .map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({getRoleName(member.id)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Admin Permissions</Label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adminPermissions.can_manage_roles}
                        onChange={(e) => setAdminPermissions({
                          ...adminPermissions,
                          can_manage_roles: e.target.checked
                        })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Can manage roles</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adminPermissions.can_manage_channels}
                        onChange={(e) => setAdminPermissions({
                          ...adminPermissions,
                          can_manage_channels: e.target.checked
                        })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Can manage channels</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adminPermissions.can_designate_admins}
                        onChange={(e) => setAdminPermissions({
                          ...adminPermissions,
                          can_designate_admins: e.target.checked
                        })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-orange-300">Can designate other admins (Full Access)</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleDesignateAdmin}
                    disabled={!selectedAdminUser}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus size={16} className="mr-2" />
                    Designate Admin
                  </Button>
                  <Button
                    onClick={() => {
                      setShowAdminDesignator(false);
                      setSelectedAdminUser(null);
                    }}
                    variant="outline"
                    className="border-gray-600"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Role Assignment Modal */}
        {assigningRole && (
          <Dialog open={true} onOpenChange={() => setAssigningRole(null)}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white w-full h-full md:max-w-2xl max-h-screen md:max-h-[90vh] p-4 md:p-6">
              <DialogHeader>
                <DialogTitle>Assign Members to {assigningRole.roleName}</DialogTitle>
                <p className="text-sm text-gray-400 mt-1">
                  Each member can have only ONE primary role
                </p>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {roster.map(member => {
                  const userRoleIds = getUserRoleIds(member.id);
                  const hasRole = userRoleIds.has(assigningRole.id);
                  const hasOtherRole = userRoleIds.size > 0 && !hasRole;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-xs text-gray-400">
                          {hasRole
                            ? `Current role: ${assigningRole.roleName}`
                            : hasOtherRole
                            ? `Current role: ${getRoleName(member.id)}`
                            : 'No role assigned'}
                        </p>
                      </div>
                      {hasRole ? (
                        <Button
                          onClick={() => handleRevokeRole(member.id, assigningRole.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-600/10"
                        >
                          <X size={14} className="mr-1" />
                          Remove
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAssignRole(member.id, assigningRole.id)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={hasOtherRole}
                        >
                          <Plus size={14} className="mr-1" />
                          {hasOtherRole ? 'Has Role' : 'Add'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};
