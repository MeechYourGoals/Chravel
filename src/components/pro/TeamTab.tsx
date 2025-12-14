import React, { useState, useEffect, useCallback } from 'react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { RolesView } from './team/RolesView';
import { Button } from '@/components/ui/button';
import { CreateRoleDialog } from './admin/CreateRoleDialog';
import { AssignRoleDialog } from './admin/AssignRoleDialog';
import { useProTripAdmin } from '@/hooks/useProTripAdmin';
import { supabase } from '@/integrations/supabase/client';
import { TripRole } from '@/types/roleChannels';
import { Plus, UserPlus } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

interface TeamTabProps {
  roster: ProParticipant[];
  userRole: string;
  isReadOnly?: boolean;
  category: ProTripCategory;
  tripId?: string;
  onUpdateMemberRole?: (memberId: string, newRole: string) => Promise<void>;
  trip?: any;
  tripCreatorId?: string;
}

export const TeamTab = ({ roster, userRole, isReadOnly = false, category, tripId, onUpdateMemberRole, trip, tripCreatorId }: TeamTabProps) => {
  const { isAdmin, hasPermission, isLoading: adminLoading } = useProTripAdmin(tripId || '');
  const { isDemoMode } = useDemoMode();
  const { isSuperAdmin } = useSuperAdmin();
  const [roles, setRoles] = useState<TripRole[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);
  const [assignRoleOpen, setAssignRoleOpen] = useState(false);

  // Super admins never have read-only restrictions
  const effectiveIsReadOnly = isSuperAdmin ? false : isReadOnly;

  const loadRoles = useCallback(async () => {
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
  }, [tripId]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // ✅ Keep trip-scoped roles fresh (inline creation / multi-admin edits)
  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const ch = supabase
      .channel(`teamtab-roles:${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trip_roles', filter: `trip_id=eq.${tripId}` },
        () => { loadRoles(); },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [tripId, isDemoMode, loadRoles]);

  const handleRoleCreated = () => {
    loadRoles();
  };

  const handleRoleAssigned = () => {
    loadRoles();
    // Optionally refresh roster data
  };

  // Super admins always have full role management capabilities
  const canManageRoles = isSuperAdmin || (isAdmin && hasPermission('can_manage_roles')) || isDemoMode;

  return (
    <div className="space-y-6 w-full">
      {/* Roles View */}
      <RolesView
        roster={roster}
        userRole={isSuperAdmin ? 'admin' : userRole}
        isReadOnly={effectiveIsReadOnly}
        category={category}
        onUpdateMemberRole={onUpdateMemberRole}
        canManageRoles={canManageRoles}
        onCreateRole={() => setCreateRoleOpen(true)}
        isLoadingRoles={isLoadingRoles}
        adminLoading={adminLoading}
        tripId={tripId}
        tripCreatorId={tripCreatorId}
        trip={trip}
        availableRoles={roles}
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