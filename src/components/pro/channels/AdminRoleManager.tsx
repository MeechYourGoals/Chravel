import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Shield, Plus, Trash2, Users, UserPlus, X } from 'lucide-react';
import { TripRole, UserRoleAssignment } from '../../../types/roleChannels';
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

export const AdminRoleManager = ({
  isOpen,
  onClose,
  tripId,
  roster,
  onRolesUpdated
}: AdminRoleManagerProps) => {
  const [roles, setRoles] = useState<TripRole[]>([]);
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [assigningRole, setAssigningRole] = useState<TripRole | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, tripId]);

  const loadData = async () => {
    setLoading(true);
    const [rolesData, assignmentsData] = await Promise.all([
      channelService.getRoles(tripId),
      channelService.getRoleAssignments(tripId)
    ]);
    setRoles(rolesData);
    setAssignments(assignmentsData);
    setLoading(false);
  };

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
    if (!confirm(`Delete "${role.roleName}" role? This will also remove the associated channel.`)) {
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
      roleId
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={20} className="text-red-400" />
            Admin Role Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400 text-sm">
              <strong>Admin Only:</strong> Create custom roles and assign team members. Each role automatically gets a private channel.
            </p>
          </div>

          {/* Existing Roles */}
          <div className="space-y-3">
            <Label className="text-lg">Existing Roles ({roles.length})</Label>
            {roles.length === 0 ? (
              <div className="text-center py-8 bg-white/5 rounded-lg border border-gray-700">
                <Shield size={48} className="text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No roles created yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roles.map(role => {
                  const memberCount = getRoleMemberCount(role.id);
                  return (
                    <div
                      key={role.id}
                      className="flex items-center justify-between p-4 bg-white/5 border border-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white">{role.roleName}</h4>
                          <span className="text-xs text-gray-500">
                            {memberCount} member{memberCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-sm text-gray-400 mt-1">{role.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setAssigningRole(role)}
                          size="sm"
                          variant="outline"
                          className="border-gray-600 hover:bg-white/10"
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
          <div className="space-y-3 border-t border-gray-700 pt-6">
            <Label className="text-lg">Create New Role</Label>
            <div className="space-y-3">
              <div>
                <Label>Role Name *</Label>
                <Input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Security, Medical Staff, Photographers"
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Brief description of this role"
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                />
              </div>
              <Button
                onClick={handleCreateRole}
                disabled={!newRoleName.trim()}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Plus size={16} className="mr-2" />
                Create Role & Channel
              </Button>
            </div>
          </div>
        </div>

        {/* Role Assignment Modal */}
        {assigningRole && (
          <Dialog open={true} onOpenChange={() => setAssigningRole(null)}>
            <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle>Assign Members to {assigningRole.roleName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {roster.map(member => {
                  const userRoleIds = getUserRoleIds(member.id);
                  const hasRole = userRoleIds.has(assigningRole.id);
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-xs text-gray-400">{member.role}</p>
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
                        >
                          <Plus size={14} className="mr-1" />
                          Add
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
