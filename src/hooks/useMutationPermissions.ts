/**
 * useMutationPermissions — Unified permission guard for shared-object mutations.
 *
 * Resolves trip type (consumer / pro / event) and returns flat boolean flags
 * indicating whether the current user can perform each mutation action.
 *
 * Consumer trips: all members can do everything (default behavior, unchanged).
 * Pro trips: delegates to `useRolePermissions` (feature_permissions JSONB).
 * Event trips: delegates to `useEventPermissions` (organizer vs attendee).
 *
 * These are CLIENT-SIDE UX guards only. RLS is the authoritative enforcement layer.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useEventPermissions } from '@/hooks/useEventPermissions';
import { useDemoMode } from '@/hooks/useDemoMode';

type TripType = 'consumer' | 'pro' | 'event';

interface MutationPermissions {
  /** Whether permission data is still loading */
  isLoading: boolean;
  /** Resolved trip type */
  tripType: TripType;
  /** Task mutations */
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  /** Poll mutations */
  canCreatePoll: boolean;
  canClosePoll: boolean;
  canDeletePoll: boolean;
  /** Calendar mutations */
  canCreateEvent: boolean;
  canEditEvent: boolean;
  canDeleteEvent: boolean;
  /** Basecamp mutations */
  canSetBasecamp: boolean;
  /** Explore link mutations */
  canSaveLink: boolean;
}

export function useMutationPermissions(tripId: string): MutationPermissions {
  const { isDemoMode } = useDemoMode();
  const rolePerms = useRolePermissions(tripId);
  const eventPerms = useEventPermissions(tripId);

  // Fetch trip_type (lightweight, cached)
  const { data: tripType = 'consumer', isLoading: typeLoading } = useQuery({
    queryKey: ['tripType', tripId],
    queryFn: async (): Promise<TripType> => {
      if (isDemoMode) return 'consumer';
      const { data, error } = await supabase
        .from('trips')
        .select('trip_type')
        .eq('id', tripId)
        .maybeSingle();
      if (error || !data) return 'consumer';
      const raw = data.trip_type as string | null;
      if (raw === 'pro' || raw === 'event') return raw;
      return 'consumer';
    },
    enabled: !!tripId,
    staleTime: 5 * 60 * 1000, // trip type doesn't change often
    gcTime: 10 * 60 * 1000,
  });

  const isLoading = typeLoading || rolePerms.isLoading || eventPerms.isLoading;

  // Demo mode: everything allowed
  if (isDemoMode) {
    return {
      isLoading: false,
      tripType: 'consumer',
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canCreatePoll: true,
      canClosePoll: true,
      canDeletePoll: true,
      canCreateEvent: true,
      canEditEvent: true,
      canDeleteEvent: true,
      canSetBasecamp: true,
      canSaveLink: true,
    };
  }

  // While permissions load, default to permissive — RLS enforces server-side.
  // This prevents flashing "Permission Denied" toasts for legitimate users.
  if (isLoading) {
    return {
      isLoading: true,
      tripType,
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canCreatePoll: true,
      canClosePoll: true,
      canDeletePoll: true,
      canCreateEvent: true,
      canEditEvent: true,
      canDeleteEvent: true,
      canSetBasecamp: true,
      canSaveLink: true,
    };
  }

  // Consumer trips: all members can do everything
  if (tripType === 'consumer') {
    return {
      isLoading,
      tripType: 'consumer',
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canCreatePoll: true,
      canClosePoll: true,
      canDeletePoll: true,
      canCreateEvent: true,
      canEditEvent: true,
      canDeleteEvent: true,
      canSetBasecamp: true,
      canSaveLink: true,
    };
  }

  // Event trips: organizer-only for most mutations
  if (tripType === 'event') {
    const { isOrganizer } = eventPerms;
    return {
      isLoading,
      tripType: 'event',
      canCreateTask: isOrganizer,
      canEditTask: isOrganizer,
      canDeleteTask: isOrganizer,
      canCreatePoll: isOrganizer,
      canClosePoll: isOrganizer,
      canDeletePoll: isOrganizer,
      canCreateEvent: isOrganizer,
      canEditEvent: isOrganizer,
      canDeleteEvent: isOrganizer,
      canSetBasecamp: isOrganizer,
      canSaveLink: isOrganizer,
    };
  }

  // Pro trips: role-based permissions + admin-only basecamp
  const { canPerformAction, isAdmin } = rolePerms;
  return {
    isLoading,
    tripType: 'pro',
    canCreateTask: canPerformAction('tasks', 'can_create'),
    canEditTask: canPerformAction('tasks', 'can_assign'), // closest to "edit"
    canDeleteTask: canPerformAction('tasks', 'can_delete'),
    canCreatePoll: true, // pro trips allow all members to create polls
    canClosePoll: isAdmin,
    canDeletePoll: isAdmin,
    canCreateEvent: canPerformAction('calendar', 'can_create_events'),
    canEditEvent: canPerformAction('calendar', 'can_edit_events'),
    canDeleteEvent: canPerformAction('calendar', 'can_delete_events'),
    canSetBasecamp: isAdmin,
    canSaveLink: true, // all pro trip members can save links
  };
}
