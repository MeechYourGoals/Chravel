import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PermissionLevel } from '@/types/roleChannels';
import { Shield, Users, Eye } from 'lucide-react';
import { validateRole, normalizeRole, MAX_ROLES_PER_TRIP } from '@/utils/roleUtils';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  currentRoleCount: number;
  onRoleCreated: () => void;
}

export const CreateRoleDialog: React.FC<CreateRoleDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  currentRoleCount,
  onRoleCreated
}) => {
  const { toast } = useToast();
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate role count
    if (currentRoleCount >= MAX_ROLES_PER_TRIP) {
      toast({
        title: 'Role Limit Reached',
        description: `Maximum ${MAX_ROLES_PER_TRIP} roles allowed per trip for MVP`,
        variant: 'destructive'
      });
      return;
    }

    // Validate role name
    const normalized = normalizeRole(roleName);
    const validation = validateRole(normalized);
    
    if (!validation.isValid) {
      toast({
        title: 'Invalid Role Name',
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create role
      const { error } = await supabase
        .from('trip_roles')
        .insert({
          trip_id: tripId,
          role_name: normalized,
          description: description.trim() || null,
          permission_level: permissionLevel,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: 'Role Created',
        description: `Successfully created "${normalized}" role`
      });

      // Reset form
      setRoleName('');
      setDescription('');
      setPermissionLevel('edit');
      onOpenChange(false);
      onRoleCreated();
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: 'Failed to Create Role',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const permissionIcons = {
    admin: Shield,
    edit: Users,
    view: Eye
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Create a custom role for this trip ({currentRoleCount} / {MAX_ROLES_PER_TRIP} roles used)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name *</Label>
            <Input
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g., Assistant Coach, Tour Manager"
              maxLength={50}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the responsibilities of this role..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="permissionLevel">Permission Level *</Label>
            <Select value={permissionLevel} onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}>
              <SelectTrigger id="permissionLevel">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="font-medium">Admin</div>
                      <div className="text-xs text-muted-foreground">Full control over all features</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="font-medium">Edit</div>
                      <div className="text-xs text-muted-foreground">Can create and modify content</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="view">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="font-medium">View</div>
                      <div className="text-xs text-muted-foreground">Read-only access</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Role'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
