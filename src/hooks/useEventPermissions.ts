/**
 * Event Permissions Hook
 *
 * Provides role-based access control utilities for Events (Pro/Enterprise feature).
 * Integrates with Supabase trip_roles, user_trip_roles, and trip_channels tables.
 *
 * Permission Matrix:
 * | Feature   | Attendee                    | Organizer/Admin             |
 * |-----------|-----------------------------|-----------------------------|
 * | Agenda    | View only                   | Create, Edit, Delete, Upload|
 * | Calendar  | View only                   | Create, Edit, Delete        |
 * | Chat      | Full access (send/receive)  | Full access + moderation    |
 * | Media     | Upload, Download, Delete own| Upload, Download, Delete any|
 * | Line-up   | View only                   | Create, Edit, Delete        |
 * | Polls     | Vote only                   | Create, Close, Delete + Vote|
 * | Tasks     | View only                   | Create, Edit, Delete        |
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import type { EventFeaturePermissions } from '@/types/roleChannels';

export interface ChannelPermission {
  channelId: string;
  canView: boolean;
  canEdit: boolean;
  canPost: boolean;
}

export interface UserRole {
  roleId: string;
  roleName: string;
  isPrimary: boolean;
}

/**
 * Hook to check if user can access a channel and get event-specific permissions
 * Uses Supabase function can_access_channel(user_id, channel_id)
 */
export const useEventPermissions = (tripId: string) => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [channelPermissions, setChannelPermissions] = useState<Map<string, ChannelPermission>>(
    new Map(),
  );

  // Determine if user is an organizer (admin, creator, or has organizer role)
  const isOrganizer = useMemo(() => {
    if (isDemoMode) return true; // Demo mode = full access
    if (isAdmin || isCreator) return true;
    // Check for 'Organizer' role in userRoles
    return userRoles.some(
      r => r.roleName.toLowerCase() === 'organizer' || r.roleName.toLowerCase() === 'admin',
    );
  }, [isDemoMode, isAdmin, isCreator, userRoles]);

  // Generate event-specific permissions based on organizer status
  const eventPermissions: EventFeaturePermissions = useMemo(
    () => ({
      agenda: {
        canView: true,
        canCreate: isOrganizer,
        canEdit: isOrganizer,
        canDelete: isOrganizer,
        canUpload: isOrganizer,
      },
      calendar: {
        canView: true,
        canCreate: isOrganizer,
        canEdit: isOrganizer,
        canDelete: isOrganizer,
      },
      chat: {
        canView: true,
        canSend: true, // All members can send
        canDeleteOwn: true, // All can delete their own
        canDeleteAny: isOrganizer, // Only organizers can moderate
      },
      media: {
        canView: true,
        canUpload: true, // All members can upload (encouraged for photo sharing)
        canDeleteOwn: true, // All can delete their own
        canDeleteAny: isOrganizer, // Only organizers can moderate
      },
      lineup: {
        canView: true,
        canCreate: isOrganizer,
        canEdit: isOrganizer,
        canDelete: isOrganizer,
      },
      polls: {
        canView: true,
        canVote: true, // All members can vote
        canCreate: isOrganizer,
        canClose: isOrganizer,
        canDelete: isOrganizer,
      },
      tasks: {
        canView: true,
        canCreate: isOrganizer,
        canEdit: isOrganizer,
        canDelete: isOrganizer,
      },
    }),
    [isOrganizer],
  );

  // Load user's roles and determine organizer status
  const loadUserRoles = useCallback(async () => {
    if (!user?.id || !tripId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Check if user is trip creator
      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('created_by')
        .eq('id', tripId)
        .single();

      if (!tripError && tripData) {
        setIsCreator(tripData.created_by === user.id);
      }

      // Get user's roles for this trip
      const { data: roleAssignments, error: rolesError } = await supabase
        .from('user_trip_roles')
        .select(
          `
          id,
          role_id,
          is_primary,
          trip_roles:role_id (
            id,
            role_name
          )
        `,
        )
        .eq('trip_id', tripId)
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Failed to load user roles:', rolesError);
        setIsLoading(false);
        return;
      }

      const roles: UserRole[] = (roleAssignments || []).map((assignment: any) => ({
        roleId: assignment.role_id,
        roleName: assignment.trip_roles?.role_name || 'Unknown',
        isPrimary: assignment.is_primary ?? true,
      }));

      setUserRoles(roles);

      // Check if user is trip admin
      const { data: adminCheck, error: adminError } = await supabase
        .from('trip_admins')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();

      setIsAdmin(!!adminCheck && !adminError);

      // Load channel permissions
      await loadChannelPermissions(roles);
    } catch (error) {
      console.error('Error loading user roles:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, tripId]);

  // Load permissions for all channels user can access
  const loadChannelPermissions = useCallback(
    async (roles: UserRole[]) => {
      if (!user?.id || !tripId) return;

      try {
        // Get all channels for this trip
        const { data: channels, error: channelsError } = await supabase
          .from('trip_channels')
          .select(
            `
          id,
          channel_name,
          channel_slug,
          is_private,
          channel_role_access:channel_role_access (
            role_id
          )
        `,
          )
          .eq('trip_id', tripId)
          .eq('is_archived', false);

        if (channelsError) {
          console.error('Failed to load channels:', channelsError);
          return;
        }

        const permissionsMap = new Map<string, ChannelPermission>();
        const userRoleIds = roles.map(r => r.roleId);

        // Check access for each channel
        for (const channel of channels || []) {
          const channelRoleIds = (channel.channel_role_access || []).map((cra: any) => cra.role_id);
          const hasAccess = userRoleIds.some(roleId => channelRoleIds.includes(roleId)) || isAdmin;

          if (hasAccess) {
            permissionsMap.set(channel.id, {
              channelId: channel.id,
              canView: true,
              canEdit: isAdmin || roles.some(r => r.isPrimary && channelRoleIds.includes(r.roleId)),
              canPost: true,
            });
          }
        }

        setChannelPermissions(permissionsMap);
      } catch (error) {
        console.error('Error loading channel permissions:', error);
      }
    },
    [user?.id, tripId, isAdmin],
  );

  // Check if user can access a specific channel
  const canAccessChannel = useCallback(
    async (channelId: string): Promise<boolean> => {
      if (!user?.id) return false;
      if (isAdmin) return true;

      try {
        const { data, error } = await supabase.rpc('can_access_channel', {
          _user_id: user.id,
          _channel_id: channelId,
        });

        if (error) {
          console.error('Error checking channel access:', error);
          return false;
        }

        return !!data;
      } catch (error) {
        console.error('Error checking channel access:', error);
        return false;
      }
    },
    [user?.id, isAdmin],
  );

  // Check if user has specific admin permission
  const hasAdminPermission = useCallback(
    async (
      permission: 'can_manage_roles' | 'can_manage_channels' | 'can_designate_admins',
    ): Promise<boolean> => {
      if (!user?.id || !tripId) return false;

      try {
        const { data, error } = await supabase.rpc('has_admin_permission', {
          _user_id: user.id,
          _trip_id: tripId,
          _permission: permission,
        });

        if (error) {
          console.error('Error checking admin permission:', error);
          return false;
        }

        return !!data;
      } catch (error) {
        console.error('Error checking admin permission:', error);
        return false;
      }
    },
    [user?.id, tripId],
  );

  useEffect(() => {
    loadUserRoles();
  }, [loadUserRoles]);

  return {
    userRoles,
    isAdmin,
    isCreator,
    isOrganizer,
    isLoading,
    channelPermissions,
    eventPermissions,
    canAccessChannel,
    hasAdminPermission,
    refreshPermissions: loadUserRoles,
  };
};
