import React, { useState, useMemo } from 'react';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';
import { useTripRoles } from '@/hooks/useTripRoles';
import { useTripAdmins } from '@/hooks/useTripAdmins';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserCheck, X, Shield } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface RoleAssignmentPanelProps {
  tripId: string;
  tripCreatorId?: string;
}

export const RoleAssignmentPanel: React.FC<RoleAssignmentPanelProps> = ({
  tripId,
  tripCreatorId,
}) => {
  const {
    assignments,
    isLoading: loadingAssignments,
    isProcessing,
    assignRole,
    removeRole,
  } = useRoleAssignments({ tripId });
  const { roles, isLoading: loadingRoles } = useTripRoles({ tripId });
  const {
    admins,
    isLoading: loadingAdmins,
    isProcessing: adminProcessing,
    promoteToAdmin,
    demoteFromAdmin,
  } = useTripAdmins({ tripId });
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  // Create a set of admin user IDs for quick lookup
  const adminUserIds = useMemo(() => {
    return new Set(admins.map(a => a.user_id));
  }, [admins]);

  const handleAssignRole = async (userId: string) => {
    const roleId = selectedRoles[userId];
    if (!roleId) return;

    await assignRole(userId, roleId);
    setSelectedRoles(prev => ({ ...prev, [userId]: '' }));
  };

  const handleToggleAdmin = async (userId: string) => {
    // Don't allow demoting the trip creator
    if (userId === tripCreatorId) return;

    if (adminUserIds.has(userId)) {
      await demoteFromAdmin(userId);
    } else {
      await promoteToAdmin(userId);
    }
  };

  if (loadingAssignments || loadingRoles || loadingAdmins) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading assignments...</p>
        </div>
      </Card>
    );
  }

  if (roles.length === 0) {
    return (
      <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
        <div className="text-center py-8">
          <UserCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h4 className="font-semibold text-foreground mb-1">No Roles Available</h4>
          <p className="text-sm text-muted-foreground">
            Create roles first to assign them to team members
          </p>
        </div>
      </Card>
    );
  }

  // Group assignments by user
  const userAssignments = assignments.reduce(
    (acc, assignment) => {
      if (!acc[assignment.user_id]) {
        acc[assignment.user_id] = {
          profile: assignment.user_profile,
          roles: [],
        };
      }
      acc[assignment.user_id].roles.push(assignment);
      return acc;
    },
    {} as Record<string, { profile?: any; roles: typeof assignments }>,
  );

  return (
    <Card className="p-6 bg-background/40 backdrop-blur-sm border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-foreground">Role Assignments</h3>
          <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full">
            {Object.keys(userAssignments).length}
          </span>
        </div>
      </div>

      {Object.keys(userAssignments).length === 0 ? (
        <div className="text-center py-8">
          <UserCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h4 className="font-semibold text-foreground mb-1">No Role Assignments</h4>
          <p className="text-sm text-muted-foreground">
            Assign roles to team members to give them access to specific channels
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(userAssignments).map(([userId, data]) => {
            const currentRole = data.roles[0]; // Primary role
            const isUserAdmin = adminUserIds.has(userId);
            const isTripCreator = userId === tripCreatorId;

            return (
              <div
                key={userId}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10 border-2 border-white/10 shrink-0">
                    <AvatarImage src={data.profile?.avatar_url} />
                    <AvatarFallback className="bg-green-500/20 text-green-500 text-sm">
                      {data.profile?.display_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground text-sm truncate flex items-center gap-2">
                      {data.profile?.display_name || 'Former Member'}
                      {isTripCreator && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded-full shrink-0">
                          Creator
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {currentRole?.role?.roleName || 'No role assigned'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                  <Select
                    value={selectedRoles[userId] || ''}
                    onValueChange={value =>
                      setSelectedRoles(prev => ({ ...prev, [userId]: value }))
                    }
                  >
                    <SelectTrigger className="w-[120px] sm:w-[150px] rounded-full bg-white/5 border-white/10 h-8 text-xs">
                      <SelectValue placeholder="Change role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.roleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Admin toggle button */}
                  <Button
                    size="sm"
                    variant={isUserAdmin ? 'default' : 'outline'}
                    onClick={() => handleToggleAdmin(userId)}
                    disabled={adminProcessing || isTripCreator}
                    className={cn(
                      'rounded-full h-8 px-2.5 shrink-0',
                      isUserAdmin
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'border-white/20 hover:bg-blue-500/10 hover:border-blue-500/50',
                    )}
                    title={
                      isTripCreator
                        ? 'Trip creator is always admin'
                        : isUserAdmin
                          ? 'Remove admin privileges'
                          : 'Make admin'
                    }
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {isUserAdmin && <span className="ml-1 text-xs hidden sm:inline">Admin</span>}
                  </Button>

                  {selectedRoles[userId] && (
                    <Button
                      size="sm"
                      onClick={() => handleAssignRole(userId)}
                      disabled={isProcessing}
                      className="rounded-full bg-green-600 hover:bg-green-700 h-8 px-2.5 text-xs"
                    >
                      Assign
                    </Button>
                  )}

                  {currentRole && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => removeRole(userId, currentRole.role_id)}
                      disabled={isProcessing}
                      className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 h-8 w-8"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
