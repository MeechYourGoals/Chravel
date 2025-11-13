import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ProParticipant } from '@/types/pro';
import { TripRole } from '@/types/roleChannels';
import { Users, UserPlus } from 'lucide-react';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';

interface AssignRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  members: ProParticipant[];
  roles: TripRole[];
  onRoleAssigned: () => void;
}

export const AssignRoleDialog: React.FC<AssignRoleDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  members,
  roles,
  onRoleAssigned
}) => {
  const { toast } = useToast();
  const { assignRole, isProcessing } = useRoleAssignments({ tripId, enabled: !!tripId });
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole || selectedMembers.length === 0) {
      toast({
        title: 'Missing Selection',
        description: 'Please select a role and at least one member',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Assign role to each selected member
      for (const memberId of selectedMembers) {
        await assignRole(memberId, selectedRole);
      }

      toast({
        title: 'Roles Assigned',
        description: `Successfully assigned role to ${selectedMembers.length} member(s)`
      });

      // Reset form
      setSelectedRole('');
      setSelectedMembers([]);
      onOpenChange(false);
      onRoleAssigned();
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast({
        title: 'Failed to Assign Roles',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleAll = () => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(m => m.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Role to Members</DialogTitle>
          <DialogDescription>
            Select members and assign them a role
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role..." />
              </SelectTrigger>
              <SelectContent>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    <div>
                      <div className="font-medium">{role.roleName}</div>
                      {role.description && (
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Members *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAll}
              >
                {selectedMembers.length === members.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {members.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No members to assign</p>
                </div>
              ) : (
                <div className="divide-y">
                  {members.map(member => (
                    <label
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-accent/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{member.name}</div>
                        {member.role && (
                          <div className="text-xs text-muted-foreground">
                            Current role: {member.role}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {selectedMembers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedMembers.length} member(s) selected
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isProcessing || selectedMembers.length === 0}>
              <UserPlus className="w-4 h-4 mr-2" />
              {isProcessing ? 'Assigning...' : `Assign to ${selectedMembers.length} Member(s)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
