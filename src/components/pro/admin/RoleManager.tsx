import React, { useState, useMemo } from 'react';
import { useTripRoles } from '@/hooks/useTripRoles';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';
import { useTripMembers } from '@/hooks/useTripMembers';
import { useTripAdmins } from '@/hooks/useTripAdmins';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Users,
  Plus,
  Trash2,
  Link as LinkIcon,
  UserMinus,
  UserPlus,
  AlertTriangle,
  Pencil,
  Check,
  X,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TripRole } from '@/types/roleChannels';
import { MAX_ROLES_PER_TRIP } from '@/utils/roleUtils';

interface RoleManagerProps {
  tripId: string;
  tripCreatorId?: string;
}

export const RoleManager: React.FC<RoleManagerProps> = ({ tripId, tripCreatorId }) => {
  const {
    roles,
    isLoading,
    isProcessing,
    createRole,
    deleteRole,
    refetch: refetchRoles,
  } = useTripRoles({ tripId });
  const {
    assignments,
    assignRole,
    removeRole,
    refetch: refetchAssignments,
  } = useRoleAssignments({ tripId });
  const {
    tripMembers,
    loading: loadingMembers,
    tripCreatorId: fetchedCreatorId,
  } = useTripMembers(tripId);
  const {
    admins,
    isLoading: loadingAdmins,
    isProcessing: adminProcessing,
    promoteToAdmin,
    demoteFromAdmin,
  } = useTripAdmins({ tripId });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [showAdminSection, setShowAdminSection] = useState(false);

  // Use passed tripCreatorId or fallback to fetched one
  const effectiveCreatorId = tripCreatorId || fetchedCreatorId;

  // Create a set of admin user IDs for quick lookup
  const adminUserIds = useMemo(() => {
    return new Set(admins.map(a => a.user_id));
  }, [admins]);

  // Delete confirmation state
  const [roleToDelete, setRoleToDelete] = useState<TripRole | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Manage members state
  const [managingRole, setManagingRole] = useState<TripRole | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);

  // Compute members assigned to the current role and those not assigned
  const { assignedMembers, unassignedMembers } = useMemo(() => {
    if (!managingRole) return { assignedMembers: [], unassignedMembers: [] };

    const roleAssignments = assignments.filter(a => a.role_id === managingRole.id);
    const assignedUserIds = new Set(roleAssignments.map(a => a.user_id));

    const assigned = tripMembers
      .filter(m => assignedUserIds.has(m.id))
      .map(m => {
        const assignment = roleAssignments.find(a => a.user_id === m.id);
        return {
          ...m,
          assignmentId: assignment?.id,
          isPrimary: assignment?.is_primary,
        };
      });

    const unassigned = tripMembers.filter(m => !assignedUserIds.has(m.id));

    return { assignedMembers: assigned, unassignedMembers: unassigned };
  }, [managingRole, assignments, tripMembers]);

  // Edit/Rename role state
  const [roleToEdit, setRoleToEdit] = useState<TripRole | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedRoleName, setEditedRoleName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      await createRole(newRoleName);
      setShowCreateDialog(false);
      setNewRoleName('');
    } catch (error) {
      // Error handled in hook
    }
  };

  // Handle delete role with confirmation
  const handleDeleteRoleClick = (role: TripRole) => {
    setRoleToDelete(role);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      await deleteRole(roleToDelete.id);
      toast.success(`Role "${roleToDelete.roleName}" and its channel have been deleted`);
      setShowDeleteConfirm(false);
      setRoleToDelete(null);
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };

  // Handle managing role members
  const handleManageMembers = (role: TripRole) => {
    setManagingRole(role);
    setShowMembersDialog(true);
  };

  // Get members for a specific role
  const getRoleMembersList = (roleId: string) => {
    return assignments.filter(a => a.role_id === roleId);
  };

  // Handle removing a user from a role
  const handleRemoveUserFromRole = async (userId: string, roleId: string, userName?: string) => {
    setRemovingUserId(userId);
    try {
      await removeRole(userId, roleId);
      toast.success(`${userName || 'User'} has been removed from this role`);
      await refetchRoles(); // Refresh to update member counts
      await refetchAssignments();
    } catch (error) {
      console.error('Error removing user from role:', error);
      toast.error('Failed to remove user from role');
    } finally {
      setRemovingUserId(null);
    }
  };

  // Handle adding a user to a role
  const handleAddUserToRole = async (userId: string, roleId: string, userName?: string) => {
    setAddingUserId(userId);
    try {
      await assignRole(userId, roleId);
      toast.success(`${userName || 'User'} has been added to this role`);
      await refetchRoles(); // Refresh to update member counts
      await refetchAssignments();
    } catch (error) {
      console.error('Error adding user to role:', error);
      toast.error('Failed to add user to role');
    } finally {
      setAddingUserId(null);
    }
  };

  // Handle toggling admin status for a user
  const handleToggleAdmin = async (userId: string, userName?: string) => {
    // Don't allow demoting the trip creator
    if (userId === effectiveCreatorId) {
      toast.error('Cannot change admin status of the trip creator');
      return;
    }

    try {
      if (adminUserIds.has(userId)) {
        await demoteFromAdmin(userId);
        toast.success(`${userName || 'User'} has been removed from admins`);
      } else {
        await promoteToAdmin(userId);
        toast.success(`${userName || 'User'} is now an admin`);
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
      toast.error('Failed to update admin status');
    }
  };

  // Handle editing/renaming a role
  const handleEditRoleClick = (role: TripRole) => {
    setRoleToEdit(role);
    setEditedRoleName(role.roleName);
    setShowEditDialog(true);
  };

  const handleSaveRoleEdit = async () => {
    if (!roleToEdit || !editedRoleName.trim()) return;

    // Don't save if name hasn't changed
    if (editedRoleName.trim() === roleToEdit.roleName) {
      setShowEditDialog(false);
      return;
    }

    setIsSavingEdit(true);
    try {
      // Generate new channel slug from the new name
      const newChannelSlug = editedRoleName.trim().toLowerCase().replace(/\s+/g, '-');

      // Update the role name
      const { error: roleError } = await supabase
        .from('trip_roles')
        .update({
          role_name: editedRoleName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', roleToEdit.id);

      if (roleError) throw roleError;

      // Update the associated channel name and slug (if exists)
      const { error: channelError } = await supabase
        .from('trip_channels')
        .update({
          channel_name: editedRoleName.trim(),
          channel_slug: newChannelSlug,
          updated_at: new Date().toISOString(),
        })
        .eq('required_role_id', roleToEdit.id);

      // Channel update might fail if no channel exists - that's okay
      if (channelError) {
        console.warn('No channel found or failed to update channel:', channelError);
      }

      toast.success(`Role renamed to "${editedRoleName.trim()}"`);
      setShowEditDialog(false);
      setRoleToEdit(null);
      setEditedRoleName('');
      await refetchRoles();
    } catch (error) {
      console.error('Error renaming role:', error);
      toast.error('Failed to rename role');
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading roles...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        {/* Header - Stacked for mobile */}
        <div className="mb-6">
          {/* Title Row */}
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">Role Management</h3>
          </div>

          {/* Actions Row - Centered */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full">
              {roles.length} / {MAX_ROLES_PER_TRIP}
            </span>
            <Button
              onClick={() => setShowCreateDialog(true)}
              disabled={roles.length >= MAX_ROLES_PER_TRIP}
              className="rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-8 px-3"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create
            </Button>
          </div>
        </div>

        {roles.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <h4 className="font-semibold text-foreground mb-1">No Roles Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Create roles to organize your team and manage channel access
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="rounded-full bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Role
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map(role => {
              const hasChannel = role.channels && role.channels.length > 0;
              const channel = hasChannel ? role.channels[0] : null;

              return (
                <div
                  key={role.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                >
                  {/* Role Info - Full Width */}
                  <div className="mb-3">
                    <h4 className="font-medium text-foreground mb-1">{role.roleName}</h4>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{role.memberCount || 0} members</span>
                      {hasChannel && !(channel as any).is_archived && (
                        <>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <LinkIcon className="w-3 h-3" />
                            <span>#{(channel as any).channel_name}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - Centered Row */}
                  <div className="flex items-center justify-center gap-2 pt-3 border-t border-white/5">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEditRoleClick(role)}
                      className="rounded-full border-white/10 hover:bg-white/10 h-9 w-9"
                      title="Rename role and channel"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleManageMembers(role)}
                      className="rounded-full border-white/10 hover:bg-white/10 h-9 w-9"
                      title="Manage role members"
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDeleteRoleClick(role)}
                      disabled={isProcessing}
                      className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 h-9 w-9"
                      title="Delete role and channel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Admin Access Section - Collapsible */}
      <Card className="p-4 bg-background/40 backdrop-blur-sm border-white/10 mt-4">
        <button
          onClick={() => setShowAdminSection(!showAdminSection)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-foreground">Admin Access</h3>
            <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full">
              {admins.length} admins
            </span>
          </div>
          {showAdminSection ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {showAdminSection && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Admins can manage roles, channels, and team settings. Trip creators are always admins.
            </p>

            {loadingMembers || loadingAdmins ? (
              <div className="flex items-center gap-2 py-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            ) : tripMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No trip members found</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {tripMembers.map(member => {
                  const isAdmin = adminUserIds.has(member.id);
                  const isTripCreator = member.id === effectiveCreatorId || member.isCreator;

                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isAdmin ? 'bg-blue-500/10 border-blue-500/20' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-white/10">
                          <AvatarImage src={member.avatar} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {member.name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm text-foreground flex items-center gap-2">
                            {member.name || 'Unknown User'}
                            {isTripCreator && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded-full">
                                Creator
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isAdmin ? 'default' : 'outline'}
                        onClick={() => handleToggleAdmin(member.id, member.name)}
                        disabled={adminProcessing || isTripCreator}
                        className={`rounded-full h-8 px-3 ${
                          isAdmin
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'border-white/20 hover:bg-blue-500/10 hover:border-blue-500/50'
                        }`}
                        title={
                          isTripCreator
                            ? 'Trip creator is always admin'
                            : isAdmin
                              ? 'Remove admin privileges'
                              : 'Make admin'
                        }
                      >
                        <Shield className="w-3.5 h-3.5 mr-1" />
                        {isAdmin ? 'Admin' : 'Make Admin'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px] bg-background border-white/10">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role for your team. A private channel will be automatically created for
              this role.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., Tour Manager, Security, VIP"
                value={newRoleName}
                onChange={e => setNewRoleName(e.target.value)}
                className="rounded-full bg-white/5 border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                Members with this role will have access to the role's private channel
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={!newRoleName.trim() || isProcessing}
              className="rounded-full bg-purple-600 hover:bg-purple-700"
            >
              {isProcessing ? 'Creating...' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Rename Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px] bg-background border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-purple-500" />
              Rename Role
            </DialogTitle>
            <DialogDescription>
              Change the name of this role. The associated channel will also be renamed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-role-name">Role Name</Label>
              <Input
                id="edit-role-name"
                placeholder="Enter new role name"
                value={editedRoleName}
                onChange={e => setEditedRoleName(e.target.value)}
                className="rounded-full bg-white/5 border-white/10"
                disabled={isSavingEdit}
              />
              <p className="text-xs text-muted-foreground">Current: {roleToEdit?.roleName}</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setRoleToEdit(null);
                setEditedRoleName('');
              }}
              disabled={isSavingEdit}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveRoleEdit}
              disabled={!editedRoleName.trim() || isSavingEdit}
              className="rounded-full bg-purple-600 hover:bg-purple-700"
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Role Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-background border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete Role &quot;{roleToDelete?.roleName}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This action cannot be undone. Deleting this role will:</p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                <li>Remove all {roleToDelete?.memberCount || 0} members from this role</li>
                <li>Archive the associated channel (chat history will be hidden but preserved)</li>
                <li>Revoke channel access for all affected members</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-white/10">
                Note: This frees up 1 role slot. You can create a new role after deletion.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Role & Archive Channel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Role Members Dialog - Shows ALL trip members with add/remove */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-[550px] bg-background border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Manage &quot;{managingRole?.roleName}&quot; Members
            </DialogTitle>
            <DialogDescription>
              Add or remove members from this role. Members with this role will have access to the
              associated channel.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[450px] overflow-y-auto space-y-4 py-4">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading members...</span>
              </div>
            ) : tripMembers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No trip members found</p>
              </div>
            ) : (
              <>
                {/* Assigned Members Section */}
                {assignedMembers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-green-500 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Assigned to this role ({assignedMembers.length})
                    </h4>
                    {assignedMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-green-500/30">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-green-500/20 text-green-500 text-sm">
                              {member.name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {member.name || 'Unknown User'}
                            </p>
                            {member.isPrimary && (
                              <span className="text-xs text-purple-400">Primary Role</span>
                            )}
                            {member.isCreator && (
                              <span className="text-xs text-yellow-400 ml-1">Creator</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            managingRole &&
                            handleRemoveUserFromRole(member.id, managingRole.id, member.name)
                          }
                          disabled={removingUserId === member.id}
                          className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
                        >
                          {removingUserId === member.id ? (
                            <span className="animate-spin">...</span>
                          ) : (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Unassigned Members Section */}
                {unassignedMembers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Available to add ({unassignedMembers.length})
                    </h4>
                    {unassignedMembers.map(member => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white/10">
                            <AvatarImage src={member.avatar} />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm">
                              {member.name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {member.name || 'Unknown User'}
                            </p>
                            {member.isCreator && (
                              <span className="text-xs text-yellow-400">Creator</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            managingRole &&
                            handleAddUserToRole(member.id, managingRole.id, member.name)
                          }
                          disabled={addingUserId === member.id}
                          className="rounded-full border-white/20 hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-500"
                        >
                          {addingUserId === member.id ? (
                            <span className="animate-spin">...</span>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state when all members are assigned */}
                {assignedMembers.length > 0 && unassignedMembers.length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground border-t border-white/10 mt-4 pt-4">
                    All trip members are assigned to this role
                  </div>
                )}

                {/* Empty state when no members are assigned */}
                {assignedMembers.length === 0 && unassignedMembers.length > 0 && (
                  <div className="text-center py-2 text-sm text-muted-foreground border-b border-white/10 mb-2 pb-4">
                    No members assigned yet. Add members from the list below.
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMembersDialog(false)}
              className="rounded-full"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
