import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTripRoles } from '@/hooks/useTripRoles';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users } from 'lucide-react';
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

interface BulkRoleAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
}

interface TripMember {
  user_id: string;
  profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export const BulkRoleAssignmentDialog: React.FC<BulkRoleAssignmentDialogProps> = ({
  open,
  onOpenChange,
  tripId
}) => {
  const { roles, isLoading: loadingRoles } = useTripRoles({ tripId });
  const { assignRole, isProcessing } = useRoleAssignments({ tripId });
  const [members, setMembers] = useState<TripMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, tripId]);

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('trip_members')
        .select(`
          user_id,
          profile:profiles!inner(
            display_name,
            avatar_url
          )
        `)
        .eq('trip_id', tripId);

      if (error) throw error;
      setMembers((data || []) as any);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoadingMembers(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const updated = new Set(prev);
      if (updated.has(userId)) {
        updated.delete(userId);
      } else {
        updated.add(userId);
      }
      return updated;
    });
  };

  const toggleAll = () => {
    if (selectedMembers.size === members.length) {
      setSelectedMembers(new Set());
    } else {
      setSelectedMembers(new Set(members.map(m => m.user_id)));
    }
  };

  const handleAssign = async () => {
    if (!selectedRole || selectedMembers.size === 0) {
      toast.error('Please select a role and at least one member');
      return;
    }

    try {
      const assignmentPromises = Array.from(selectedMembers).map(userId =>
        assignRole(userId, selectedRole)
      );

      await Promise.all(assignmentPromises);

      toast.success(`Assigned role to ${selectedMembers.size} member${selectedMembers.size > 1 ? 's' : ''}`);
      setSelectedMembers(new Set());
      setSelectedRole('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast.error('Failed to assign roles');
    }
  };

  const isLoading = loadingRoles || loadingMembers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-background border-white/10">
        <DialogHeader>
          <DialogTitle>Assign Roles to Multiple Members</DialogTitle>
          <DialogDescription>
            Select team members and assign them a role to grant channel access and permissions
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Select Role</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="rounded-full bg-background/50 border-white/10">
                  <SelectValue placeholder="Choose a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.roleName}</span>
                        <span className="text-xs text-muted-foreground">
                          ({role.memberCount} members)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member Selection */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-foreground">
                  Select Members ({selectedMembers.size} / {members.length})
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAll}
                  className="h-8 text-xs rounded-full"
                >
                  {selectedMembers.size === members.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No team members found</p>
                  </div>
                ) : (
                  members.map((member) => {
                    const profile = member.profile as any;
                    const isSelected = selectedMembers.has(member.user_id);

                    return (
                      <div
                        key={member.user_id}
                        onClick={() => toggleMember(member.user_id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/10 border-primary/40'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleMember(member.user_id)}
                        />
                        <Avatar className="h-10 w-10 border-2 border-white/10">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback className="bg-primary/20 text-primary text-sm">
                            {profile?.display_name?.[0]?.toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {profile?.display_name || 'Former Member'}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedRole || selectedMembers.size === 0 || isProcessing}
            className="rounded-full bg-primary hover:bg-primary/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              `Assign to ${selectedMembers.size} Member${selectedMembers.size !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
