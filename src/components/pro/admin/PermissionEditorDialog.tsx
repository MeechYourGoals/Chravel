import React, { useState, useEffect } from 'react';
import { TripRole } from '@/types/roleChannels';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Lock, Image, CheckSquare, Calendar, MessageSquare, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface PermissionEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: TripRole | null;
  onSave: (roleId: string, permissionLevel: string, featurePermissions: any) => Promise<void>;
}

export const PermissionEditorDialog: React.FC<PermissionEditorDialogProps> = ({
  open,
  onOpenChange,
  role,
  onSave
}) => {
  const [permissionLevel, setPermissionLevel] = useState<'view' | 'edit' | 'admin'>('edit');
  const [permissions, setPermissions] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (role) {
      setPermissionLevel(role.permissionLevel);
      setPermissions(role.featurePermissions || getDefaultPermissions());
    }
  }, [role]);

  const getDefaultPermissions = () => ({
    media: {
      can_view: true,
      can_upload: true,
      can_delete_own: true,
      can_delete_any: false
    },
    tasks: {
      can_view: true,
      can_create: true,
      can_assign: false,
      can_complete: true,
      can_delete: false
    },
    calendar: {
      can_view: true,
      can_create_events: true,
      can_edit_events: false,
      can_delete_events: false
    },
    channels: {
      can_view: true,
      can_post: true,
      can_edit_messages: false,
      can_delete_messages: false,
      can_manage_members: false
    },
    payments: {
      can_view: true,
      can_create: false,
      can_approve: false
    }
  });

  const updatePermission = (category: string, permission: string, value: boolean) => {
    setPermissions((prev: any) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [permission]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!role) return;

    setIsSaving(true);
    try {
      await onSave(role.id, permissionLevel, permissions);
      toast.success('Permissions updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to update permissions');
    } finally {
      setIsSaving(false);
    }
  };

  if (!role) return null;

  const permissionCategories = [
    {
      id: 'media',
      label: 'Media',
      icon: Image,
      permissions: [
        { key: 'can_view', label: 'View Media', description: 'View photos, videos, and files' },
        { key: 'can_upload', label: 'Upload Media', description: 'Upload new media files' },
        { key: 'can_delete_own', label: 'Delete Own', description: 'Delete own uploaded media' },
        { key: 'can_delete_any', label: 'Delete Any', description: 'Delete media from anyone' }
      ]
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      permissions: [
        { key: 'can_view', label: 'View Tasks', description: 'See all tasks' },
        { key: 'can_create', label: 'Create Tasks', description: 'Create new tasks' },
        { key: 'can_assign', label: 'Assign Tasks', description: 'Assign tasks to members' },
        { key: 'can_complete', label: 'Complete Tasks', description: 'Mark tasks as complete' },
        { key: 'can_delete', label: 'Delete Tasks', description: 'Delete any task' }
      ]
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      permissions: [
        { key: 'can_view', label: 'View Events', description: 'See calendar events' },
        { key: 'can_create_events', label: 'Create Events', description: 'Add new calendar events' },
        { key: 'can_edit_events', label: 'Edit Events', description: 'Modify any event' },
        { key: 'can_delete_events', label: 'Delete Events', description: 'Remove any event' }
      ]
    },
    {
      id: 'channels',
      label: 'Channels',
      icon: MessageSquare,
      permissions: [
        { key: 'can_view', label: 'View Channels', description: 'Access role-based channels' },
        { key: 'can_post', label: 'Post Messages', description: 'Send messages in channels' },
        { key: 'can_edit_messages', label: 'Edit Messages', description: 'Edit any message' },
        { key: 'can_delete_messages', label: 'Delete Messages', description: 'Delete any message' },
        { key: 'can_manage_members', label: 'Manage Members', description: 'Add/remove channel members' }
      ]
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: DollarSign,
      permissions: [
        { key: 'can_view', label: 'View Payments', description: 'See payment details' },
        { key: 'can_create', label: 'Create Payments', description: 'Create payment splits' },
        { key: 'can_approve', label: 'Approve Payments', description: 'Approve payment requests' }
      ]
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-background border-white/10">
        <DialogHeader>
          <DialogTitle>Edit Permissions: {role.roleName}</DialogTitle>
          <DialogDescription>
            Configure feature permissions for this role. Changes apply to all members with this role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto">
          {/* Permission Level */}
          <div className="space-y-2 pb-4 border-b border-white/10">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Lock className="w-4 h-4" />
              Permission Level
            </Label>
            <Select value={permissionLevel} onValueChange={(v: any) => setPermissionLevel(v)}>
              <SelectTrigger className="rounded-full bg-background/50 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="view">
                  <div>
                    <div className="font-medium">View</div>
                    <div className="text-xs text-muted-foreground">Read-only access</div>
                  </div>
                </SelectItem>
                <SelectItem value="edit">
                  <div>
                    <div className="font-medium">Edit</div>
                    <div className="text-xs text-muted-foreground">Create and modify own content</div>
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div>
                    <div className="font-medium">Admin</div>
                    <div className="text-xs text-muted-foreground">Full control over all content</div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Feature Permissions */}
          <Tabs defaultValue="media" className="flex-1">
            <TabsList className="grid grid-cols-5 w-full">
              {permissionCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <TabsTrigger key={category.id} value={category.id} className="gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{category.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {permissionCategories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="space-y-4 mt-4">
                {category.permissions.map((perm) => {
                  const isEnabled = permissions[category.id]?.[perm.key] ?? false;

                  return (
                    <div
                      key={perm.key}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex-1">
                        <Label htmlFor={`${category.id}-${perm.key}`} className="text-sm font-medium cursor-pointer">
                          {perm.label}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {perm.description}
                        </p>
                      </div>
                      <Switch
                        id={`${category.id}-${perm.key}`}
                        checked={isEnabled}
                        onCheckedChange={(checked) => updatePermission(category.id, perm.key, checked)}
                      />
                    </div>
                  );
                })}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-full bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Permissions'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
