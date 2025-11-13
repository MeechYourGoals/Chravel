import React, { useState, useEffect } from 'react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { RolesView } from './team/RolesView';
import { Button } from '@/components/ui/button';
import { CreateRoleDialog } from './admin/CreateRoleDialog';
import { AssignRoleDialog } from './admin/AssignRoleDialog';
import { useProTripAdmin } from '@/hooks/useProTripAdmin';
import { supabase } from '@/integrations/supabase/client';
import { TripRole } from '@/types/roleChannels';
import { Plus, UserPlus, Shield } from 'lucide-react';

interface TeamTabProps {
  roster: ProParticipant[];
  userRole: string;
  isReadOnly?: boolean;
  category: ProTripCategory;
  tripId?: string;
  onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>;
}

export const TeamTab = ({ roster, userRole, isReadOnly = false, category, tripId, onUpdateMemberRole }: TeamTabProps) => {
  const { isAdmin, hasPermission, isLoading: adminLoading } = useProTripAdmin(tripId || '');
  const [roles, setRoles] = useState<TripRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);

  const loadRoles = async () => {
    if (!tripId) return;

    setIsLoadingRoles(true);
    try {
      const { data, error } = await supabase
        .from('trip_roles')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Map database fields to TripRole type
      const mappedRoles: TripRole[] = (data || []).map(role => ({
        id: role.id,
        tripId: role.trip_id,
        roleName: role.role_name,
        description: role.description || undefined,
        permissionLevel: role.permission_level as any,
        featurePermissions: role.feature_permissions as any,
        createdBy: role.created_by,
        createdAt: role.created_at,
        updatedAt: role.updated_at
      }));
      
      setRoles(mappedRoles);
    } catch (error) {
      console.error('Error loading roles:', error);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, [tripId]);

  const handleRoleCreated = () => {
    loadRoles();
  };

  const handleRoleAssigned = () => {
    loadRoles();
    // Optionally refresh roster data
  };

  const canManageRoles = isAdmin && hasPermission('can_manage_roles');

  return (
    <div className="space-y-6">
      {/* Admin Controls */}
      {canManageRoles && !isReadOnly && (
        <div className="flex items-center justify-between p-4 bg-accent/30 border border-border rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <div className="font-medium">Admin Controls</div>
              <div className="text-sm text-muted-foreground">
                Manage roles and assignments for this trip
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setCreateRoleOpen(true)}
              disabled={adminLoading || isLoadingRoles}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
            <Button
              onClick={() => setAssignRoleOpen(true)}
              variant="outline"
              disabled={adminLoading || isLoadingRoles || roles.length === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Assign Roles
            </Button>
          </div>
        </div>
      )}

      {/* Roles View */}
      <RolesView
        roster={roster}
        userRole={userRole}
        isReadOnly={isReadOnly}
        category={category}
        onUpdateMemberRole={onUpdateMemberRole}
      />

      {/* Dialogs */}
      {tripId && (
        <>
          <CreateRoleDialog
            open={createRoleOpen}
            onOpenChange={setCreateRoleOpen}
            tripId={tripId}
            currentRoleCount={roles.length}
            onRoleCreated={handleRoleCreated}
          />
          <AssignRoleDialog
            open={assignRoleOpen}
            onOpenChange={setAssignRoleOpen}
            tripId={tripId}
            members={roster}
            roles={roles}
            onRoleAssigned={handleRoleAssigned}
          />
        </>
      )}
    </div>
  );
};