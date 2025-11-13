import React, { useState } from 'react';
import { useTripRoles } from '@/hooks/useTripRoles';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users, Plus, Trash2, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoleManagerProps {
  tripId: string;
}

export const RoleManager: React.FC<RoleManagerProps> = ({ tripId }) => {
  const { roles, isLoading, isProcessing, createRole, deleteRole } = useTripRoles({ tripId });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'admin'>('edit');

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
              {roles.length} / 5
            </span>
          </div>

          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={roles.length >= 5}
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
            {roles.map((role) => {
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

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteRole(role.id)}
                    disabled={isProcessing}
                    className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[425px] bg-background border-white/10">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role for your team. A private channel will be automatically created for this role.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., Tour Manager, Security, VIP"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="rounded-full bg-white/5 border-white/10"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="permission-level">Permission Level</Label>
              <Select
                value={permissionLevel}
                onValueChange={(v) => setPermissionLevel(v as any)}
              >
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
    </>
  );
};
