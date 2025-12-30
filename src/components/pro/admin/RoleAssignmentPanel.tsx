import React, { useState } from 'react';
import { useRoleAssignments } from '@/hooks/useRoleAssignments';
import { useTripRoles } from '@/hooks/useTripRoles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { UserCheck, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoleAssignmentPanelProps {
  tripId: string;
}

export const RoleAssignmentPanel: React.FC<RoleAssignmentPanelProps> = ({ tripId }) => {
  const { assignments, isLoading: loadingAssignments, isProcessing, assignRole, removeRole } = useRoleAssignments({ tripId });
  const { roles, isLoading: loadingRoles } = useTripRoles({ tripId });
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const handleAssignRole = async (userId: string) => {
    const roleId = selectedRoles[userId];
    if (!roleId) return;

    await assignRole(userId, roleId);
    setSelectedRoles(prev => ({ ...prev, [userId]: '' }));
  };

  if (loadingAssignments || loadingRoles) {
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
  const userAssignments = assignments.reduce((acc, assignment) => {
    if (!acc[assignment.user_id]) {
      acc[assignment.user_id] = {
        profile: assignment.user_profile,
        roles: []
      };
    }
    acc[assignment.user_id].roles.push(assignment);
    return acc;
  }, {} as Record<string, { profile?: any; roles: typeof assignments }>);

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
            Assign roles to team members to give them access to specific channels and features
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(userAssignments).map(([userId, data]) => {
            const currentRole = data.roles[0]; // Primary role

            return (
              <div
                key={userId}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10 border-2 border-white/10">
                    <AvatarImage src={data.profile?.avatar_url} />
                    <AvatarFallback className="bg-green-500/20 text-green-500 text-sm">
                      {data.profile?.display_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm">
                      {data.profile?.display_name || 'Unknown User'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {currentRole?.role?.roleName || 'No role assigned'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={selectedRoles[userId] || ''}
                    onValueChange={(value) => 
                      setSelectedRoles(prev => ({ ...prev, [userId]: value }))
                    }
                  >
                    <SelectTrigger className="w-[180px] rounded-full bg-white/5 border-white/10">
                      <SelectValue placeholder="Change role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.roleName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedRoles[userId] && (
                    <Button
                      size="sm"
                      onClick={() => handleAssignRole(userId)}
                      disabled={isProcessing}
                      className="rounded-full bg-green-600 hover:bg-green-700"
                    >
                      Assign
                    </Button>
                  )}

                  {currentRole && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeRole(userId, currentRole.role_id)}
                      disabled={isProcessing}
                      className="rounded-full border-white/20 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
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
