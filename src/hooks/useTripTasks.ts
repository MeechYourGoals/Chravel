import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { TripTask, CreateTaskRequest, ToggleTaskRequest } from '../types/tasks';
import { useToast } from './use-toast';
import { taskStorageService } from '../services/taskStorageService';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { useState, useCallback, useMemo } from 'react';

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

const generateSeedTasks = (tripId: string): TripTask[] => {
  const consumerTripIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  
  if (!consumerTripIds.includes(tripId)) {
    return []; // No seed tasks for pro trips
  }

  const taskTemplates: Record<string, TripTask[]> = {
    '1': [ // Spring Break Cancun
      {
        id: 'seed-1-1',
        trip_id: tripId,
        creator_id: 'seed-user',
        title: 'Pack reef-safe sunscreen',
        description: 'Make sure to bring sunscreen that won\'t damage the coral reefs',
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_poll: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        creator: { id: 'seed-user', name: 'Trip Organizer' },
        task_status: [{ task_id: 'seed-1-1', user_id: 'current-user', completed: false }]
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
        task_status: [{ task_id: 'seed-1-2', user_id: 'current-user', completed: false }]
      }
    ],
    '4': [ // Bachelorette Party
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
        task_status: [{ task_id: 'seed-4-1', user_id: 'current-user', completed: false }]
      }
    ],
    '6': [ // Family Vacation
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
        task_status: [{ task_id: 'seed-6-1', user_id: 'current-user', completed: false }]
      }
    ],
    '7': [ // Golf Trip
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
        task_status: [{ task_id: 'seed-7-1', user_id: 'current-user', completed: false }]
      }
    ]
  };

  return taskTemplates[tripId] || [];
};

export const useTripTasks = (tripId: string, options?: {
  filters?: TaskFilters;
  category?: string;
  assignmentOptions?: AssignmentOptions;
}) => {
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
      assignedTo: assignedMembers.length > 0 ? assignedMembers : undefined
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
  const assignTask = useCallback(async (taskId: string, userId: string): Promise<boolean> => {
    try {
      console.log('Assigning task', taskId, 'to user', userId);
      return true;
    } catch (error) {
      console.error('Failed to assign task:', error);
      toast({ title: 'Failed to assign task', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  const bulkAssign = useCallback(async (assignmentOptions: AssignmentOptions): Promise<boolean> => {
    try {
      const { taskId, userIds } = assignmentOptions;
      console.log('Bulk assigning task', taskId, 'to users', userIds);
      toast({ title: `Assigned to ${userIds.length} members` });
      return true;
    } catch (error) {
      console.error('Failed to bulk assign:', error);
      toast({ title: 'Failed to assign task to members', variant: 'destructive' });
      return false;
    }
  }, [toast]);

  // Task filtering functions
  const applyFilters = useCallback((tasks: TripTask[]): TripTask[] => {
    let filtered = tasks.filter(task => {
      // Status filter
      const isCompleted = task.is_poll 
        ? (task.task_status?.filter(s => s.completed).length || 0) >= (task.task_status?.length || 1)
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
        case 'priority':
          const aPriority = a.due_at ? 1 : 0;
          const bPriority = b.due_at ? 1 : 0;
          return bPriority - aPriority;
        default:
          return 0;
      }
    });

    return filtered;
  }, [status, assignee, dateRange, sortBy]);

  const clearFilters = useCallback(() => {
    setStatus('all');
    setAssignee(undefined);
    setDateRange({});
    setSortBy('dueDate');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return status !== 'all' || 
           assignee !== undefined ||
           dateRange.start !== undefined ||
           dateRange.end !== undefined;
  }, [status, assignee, dateRange]);

  const tasksQuery = useQuery({
    queryKey: ['tripTasks', tripId, isDemoMode],
    queryFn: async (): Promise<TripTask[]> => {
      // Demo mode: use localStorage
      if (isDemoMode || !user) {
        const demoTasks = await taskStorageService.getTasks(tripId);
        // If no demo tasks exist, create seed tasks
        if (demoTasks.length === 0) {
          return generateSeedTasks(tripId);
        }
        return demoTasks;
      }

      // Authenticated mode: use Supabase
      try {
      const { data: tasks, error } = await supabase
        .from('trip_tasks')
        .select(`
          *,
          task_status(*),
          creator:creator_id (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

        if (error) throw error;

        // If no real tasks exist, return seed tasks for consumer trips
        if (!tasks || tasks.length === 0) {
          return generateSeedTasks(tripId);
        }

        // Transform database tasks to match TripTask interface
        return tasks.map((task: any) => ({
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
            name: task.creator?.display_name || 'Unknown User',
            avatar: task.creator?.avatar_url
          },
          task_status: (task.task_status || []) as any[]
        }));
      } catch (error) {
        console.error('Error fetching tasks:', error);
        // Fallback to demo tasks
        const demoTasks = await taskStorageService.getTasks(tripId);
        return demoTasks.length > 0 ? demoTasks : generateSeedTasks(tripId);
      }
    },
    enabled: !!tripId,
    staleTime: 2 * 60 * 1000, // 2 minutes - tasks need reasonable freshness
    gcTime: 10 * 60 * 1000 // 10 minutes - keep in cache
  });

  // Task mutations
  const createTaskMutation = useMutation({
    mutationFn: async (task: CreateTaskRequest & { assignedTo?: string[] }) => {
      // Demo mode: use localStorage
      if (isDemoMode || !user) {
        const assignedTo = task.assignedTo || ['demo-user'];
        return await taskStorageService.createTask(tripId, {
          ...task,
          assignedTo
        });
      }

      // Authenticated mode: use Supabase
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        throw new Error('Please sign in to create tasks');
      }

      // Ensure user is a member of the trip (auto-join for consumer trips)
      const { error: membershipError } = await supabase.rpc('ensure_trip_membership', {
        p_trip_id: tripId,
        p_user_id: authUser.id
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
          is_poll: task.is_poll
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

      // Create initial task status for creator
      await supabase
        .from('task_status')
        .insert({
          task_id: newTask.id,
          user_id: authUser.id,
          completed: false
        });

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
          name: userProfile?.display_name || 'Unknown User',
          avatar: userProfile?.avatar_url
        },
        task_status: [{
          task_id: newTask.id,
          user_id: authUser.id,
          completed: false
        }]
      } as TripTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId] });
      toast({
        title: 'Task created',
        description: 'Your task has been added to the list.'
      });
    },
    onError: (error: any) => {
      console.error('Create task mutation error:', error);
      const errorMessage = error.message || 'Failed to create task. Please try again.';
      toast({
        title: 'Error Creating Task',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: ToggleTaskRequest) => {
      // Demo mode: use localStorage
      if (isDemoMode || !user) {
        const currentUserId = user?.id || 'demo-user';
        return await taskStorageService.toggleTask(tripId, taskId, currentUserId, completed);
      }

      // Authenticated mode: use atomic function with optimistic locking
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('User not authenticated');

      // Get current task version for optimistic locking
      const { data: task, error: fetchError } = await supabase
        .from('trip_tasks')
        .select('version')
        .eq('id', taskId)
        .single();

      if (fetchError) throw fetchError;

      // Use atomic function to toggle task status
      const { error } = await supabase
        .rpc('toggle_task_status', {
          p_task_id: taskId,
          p_user_id: authUser.id,
          p_completed: completed,
          p_current_version: task.version
        });

      if (error) throw error;
      return { taskId, completed };
    },
    onMutate: async ({ taskId, completed }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tripTasks', tripId] });
      
      const previousTasks = queryClient.getQueryData<TripTask[]>(['tripTasks', tripId]);
      
      queryClient.setQueryData<TripTask[]>(['tripTasks', tripId], (old) => {
        if (!old) return old;
        
        return old.map(task => {
          if (task.id === taskId) {
            const currentUserId = user?.id || 'demo-user';
            const updatedStatus = task.task_status?.map(status => {
              if (status.user_id === currentUserId) {
                return {
                  ...status,
                  completed,
                  completed_at: completed ? new Date().toISOString() : undefined
                };
              }
              return status;
            });
            
            return {
              ...task,
              task_status: updatedStatus
            };
          }
          return task;
        });
      });

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tripTasks', tripId], context.previousTasks);
      }
      toast({
        title: 'Error',
        description: 'Failed to update task. Please try again.',
        variant: 'destructive'
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tripTasks', tripId, isDemoMode] });
    }
  });

  return {
    // Query data
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    
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
        prev.includes(memberId) 
          ? prev.filter(id => id !== memberId)
          : [...prev, memberId]
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
    autoAssignByRole: async (taskId: string, role: string) => {
      // TODO: Get participants from trip roster
      // const roleUsers = participants.filter(p => p.role === role).map(p => p.id);
      // if (roleUsers.length > 0) {
      //   await bulkAssign({ taskId, userIds: roleUsers });
      // }
      console.log('Auto-assign by role not yet implemented:', taskId, role);
    },
    
    // Mutations
    createTaskMutation,
    toggleTaskMutation
  };
};