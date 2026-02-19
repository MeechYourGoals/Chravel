import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { TripTask, CreateTaskRequest, ToggleTaskRequest } from '../types/tasks';
import { useToast } from './use-toast';
import { taskStorageService } from '../services/taskStorageService';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { offlineSyncService } from '@/services/offlineSyncService';
import { cacheEntity, getCachedEntities } from '@/offline/cache';

// Task form management types
export interface TaskFormData {
  title: string;
  description: string;
  dueDate?: Date;
  taskMode: 'solo' | 'poll';
  assignedMembers: string[];
}

// Task filtering types
export type TaskStatus = 'all' | 'open' | 'completed';
export type TaskSortBy = 'dueDate' | 'created' | 'priority';

export interface TaskFilters {
  status: TaskStatus;
  assignee?: string;
  dateRange: { start?: Date; end?: Date };
  sortBy: TaskSortBy;
}

// Task assignment types
export interface AssignmentOptions {
  taskId: string;
  userIds: string[];
  autoAssignByRole?: boolean;
}

export interface UpdateTaskRequest {
  taskId: string;
  title: string;
  description?: string;
  due_at?: string;
  is_poll: boolean;
  assignedTo?: string[];
}

const generateSeedTasks = (tripId: string): TripTask[] => {
  const consumerTripIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  if (!consumerTripIds.includes(tripId)) {
    return []; // No seed tasks for pro trips
  }

  const taskTemplates: Record<string, TripTask[]> = {
    '1': [
      // Spring Break Cancun
      {
        id: 'seed-1-1',
        trip_id: tripId,
        creator_id: 'seed-user',
        title: 'Pack reef-safe sunscreen',
        description: "Make sure to bring sunscreen that won't damage the coral reefs",
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_poll: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: { id: 'seed-user', name: 'Trip Organizer' },
        task_status: [{ task_id: 'seed-1-1', user_id: 'demo-user', completed: false }],
      },
      {
        id: 'seed-1-2',
        trip_id: tripId,
        creator_id: 'seed-user',
        title: 'Download offline maps for Cancun',
        description: 'Download Google Maps offline for the hotel and downtown areas',
        due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        is_poll: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: { id: 'seed-user', name: 'Trip Organizer' },
        task_status: [{ task_id: 'seed-1-2', user_id: 'demo-user', completed: false }],
      },
    ],
    '4': [
      // Bachelorette Party
      {
        id: 'seed-4-1',
        trip_id: tripId,
        creator_id: 'seed-user',
        title: 'Coordinate ride to Broadway bars',
        description: 'Book Uber/Lyft for the group to hit the honky-tonk scene',
        due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        is_poll: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: { id: 'seed-user', name: 'Ashley' },
        task_status: [{ task_id: 'seed-4-1', user_id: 'demo-user', completed: false }],
      },
    ],
    '6': [
      // Family Vacation
      {
        id: 'seed-6-1',
        trip_id: tripId,
        creator_id: 'seed-user',
        title: 'Pack hiking boots for everyone',
        description: 'Make sure everyone has proper footwear for the mountain trails',
        due_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        is_poll: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: { id: 'seed-user', name: 'Dad (Mike)' },
        task_status: [{ task_id: 'seed-6-1', user_id: 'demo-user', completed: false }],
      },
    ],
    '7': [
      // Golf Trip
      {
        id: 'seed-7-1',
        trip_id: tripId,
        creator_id: 'seed-user',
        title: 'Bring poker chips for evening games',
        description: 'Someone needs to pack the poker set for our nightly tournaments',
        due_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        is_poll: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: { id: 'seed-user', name: 'Commissioner Mike' },
        task_status: [{ task_id: 'seed-7-1', user_id: 'demo-user', completed: false }],
      },
    ],
  };

  return taskTemplates[tripId] || [];
};

export const useTripTasks = (
  tripId: string,
  _options?: {
    filters?: TaskFilters;
    category?: string;
    assignmentOptions?: AssignmentOptions;
  },
) => {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Task form management state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [taskMode, setTaskMode] = useState<'solo' | 'poll'>('solo');
  const [assignedMembers, setAssignedMembers] = useState<string[]>([]);

  // Task filtering state
  const [status, setStatus] = useState<TaskStatus>('all');
  const [assignee, setAssignee] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [sortBy, setSortBy] = useState<TaskSortBy>('dueDate');

  // Task form validation
  const validateTask = useCallback((): { isValid: boolean; error?: string } => {
    if (!title.trim()) {
      return { isValid: false, error: 'Task title is required' };
    }
    if (title.length > 140) {
      return { isValid: false, error: 'Task title must be 140 characters or less' };
    }
    return { isValid: true };
  }, [title]);

  const getTaskData = useCallback((): CreateTaskRequest | null => {
    const validation = validateTask();
    if (!validation.isValid) return null;

    return {
      title: title.trim(),
      description: description.trim() || undefined,
      due_at: dueDate?.toISOString(),
      is_poll: taskMode === 'poll',
      assignedTo: assignedMembers.length > 0 ? assignedMembers : undefined,
    };
  }, [title, description, dueDate, taskMode, assignedMembers, validateTask]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setDueDate(undefined);
    setTaskMode('solo');
    setAssignedMembers([]);
  }, []);

  // Task assignment functions
  const assignTask = useCallback(
    async (taskId: string, userId: string): Promise<boolean> => {
      try {
        if (!taskId || !userId) return false;

        if (isDemoMode || !user) {
          toast({ title: 'Assignment saved in demo mode' });
          return true;
        }

        const assignmentsTable = supabase.from('task_assignments') as any;
        const assignmentWrite =
          typeof assignmentsTable.upsert === 'function'
            ? assignmentsTable.upsert(
                {
                  task_id: taskId,
                  user_id: userId,
                  assigned_by: user.id,
                },
                { onConflict: 'task_id,user_id' },
              )
            : assignmentsTable.insert({
                task_id: taskId,
                user_id: userId,
                assigned_by: user.id,
              });

        const { error } = await assignmentWrite;
        if (error) throw error;

        const statusTable = supabase.from('task_status') as any;
        const statusWrite =
          typeof statusTable.upsert === 'function'
            ? statusTable.upsert(
                { task_id: taskId, user_id: userId, completed: false },
                { onConflict: 'task_id,user_id' },
              )
            : statusTable.insert({ task_id: taskId, user_id: userId, completed: false });

        await statusWrite;

        queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
        return true;
      } catch (error) {
        console.error('Failed to assign task:', error);
        toast({ title: 'Failed to assign task', variant: 'destructive' });
        return false;
      }
    },
    [isDemoMode, queryClient, toast, tripId, user],
  );

  const bulkAssign = useCallback(
    async (assignmentOptions: AssignmentOptions): Promise<boolean> => {
      try {
        const { taskId, userIds } = assignmentOptions;
        if (userIds.length === 0) return true;

        const results = await Promise.all(userIds.map(userId => assignTask(taskId, userId)));
        const allAssigned = results.every(Boolean);

        if (allAssigned) {
          toast({ title: `Assigned to ${userIds.length} members` });
          return true;
        }

        toast({
          title: 'Partial assignment',
          description: 'Some members could not be assigned. Please retry.',
          variant: 'destructive',
        });
        return false;
      } catch (error) {
        console.error('Failed to bulk assign:', error);
        toast({ title: 'Failed to assign task to members', variant: 'destructive' });
        return false;
      }
    },
    [assignTask, toast],
  );

  // Task filtering functions
  const applyFilters = useCallback(
    (tasks: TripTask[]): TripTask[] => {
      const filtered = tasks.filter(task => {
        // Status filter
        const isCompleted = task.is_poll
          ? (task.task_status?.filter(s => s.completed).length || 0) >=
            (task.task_status?.length || 1)
          : task.task_status?.[0]?.completed || false;

        if (status === 'open' && isCompleted) return false;
        if (status === 'completed' && !isCompleted) return false;

        // Assignee filter
        if (assignee) {
          const hasAssignee = task.task_status?.some(s => s.user_id === assignee);
          if (!hasAssignee) return false;
        }

        // Date range filter
        if (task.due_at) {
          const dueDate = new Date(task.due_at);
          if (dateRange.start && dueDate < dateRange.start) return false;
          if (dateRange.end && dueDate > dateRange.end) return false;
        }

        return true;
      });

      // Apply sorting
      filtered.sort((a, b) => {
        switch (sortBy) {
          case 'dueDate':
            if (!a.due_at) return 1;
            if (!b.due_at) return -1;
            return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
          case 'created':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'priority': {
            const aPriority = a.due_at ? 1 : 0;
            const bPriority = b.due_at ? 1 : 0;
            return bPriority - aPriority;
          }
          default:
            return 0;
        }
      });

      return filtered;
    },
    [status, assignee, dateRange, sortBy],
  );

  const clearFilters = useCallback(() => {
    setStatus('all');
    setAssignee(undefined);
    setDateRange({});
    setSortBy('dueDate');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      status !== 'all' ||
      assignee !== undefined ||
      dateRange.start !== undefined ||
      dateRange.end !== undefined
    );
  }, [status, assignee, dateRange]);

  // Pagination state - for large lists, we'll limit initial load
  const TASKS_PER_PAGE = 100; // Load first 100 tasks initially
  const [showAllTasks, setShowAllTasks] = useState(false);

  // Real-time subscription for tasks (authenticated mode only)
  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const channel = supabase
      .channel(`trip_tasks:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_tasks',
          filter: `trip_id=eq.${tripId}`,
        },
        payload => {
          queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });

          toast({
            title: 'New Task Added',
            description: `${(payload.new as any).title} was added.`,
            duration: 3000,
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'trip_tasks',
          filter: `trip_id=eq.${tripId}`,
        },
        _payload => {
          queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_status',
        },
        _payload => {
          queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, queryClient, toast]);

  const tasksQuery = useQuery({
    queryKey: ['tripTasks', tripId, isDemoMode],
    staleTime: 30 * 1000, // 30 seconds - tasks change moderately
    gcTime: 5 * 60 * 1000, // Keep in cache 5 min for instant tab switching
    queryFn: async (): Promise<TripTask[]> => {
      // Demo mode: use localStorage
      if (isDemoMode) {
        const demoTasks = await taskStorageService.getTasks(tripId);
        // If no demo tasks exist, persist seed tasks to storage so they can be toggled
        if (demoTasks.length === 0) {
          const seedTasks = generateSeedTasks(tripId);
          // Save seed tasks to storage for persistence and toggle capability
          for (const task of seedTasks) {
            await taskStorageService.createTask(tripId, {
              title: task.title,
              description: task.description || undefined,
              due_at: task.due_at,
              is_poll: task.is_poll || false,
              assignedTo: ['demo-user'],
            });
          }
          // Return the persisted tasks (they now have proper IDs in storage)
          return await taskStorageService.getTasks(tripId);
        }
        return demoTasks;
      }

      // ✅ Authenticated mode with no user should return empty array
      if (!user) {
        return [];
      }

      // Offline-first: load cached tasks for instant rendering / fallback.
      const cachedEntities = await getCachedEntities({ tripId, entityType: 'trip_tasks' });
      const cachedTasks = cachedEntities
        .map(c => c.data as TripTask)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // If offline, prefer cached tasks.
      if (navigator.onLine === false && cachedTasks.length > 0) {
        return cachedTasks;
      }

      // Authenticated mode: use Supabase
      try {
        const query = supabase
          .from('trip_tasks')
          .select(
            `
          *,
          task_status(*),
          creator:creator_id (
            id,
            display_name,
            avatar_url
          )
        `,
          )
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false });

        // Limit initial load for performance
        if (!showAllTasks) {
          query.limit(TASKS_PER_PAGE);
        }

        const { data: tasks, error } = await query;

        if (error) throw error;

        // ✅ If no real tasks exist, return empty array for authenticated users
        // (Only generate seed tasks in demo mode)
        if (!tasks || tasks.length === 0) {
          return [];
        }

        // Transform database tasks to match TripTask interface
        const transformed = tasks.map((task: any) => ({
          id: task.id,
          trip_id: task.trip_id,
          creator_id: task.creator_id,
          title: task.title,
          description: task.description,
          due_at: task.due_at,
          is_poll: task.is_poll,
          created_at: task.created_at,
          updated_at: task.updated_at,
          creator: {
            id: task.creator_id,
            name: task.creator?.display_name || 'Former Member',
            avatar: task.creator?.avatar_url,
          },
          task_status: (task.task_status || []) as any[],
        }));

        // Cache tasks for offline access (best-effort).
        await Promise.all(
          transformed.map(t =>
            cacheEntity({
              entityType: 'trip_tasks',
              entityId: t.id,
              tripId: t.trip_id,
              data: t,
              version: (t as any).version ?? undefined,
            }),
          ),
        );

        return transformed;
      } catch (error) {
        console.error('[useTripTasks] Error fetching tasks:', error);
        console.error('[useTripTasks] Error details:', JSON.stringify(error, null, 2));

        // If fetch fails, prefer cached tasks if available.
        if (cachedTasks.length > 0) {
          return cachedTasks;
        }

        // Show user-friendly error (avoid spamming when offline).
        if (navigator.onLine !== false) {
          toast({
            title: 'Failed to load tasks',
            description: 'Unable to fetch tasks. Please refresh the page.',
            variant: 'destructive',
          });
        }

        // Return empty array on error (no seed tasks for authenticated users)
        return [];
      }
    },
    enabled: !!tripId,
  });

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: async (task: CreateTaskRequest & { assignedTo?: string[] }) => {
      // Demo mode: use localStorage
      if (isDemoMode || !user) {
        const assignedTo = task.assignedTo || ['demo-user'];
        return await taskStorageService.createTask(tripId, {
          ...task,
          assignedTo,
        });
      }

      // Check if offline - queue the operation
      if (!navigator.onLine) {
        await offlineSyncService.queueOperation('task', 'create', tripId, task);
        throw new Error('OFFLINE: Task queued for sync when connection is restored.');
      }

      // Authenticated mode: use Supabase
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Please sign in to create tasks');
      }

      // Ensure user is a member of the trip (auto-join for consumer trips)
      const { error: membershipError } = await supabase.rpc('ensure_trip_membership', {
        p_trip_id: tripId,
        p_user_id: authUser.id,
      });

      if (membershipError) {
        console.error('Membership error:', membershipError);
        throw new Error('Unable to join trip. Please try again.');
      }

      // Fetch current user's profile for display_name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', authUser.id)
        .single();

      // Create the task in database
      const { data: newTask, error } = await supabase
        .from('trip_tasks')
        .insert({
          trip_id: tripId,
          creator_id: authUser.id,
          title: task.title,
          description: task.description,
          due_at: task.due_at,
          is_poll: task.is_poll,
        })
        .select()
        .single();

      if (error) {
        console.error('Task creation error:', error);
        if (error.code === 'PGRST116') {
          throw new Error('Access denied. You must be a trip member to create tasks.');
        }
        throw error;
      }

      const assignedUserIds = Array.from(
        new Set([...(task.assignedTo ?? []), ...(task.is_poll ? [] : [authUser.id])]),
      );

      const taskStatusRows = (assignedUserIds.length > 0 ? assignedUserIds : [authUser.id]).map(assigneeId => ({
        task_id: newTask.id,
        user_id: assigneeId,
        completed: false,
      }));

      const { error: taskStatusError } = await supabase.from('task_status').insert(taskStatusRows);
      if (taskStatusError) {
        throw new Error(taskStatusError.message || 'Failed to initialize task assignments');
      }

      if (assignedUserIds.length > 0) {
        const assignmentsTable = supabase.from('task_assignments') as any;
        const assignmentWrite =
          typeof assignmentsTable.upsert === 'function'
            ? assignmentsTable.upsert(
                assignedUserIds.map(assigneeId => ({
                  task_id: newTask.id,
                  user_id: assigneeId,
                  assigned_by: authUser.id,
                })),
                { onConflict: 'task_id,user_id' },
              )
            : assignmentsTable.insert(
                assignedUserIds.map(assigneeId => ({
                  task_id: newTask.id,
                  user_id: assigneeId,
                  assigned_by: authUser.id,
                })),
              );

        await assignmentWrite;
      }

      // Transform to TripTask format
      return {
        id: newTask.id,
        trip_id: newTask.trip_id,
        creator_id: newTask.creator_id,
        title: newTask.title,
        description: newTask.description,
        due_at: newTask.due_at,
        is_poll: newTask.is_poll,
        created_at: newTask.created_at,
        updated_at: newTask.updated_at,
        creator: {
          id: authUser.id,
          name: userProfile?.display_name || 'Former Member',
          avatar: userProfile?.avatar_url,
        },
        task_status: taskStatusRows,
      } as TripTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
      toast({
        title: 'Task created',
        description: 'Your task has been added to the list.',
      });
    },
    onError: (error: Error) => {
      console.error('Create task mutation error:', error);

      // Provide specific error messages
      let errorTitle = 'Error Creating Task';
      let errorDescription = 'Failed to create task. Please try again.';
      let variant: 'default' | 'destructive' = 'destructive';

      const errorMessage = error.message || '';
      const errorCode = (error as Error & { code?: string }).code;

      if (errorMessage.includes('OFFLINE:')) {
        errorTitle = 'Task Queued';
        errorDescription = "Task will be created when you're back online.";
        variant = 'default';
      } else if (errorMessage.includes('Access denied') || errorCode === 'PGRST116') {
        errorTitle = 'Access Denied';
        errorDescription = 'You must be a trip member to create tasks.';
      } else if (errorMessage.includes('Network error') || errorMessage.includes('fetch')) {
        errorTitle = 'Connection Error';
        errorDescription = 'Please check your internet connection and try again.';
      } else if (errorMessage.includes('validation') || errorMessage.includes('required')) {
        errorTitle = 'Validation Error';
        errorDescription = errorMessage;
      } else if (errorMessage) {
        errorDescription = errorMessage;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant,
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, title, description, due_at, is_poll, assignedTo }: UpdateTaskRequest) => {
      if (isDemoMode || !user) {
        const updated = await taskStorageService.updateTask(tripId, taskId, {
          title: title.trim(),
          description: description?.trim() || undefined,
          due_at,
          is_poll,
          assignedTo,
        });

        if (!updated) {
          throw new Error('Task not found.');
        }

        return updated;
      }

      const { data: updatedTask, error } = await supabase
        .from('trip_tasks')
        .update({
          title: title.trim(),
          description: description?.trim() || null,
          due_at: due_at || null,
          is_poll,
        })
        .eq('id', taskId)
        .eq('creator_id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (Array.isArray(assignedTo) && assignedTo.length > 0) {
        const uniqueAssignees = Array.from(new Set(assignedTo));

        await supabase.from('task_assignments').delete().eq('task_id', taskId);

        const { error: assignmentError } = await supabase.from('task_assignments').insert(
          uniqueAssignees.map(assigneeId => ({
            task_id: taskId,
            user_id: assigneeId,
            assigned_by: user.id,
          })),
        );

        if (assignmentError) throw assignmentError;

        const statusTable = supabase.from('task_status') as any;
        const statusWrite =
          typeof statusTable.upsert === 'function'
            ? statusTable.upsert(
                uniqueAssignees.map(assigneeId => ({
                  task_id: taskId,
                  user_id: assigneeId,
                  completed: false,
                })),
                { onConflict: 'task_id,user_id' },
              )
            : statusTable.insert(
                uniqueAssignees.map(assigneeId => ({
                  task_id: taskId,
                  user_id: assigneeId,
                  completed: false,
                })),
              );

        const { error: statusError } = await statusWrite;
        if (statusError) throw statusError;
      }

      return updatedTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
      toast({ title: 'Task updated', description: 'Your changes have been saved.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Updating Task',
        description: error.message || 'Failed to update task.',
        variant: 'destructive',
      });
    },
  });

  // Helper function for retry logic with exponential backoff
  const toggleTaskWithRetry = async (
    taskId: string,
    completed: boolean,
    retryCount = 0,
  ): Promise<{ taskId: string; completed: boolean }> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    // Demo mode: use localStorage
    if (isDemoMode || !user) {
      const currentUserId = user?.id || 'demo-user';
      const result = await taskStorageService.toggleTask(tripId, taskId, currentUserId, completed);
      // Extract completed status from task_status array for current user
      const userStatus = result?.task_status?.find(s => s.user_id === currentUserId);
      return { taskId, completed: userStatus?.completed ?? completed };
    }

    // Authenticated mode: use atomic function with optimistic locking
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) throw new Error('User not authenticated');

    // Check if offline - queue the operation
    if (!navigator.onLine) {
      await offlineSyncService.queueOperation('task', 'update', tripId, { completed }, taskId);
      throw new Error('OFFLINE: Task update queued for sync when connection is restored.');
    }

    try {
      // Get current task version from trip_tasks table (not task_status)
      const { data: taskData, error: taskError } = await supabase
        .from('trip_tasks')
        .select('version')
        .eq('id', taskId)
        .maybeSingle();

      if (taskError) {
        throw new Error(`Failed to fetch task: ${taskError.message}`);
      }

      const currentVersion = taskData?.version || 1;

      // Use atomic function to toggle task status
      const { error } = await supabase.rpc('toggle_task_status', {
        p_task_id: taskId,
        p_user_id: authUser.id,
        p_current_version: currentVersion,
        p_completed: completed,
      } as any);

      if (error) {
        // Check for version conflict (concurrency error)
        const isVersionConflict =
          error.message?.includes('modified by another user') ||
          error.message?.includes('version') ||
          error.code === 'P0001'; // PostgreSQL exception code

        if (isVersionConflict && retryCount < MAX_RETRIES) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
          // Recursively retry
          return toggleTaskWithRetry(taskId, completed, retryCount + 1);
        }

        // Map specific error messages
        if (isVersionConflict) {
          throw new Error(
            'CONFLICT: This task was modified by another user. Please refresh and try again.',
          );
        }

        if (error.code === 'PGRST116') {
          throw new Error('Access denied. You must be a trip member to update tasks.');
        }

        throw new Error(error.message || 'Failed to update task status');
      }

      return { taskId, completed };
    } catch (error) {
      // Re-throw with enhanced error message
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('CONFLICT:')) {
        throw error; // Already formatted
      }

      // Handle network errors
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        throw new Error('Network error. Please check your connection and try again.');
      }

      throw error;
    }
  };

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: ToggleTaskRequest) => {
      return toggleTaskWithRetry(taskId, completed);
    },
    onMutate: async ({ taskId, completed }) => {
      // Optimistic update - use correct query key with isDemoMode
      await queryClient.cancelQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });

      const previousTasks = queryClient.getQueryData<TripTask[]>(['tripTasks', tripId, isDemoMode]);

      queryClient.setQueryData<TripTask[]>(['tripTasks', tripId, isDemoMode], old => {
        if (!old) return old;

        return old.map(task => {
          if (task.id === taskId) {
            // Must match the logic in TaskRow.tsx - check isDemoMode first
            const currentUserId = isDemoMode || !user ? 'demo-user' : user.id;
            const hasCurrentUserStatus = task.task_status?.some(status => status.user_id === currentUserId);
            const updatedStatus = hasCurrentUserStatus
              ? task.task_status?.map(status => {
                  if (status.user_id === currentUserId) {
                    return {
                      ...status,
                      completed,
                      completed_at: completed ? new Date().toISOString() : undefined,
                    };
                  }
                  return status;
                })
              : [
                  ...(task.task_status || []),
                  {
                    task_id: task.id,
                    user_id: currentUserId,
                    completed,
                    completed_at: completed ? new Date().toISOString() : undefined,
                  },
                ];

            return {
              ...task,
              task_status: updatedStatus,
            };
          }
          return task;
        });
      });

      return { previousTasks };
    },
    onError: (err: Error, variables, context) => {
      const errMessage = err.message || '';

      // Rollback on error (unless it's an offline queue operation)
      if (context?.previousTasks && !errMessage.includes('OFFLINE:')) {
        queryClient.setQueryData(['tripTasks', tripId, isDemoMode], context.previousTasks);
      }

      // Provide specific error messages
      let errorTitle = 'Error Updating Task';
      let errorDescription = 'Failed to update task. Please try again.';
      let variant: 'default' | 'destructive' = 'destructive';

      if (errMessage.includes('OFFLINE:')) {
        errorTitle = 'Task Update Queued';
        errorDescription = "Update will be synced when you're back online.";
        variant = 'default';
      } else if (errMessage.includes('CONFLICT:')) {
        errorTitle = 'Conflict Detected';
        errorDescription = errMessage.replace('CONFLICT: ', '');
      } else if (errMessage.includes('Access denied')) {
        errorTitle = 'Access Denied';
        errorDescription = errMessage;
      } else if (errMessage.includes('Network error')) {
        errorTitle = 'Connection Error';
        errorDescription = errMessage;
      } else if (errMessage) {
        errorDescription = errMessage;
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
    },
  });

  // Offline sync is handled globally in `App.tsx` via `setupGlobalSyncProcessor()`.

  // Delete task mutation - creator-only client guard (RLS enforced on backend)
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      if (isDemoMode || !user) {
        const success = await taskStorageService.deleteTask(tripId, taskId);
        if (!success) throw new Error('Failed to delete task');
        return taskId;
      }

      const deleteQuery = supabase.from('trip_tasks').delete().eq('id', taskId);

      if (user?.id) {
        deleteQuery.eq('creator_id', user.id);
      }

      const { error } = await deleteQuery;
      if (error) throw error;
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
      toast({
        title: 'Task deleted',
        description: 'The task has been removed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task.',
        variant: 'destructive',
      });
    },
  });

  // Pagination helpers
  const hasMoreTasks = (tasksQuery.data?.length || 0) >= TASKS_PER_PAGE && !showAllTasks;
  const loadAllTasks = useCallback(() => {
    if (!showAllTasks && !tasksQuery.isLoading) {
      setShowAllTasks(true);
      queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
    }
  }, [showAllTasks, tasksQuery.isLoading, queryClient, tripId, isDemoMode]);

  return {
    // Query data
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,

    // Pagination
    hasMoreTasks,
    loadAllTasks,

    // Task form management
    title,
    description,
    dueDate,
    taskMode,
    assignedMembers,
    isValid: validateTask().isValid,
    characterCount: title.length,
    maxCharacters: 140,
    setTitle,
    setDescription,
    setDueDate,
    setTaskMode,
    updateAssignedMembers: setAssignedMembers,
    toggleMember: (memberId: string) => {
      setAssignedMembers(prev =>
        prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId],
      );
    },
    validateTask,
    getTaskData,
    resetForm,

    // Task filtering
    status,
    assignee,
    dateRange,
    sortBy,
    hasActiveFilters,
    setStatus,
    setAssignee,
    setDateRange,
    setSortBy,
    applyFilters,
    clearFilters,

    // Task assignment
    assignTask,
    bulkAssign,
    autoAssignByRole: async (_taskId: string, _role: string) => {
      // TODO: Get participants from trip roster
      // const roleUsers = participants.filter(p => p.role === role).map(p => p.id);
      // if (roleUsers.length > 0) {
      //   await bulkAssign({ taskId, userIds: roleUsers });
      // }
    },

    // Mutations
    createTaskMutation,
    updateTaskMutation,
    toggleTaskMutation,
    deleteTaskMutation,
  };
};
