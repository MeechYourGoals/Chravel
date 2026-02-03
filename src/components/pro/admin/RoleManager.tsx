import React, { useState } from 'react';
import { useTripRoles } from '@/hooks/useTripRoles';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Users,
  Plus,
  Trash2,
  Link as LinkIcon,
  Settings,
  UserMinus,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { PermissionEditorDialog } from './PermissionEditorDialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TripRole } from '@/types/roleChannels';
import { MAX_ROLES_PER_TRIP } from '@/utils/roleUtils';

interface RoleManagerProps {
  tripId: string;
}

export const RoleManager: React.FC<RoleManagerProps> = ({ tripId }) => {
  const {
    roles,
    isLoading,
    isProcessing,
    createRole,
    deleteRole,
    refetch: refetchRoles,
  } = useTripRoles({ tripId });
  const { assignments, removeRole, refetch: refetchAssignments } = useRoleAssignments({ tripId });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'admin'>('edit');
  const [editingRole, setEditingRole] = useState<any>(null);
  const [showPermissionEditor, setShowPermissionEditor] = useState(false);

  // Delete confirmation state
  const [roleToDelete, setRoleToDelete] = useState<TripRole | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Manage members state
  const [managingRole, setManagingRole] = useState<TripRole | null>(null);
  const [showMembersDialog, setShowMembersDialog] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Edit/Rename role state
  const [roleToEdit, setRoleToEdit] = useState<TripRole | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedRoleName, setEditedRoleName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;

    try {
      await createRole(newRoleName, permissionLevel);
      setShowCreateDialog(false);
      setNewRoleName('');
      setPermissionLevel('edit');
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

  const handleSavePermissions = async (
    roleId: string,
    permissionLevel: string,
    featurePermissions: any,
  ) => {
    try {
      const { error } = await supabase
        .from('trip_roles')
        .update({
          permission_level: permissionLevel as 'view' | 'edit' | 'admin',
          feature_permissions: featurePermissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roleId);

      if (error) throw error;

      toast.success('Permissions updated successfully');

      // Refresh roles
      window.location.reload();
    } catch (error) {
      console.error('Error updating permissions:', error);
      throw error;
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">Role Management</h3>
            <span className="text-xs bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full">
              {roles.length} / {MAX_ROLES_PER_TRIP}
            </span>
          </div>

          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={roles.length >= MAX_ROLES_PER_TRIP}
            className="rounded-full bg-purple-600 hover:bg-purple-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Role
          </Button>
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
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{role.roleName}</h4>
                      <span className="text-xs bg-white/10 text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                        {role.permissionLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
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

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRoleClick(role)}
                      className="rounded-full border-white/10 hover:bg-white/10"
                      title="Rename role and channel"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageMembers(role)}
                      className="rounded-full border-white/10 hover:bg-white/10"
                      title="Manage role members"
                    >
                      <UserMinus className="w-4 h-4 mr-1" />
                      Members
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingRole(role);
                        setShowPermissionEditor(true);
                      }}
                      className="rounded-full border-white/10 hover:bg-white/10"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Permissions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRoleClick(role)}
                      disabled={isProcessing}
                      className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
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

      {/* Permission Editor Dialog */}
      <PermissionEditorDialog
        open={showPermissionEditor}
        onOpenChange={setShowPermissionEditor}
        role={editingRole}
        onSave={handleSavePermissions}
      />

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
            </div>

            <div className="grid gap-2">
              <Label htmlFor="permission-level">Permission Level</Label>
              <Select value={permissionLevel} onValueChange={v => setPermissionLevel(v as any)}>
                <SelectTrigger className="rounded-full bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="edit">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls what members with this role can do
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

      {/* Manage Role Members Dialog */}
      <Dialog open={showMembersDialog} onOpenChange={setShowMembersDialog}>
        <DialogContent className="sm:max-w-[500px] bg-background border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              Manage &quot;{managingRole?.roleName}&quot; Members
            </DialogTitle>
            <DialogDescription>
              Remove members from this role. They will lose access to the associated channel.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-2 py-4">
            {managingRole && getRoleMembersList(managingRole.id).length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No members assigned to this role yet
                </p>
              </div>
            ) : (
              managingRole &&
              getRoleMembersList(managingRole.id).map(assignment => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white/10">
                      <AvatarImage src={assignment.user_profile?.avatar_url} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">
                        {assignment.user_profile?.display_name?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {assignment.user_profile?.display_name || 'Unknown User'}
                      </p>
                      {assignment.is_primary && (
                        <span className="text-xs text-purple-400">Primary Role</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleRemoveUserFromRole(
                        assignment.user_id,
                        assignment.role_id,
                        assignment.user_profile?.display_name,
                      )
                    }
                    disabled={removingUserId === assignment.user_id}
                    className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
                  >
                    {removingUserId === assignment.user_id ? (
                      <span className="animate-spin">...</span>
                    ) : (
                      <>
                        <UserMinus className="w-4 h-4 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              ))
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
