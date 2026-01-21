import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { PermissionLevel } from '@/types/roleChannels';
import { Shield, Users, Eye } from 'lucide-react';
import { validateRole, normalizeRole, MAX_ROLES_PER_TRIP } from '@/utils/roleUtils';
import { useTripRoles } from '@/hooks/useTripRoles';

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  currentRoleCount: number;
  onRoleCreated: () => void;
}

const getFeaturePermissions = (level: PermissionLevel, hasChannel: boolean) => {
  const isViewOnly = level === 'view';
  const isAdmin = level === 'admin';

  return {
    media: {
      can_view: true,
      can_upload: !isViewOnly,
      can_delete_own: !isViewOnly,
      can_delete_any: isAdmin
    },
    tasks: {
      can_view: true,
      can_create: !isViewOnly,
      can_assign: isAdmin,
      can_complete: !isViewOnly,
      can_delete: isAdmin
    },
    calendar: {
      can_view: true,
      can_create_events: !isViewOnly,
      can_edit_events: isAdmin,
      can_delete_events: isAdmin
    },
    channels: {
      can_view: true,
      can_post: !isViewOnly,
      can_edit_messages: isAdmin,
      can_delete_messages: isAdmin,
      can_manage_members: isAdmin,
      has_channel: hasChannel
    },
    payments: {
      can_view: true,
      can_create: isAdmin,
      can_approve: isAdmin
    }
  };
};

export const CreateRoleDialog: React.FC<CreateRoleDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  currentRoleCount,
  onRoleCreated
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { createRole, isProcessing } = useTripRoles({ tripId, enabled: !!tripId });
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('edit');
  const [createChannel, setCreateChannel] = useState(true);

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

    try {
      const featurePermissions = getFeaturePermissions(permissionLevel, createChannel);
      await createRole(normalized, permissionLevel, featurePermissions);

      toast({
        title: 'Role Created',
        description: `Successfully created "${normalized}" role`
      });

      // Reset form
      setRoleName('');
      setDescription('');
      setPermissionLevel('edit');
      setCreateChannel(true);
      onOpenChange(false);
      onRoleCreated();
    } catch (error) {
      console.error('Error creating role:', error);
      toast({
        title: 'Failed to Create Role',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const formContent = (
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
          className={isMobile ? 'min-h-[44px]' : ''}
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
          <SelectTrigger id="permissionLevel" className={isMobile ? 'min-h-[44px]' : ''}>
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

      <div className="flex items-center space-x-2 pt-2">
        <Checkbox
          id="createChannel"
          checked={createChannel}
          onCheckedChange={(checked) => setCreateChannel(checked as boolean)}
        />
        <Label htmlFor="createChannel" className="text-sm font-normal cursor-pointer">
          Create a dedicated channel for this role
        </Label>
      </div>

      <div className={`flex gap-2 pt-4 ${isMobile ? 'flex-col' : 'justify-end'}`}>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isProcessing}
          className={isMobile ? 'min-h-[44px] order-2' : ''}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={isProcessing}
          className={isMobile ? 'min-h-[44px] order-1' : ''}
        >
          {isProcessing ? 'Creating...' : 'Create Role'}
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Create New Role</SheetTitle>
            <SheetDescription>
              Create a custom role for this trip ({currentRoleCount} / {MAX_ROLES_PER_TRIP} roles used)
            </SheetDescription>
          </SheetHeader>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Role</DialogTitle>
          <DialogDescription>
            Create a custom role for this trip ({currentRoleCount} / {MAX_ROLES_PER_TRIP} roles used)
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
};
