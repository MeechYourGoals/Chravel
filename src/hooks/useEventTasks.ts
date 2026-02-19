/**
 * useEventTasks - Fetch and mutate event tasks from Supabase
 * Used by EventTasksTab for Events (event_tasks table)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useToast } from '@/hooks/use-toast';

export interface EventTask {
  id: string;
  event_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  created_by?: string | null;
  created_at?: string | null;
}

interface CreateEventTaskParams {
  title: string;
  description?: string;
  sort_order: number;
}

interface UpdateEventTaskParams {
  title: string;
  description?: string;
  sort_order?: number;
}

export function useEventTasks(eventId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['eventTasks', eventId, isDemoMode],
    queryFn: async (): Promise<EventTask[]> => {
      if (isDemoMode || !eventId) return [];

      const { data, error } = await supabase
        .from('event_tasks')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data || []) as EventTask[];
    },
    enabled: !!eventId && !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async (params: CreateEventTaskParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('event_tasks')
        .insert({
          event_id: eventId,
          title: params.title,
          description: params.description || null,
          sort_order: params.sort_order,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as EventTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId, isDemoMode] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ taskId, params }: { taskId: string; params: UpdateEventTaskParams }) => {
      const { error } = await supabase
        .from('event_tasks')
        .update({
          title: params.title,
          description: params.description ?? null,
          ...(params.sort_order !== undefined && { sort_order: params.sort_order }),
        })
        .eq('id', taskId)
        .eq('event_id', eventId);

      if (error) throw error;
      return { taskId, params };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId, isDemoMode] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('event_tasks')
        .delete()
        .eq('id', taskId)
        .eq('event_id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventTasks', eventId, isDemoMode] });
    },
  });

  const createTask = async (params: CreateEventTaskParams) => {
    try {
      await createMutation.mutateAsync(params);
      toast({ title: 'Task added successfully' });
    } catch {
      toast({ title: 'Failed to add task', variant: 'destructive' });
    }
  };

  const updateTask = async (taskId: string, params: UpdateEventTaskParams) => {
    try {
      await updateMutation.mutateAsync({ taskId, params });
      toast({ title: 'Task updated' });
    } catch {
      toast({ title: 'Failed to update task', variant: 'destructive' });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await deleteMutation.mutateAsync(taskId);
      toast({ title: 'Task removed' });
    } catch {
      toast({ title: 'Failed to remove task', variant: 'destructive' });
    }
  };

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
