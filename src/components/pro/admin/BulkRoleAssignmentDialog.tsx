import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTripRoles } from '@/hooks/useTripRoles';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';
import { useTripAdmins } from '@/hooks/useTripAdmins';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Shield } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
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
    email?: string;
  };
}

export const BulkRoleAssignmentDialog: React.FC<BulkRoleAssignmentDialogProps> = ({
  open,
  onOpenChange,
  tripId
}) => {
  const { roles, isLoading: loadingRoles } = useTripRoles({ tripId });
  const { assignRole, isProcessing } = useRoleAssignments({ tripId });
  const { admins, promoteToAdmin, isProcessing: isPromotingAdmin } = useTripAdmins({ tripId });
  const [members, setMembers] = useState<TripMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [grantAdminAccess, setGrantAdminAccess] = useState(false);

  // Get list of current admin user IDs for UI display
  const adminUserIds = new Set(admins.map(a => a.user_id));

  useEffect(() => {
    if (open) {
      fetchMembers();
    } else {
      // Reset state when dialog closes
      setSelectedMembers(new Set());
      setSelectedRole('');
      setGrantAdminAccess(false);
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
            avatar_url,
            email
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
      // Assign roles to all selected members
      const assignmentPromises = Array.from(selectedMembers).map(userId =>
        assignRole(userId, selectedRole)
      );
      await Promise.all(assignmentPromises);

      // If admin checkbox is checked, also promote selected members to admin
      if (grantAdminAccess) {
        const membersToPromote = Array.from(selectedMembers).filter(
          userId => !adminUserIds.has(userId)
        );
        
        if (membersToPromote.length > 0) {
          const adminPromises = membersToPromote.map(userId =>
            promoteToAdmin(userId).catch(err => {
              console.warn(`Failed to promote user ${userId} to admin:`, err);
              return null; // Don't fail the whole operation
            })
          );
          await Promise.all(adminPromises);
          
          toast.success(
            `Assigned role to ${selectedMembers.size} member${selectedMembers.size > 1 ? 's' : ''} and granted admin access to ${membersToPromote.length}`
          );
        } else {
          toast.success(`Assigned role to ${selectedMembers.size} member${selectedMembers.size > 1 ? 's' : ''} (all already admins)`);
        }
      } else {
        toast.success(`Assigned role to ${selectedMembers.size} member${selectedMembers.size > 1 ? 's' : ''}`);
      }

      setSelectedMembers(new Set());
      setSelectedRole('');
      setGrantAdminAccess(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning roles:', error);
      toast.error('Failed to assign roles');
    }
  };

  const isLoading = loadingRoles || loadingMembers;
  const isSubmitting = isProcessing || isPromotingAdmin;
  
  // Count how many selected members are not already admins
  const nonAdminSelectedCount = Array.from(selectedMembers).filter(
    userId => !adminUserIds.has(userId)
  ).length;

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

            {/* Admin Access Checkbox */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <Checkbox
                id="grant-admin"
                checked={grantAdminAccess}
                onCheckedChange={(checked) => setGrantAdminAccess(checked === true)}
                className="mt-0.5 border-blue-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <div className="flex-1">
                <Label
                  htmlFor="grant-admin"
                  className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-blue-500" />
                  Also grant Admin access
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Admins can manage roles, channels, and approve join requests for Pro/Event trips
                </p>
                {grantAdminAccess && selectedMembers.size > 0 && (
                  <p className="text-xs text-blue-400 mt-2">
                    {nonAdminSelectedCount === 0 
                      ? '✓ All selected members are already admins'
                      : `Will grant admin access to ${nonAdminSelectedCount} member${nonAdminSelectedCount !== 1 ? 's' : ''}`
                    }
                  </p>
                )}
              </div>
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
                    const isAlreadyAdmin = adminUserIds.has(member.user_id);

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
                            {profile?.display_name?.[0]?.toUpperCase() || 
                             profile?.email?.[0]?.toUpperCase() || 
                             '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground truncate">
                              {profile?.display_name || 'Unknown User'}
                            </p>
                            {isAlreadyAdmin && (
                              <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {profile?.email}
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedRole || selectedMembers.size === 0 || isSubmitting}
            className="rounded-full bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {grantAdminAccess ? 'Assigning & Promoting...' : 'Assigning...'}
              </>
            ) : (
              <>
                {grantAdminAccess && <Shield className="w-4 h-4 mr-2" />}
                {`Assign to ${selectedMembers.size} Member${selectedMembers.size !== 1 ? 's' : ''}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
