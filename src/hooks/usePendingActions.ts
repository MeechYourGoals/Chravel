/**
 * usePendingActions — Manages AI-created pending actions that need user confirmation.
 *
 * When the AI concierge (voice or text) wants to create a task, poll, or calendar event,
 * instead of writing directly to shared state, it writes to `trip_pending_actions`.
 * The user then confirms or rejects each action via this hook.
 *
 * On confirm: the original mutation payload is executed and the pending action is resolved.
 * On reject: the pending action is marked rejected (no shared-state write).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { tripKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';

export interface PendingAction {
  id: string;
  trip_id: string;
  user_id: string;
  tool_name: string;
  tool_call_id: string | null;
  payload: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'rejected' | 'expired';
  source_type: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export function usePendingActions(tripId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  const queryKey = ['pendingActions', tripId];

  // Fetch pending actions for this trip
  const { data: pendingActions = [], isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<PendingAction[]> => {
      if (isDemoMode || !tripId) return [];

      // intentional: trip_pending_actions not yet in generated Supabase types
      const { data, error } = await (supabase as any)
        .from('trip_pending_actions')
        .select('*')
        .eq('trip_id', tripId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PendingAction[];
    },
    enabled: !!tripId && !isDemoMode,
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // Confirm a pending action — execute the actual mutation
  const confirmMutation = useMutation({
    mutationFn: async (actionId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Fetch the pending action
      // intentional: trip_pending_actions not yet in generated Supabase types
      const { data: action, error: fetchError } = await (supabase as any)
        .from('trip_pending_actions')
        .select('*')
        .eq('id', actionId)
        .eq('status', 'pending')
        .single();

      if (fetchError || !action) {
        throw new Error('Pending action not found or already resolved');
      }

      const payload = action.payload as Record<string, unknown>;

      // Execute the original mutation based on tool_name
      switch (action.tool_name) {
        case 'createTask': {
          // intentional: source_type column may not be in generated types yet
          const { error } = await (supabase as any)
            .from('trip_tasks')
            .insert({
              trip_id: action.trip_id,
              creator_id: (payload.creator_id as string) || user.id,
              title: payload.title as string,
              description: (payload.description as string | null) || null,
              due_at: (payload.due_at as string | null) || null,
              source_type: 'ai_concierge',
            })
            .select()
            .single();
          if (error) throw error;
          break;
        }

        case 'createPoll': {
          // intentional: trip_polls insert with trip_id may not match generated types
          const { error } = await (supabase as any)
            .from('trip_polls')
            .insert({
              trip_id: action.trip_id,
              created_by: (payload.created_by as string) || user.id,
              question: payload.question as string,
              options: payload.options as unknown[],
              status: 'active',
              source_type: 'ai_concierge',
            })
            .select()
            .single();
          if (error) throw error;
          break;
        }

        case 'addToCalendar': {
          // intentional: source_type column may not be in generated types yet
          const { error } = await (supabase as any)
            .from('trip_events')
            .insert({
              trip_id: action.trip_id,
              created_by: (payload.created_by as string) || user.id,
              title: payload.title as string,
              start_time: payload.start_time as string,
              end_time: (payload.end_time as string | null) || null,
              location: (payload.location as string | null) || null,
              description: (payload.description as string | null) || null,
              source_type: 'ai_concierge',
            })
            .select()
            .single();
          if (error) throw error;
          break;
        }

        default:
          throw new Error(`Unknown tool: ${action.tool_name}`);
      }

      // Mark as confirmed — re-check status to prevent TOCTOU race
      // intentional: trip_pending_actions not yet in generated Supabase types
      const { error: updateError } = await (supabase as any)
        .from('trip_pending_actions')
        .update({
          status: 'confirmed',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', actionId)
        .eq('status', 'pending')
        .select()
        .single();

      if (updateError) throw new Error('Action was already confirmed by someone else.');

      return action;
    },
    onSuccess: action => {
      const toolLabel =
        action.tool_name === 'createTask'
          ? 'Task'
          : action.tool_name === 'createPoll'
            ? 'Poll'
            : action.tool_name === 'addToCalendar'
              ? 'Calendar event'
              : 'Action';
      toast.success(`${toolLabel} created`);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey });
      if (action.tool_name === 'createTask') {
        queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId] });
      } else if (action.tool_name === 'createPoll') {
        queryClient.invalidateQueries({ queryKey: ['tripPolls', tripId] });
      } else if (action.tool_name === 'addToCalendar') {
        queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to confirm action');
    },
  });

  // Reject a pending action
  const rejectMutation = useMutation({
    mutationFn: async (actionId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      // intentional: trip_pending_actions not yet in generated Supabase types
      const { error } = await (supabase as any)
        .from('trip_pending_actions')
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq('id', actionId)
        .eq('status', 'pending');

      if (error) throw error;
      return actionId;
    },
    onSuccess: () => {
      toast('Action dismissed');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reject action');
    },
  });

  return {
    pendingActions,
    isLoading,
    confirmAction: confirmMutation.mutate,
    confirmActionAsync: confirmMutation.mutateAsync,
    rejectAction: rejectMutation.mutate,
    rejectActionAsync: rejectMutation.mutateAsync,
    isConfirming: confirmMutation.isPending,
    isRejecting: rejectMutation.isPending,
    hasPendingActions: pendingActions.length > 0,
  };
}
