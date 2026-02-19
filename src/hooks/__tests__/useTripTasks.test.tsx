import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTripTasks } from '../useTripTasks';
import { supabase } from '../../integrations/supabase/client';
import { taskStorageService } from '../../services/taskStorageService';
import { offlineSyncService } from '@/services/offlineSyncService';
import { getCachedEntities } from '@/offline/cache';

// Mock dependencies
vi.mock('../../integrations/supabase/client');
vi.mock('../../services/taskStorageService');
vi.mock('@/services/offlineSyncService', () => ({
  offlineSyncService: {
    queueOperation: vi.fn(),
  },
}));
vi.mock('@/offline/cache', () => ({
  cacheEntity: vi.fn(),
  getCachedEntities: vi.fn(),
}));
vi.mock('../useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' }
  })
}));
vi.mock('../useDemoMode', () => ({
  useDemoMode: () => ({
    isDemoMode: false
  })
}));
vi.mock('../use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

type SupabaseChainOverrides = Partial<{
  // Response returned when the query builder is awaited (`await query`)
  then: { data: any; error: any };
  // Optional response used when `.limit()` is called before awaiting
  limitResponse: { data: any; error: any };
  single: any;
  maybeSingle: any;
}>;

function makeSupabaseChain(overrides: SupabaseChainOverrides = {}) {
  const chain: any = {};
  let response = overrides.then ?? { data: [], error: null };
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => {
    if (overrides.limitResponse) {
      response = overrides.limitResponse;
    }
    return chain;
  });
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);
  chain.single = vi.fn(async () => overrides.single ?? { data: null, error: null });
  chain.maybeSingle = vi.fn(async () => overrides.maybeSingle ?? { data: null, error: null });
  // Make the chain awaitable (Supabase query builders are Promise-like).
  chain.then = (onFulfilled: any, onRejected: any) => Promise.resolve(response).then(onFulfilled, onRejected);
  return chain;
}

let tableMocks: Record<string, any> = {};

describe('useTripTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    vi.mocked(getCachedEntities).mockResolvedValue([]);

    // Default realtime mocks used by useTripTasks effect
    (supabase as any).channel = vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({}),
    });
    (supabase as any).removeChannel = vi.fn();

    tableMocks = {};
    vi.mocked(supabase.from).mockImplementation((tableName: any) => {
      return tableMocks[String(tableName)] ?? makeSupabaseChain();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Task CRUD Operations', () => {
    it('should fetch tasks successfully', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          trip_id: 'trip-1',
          creator_id: 'user-1',
          title: 'Test Task',
          description: 'Test Description',
          due_at: null,
          is_poll: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          task_status: [],
          creator: { id: 'user-1', display_name: 'Test User', avatar_url: null }
        }
      ];

      tableMocks.trip_tasks = makeSupabaseChain({
        limitResponse: { data: mockTasks, error: null },
      });

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toBeDefined();
    });

    it('should create a task successfully', async () => {
      const mockNewTask = {
        id: 'new-task-id',
        trip_id: 'trip-1',
        creator_id: 'test-user-id',
        title: 'New Task',
        description: 'New Description',
        due_at: null,
        is_poll: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null
      } as any);

      tableMocks.trip_tasks = makeSupabaseChain({
        single: { data: mockNewTask, error: null },
        limitResponse: { data: [], error: null },
      });
      tableMocks.task_status = makeSupabaseChain();
      tableMocks.profiles = makeSupabaseChain({
        single: { data: { display_name: 'Test User', avatar_url: null }, error: null },
      });

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.createTaskMutation).toBeDefined();
      });

      await result.current.createTaskMutation.mutateAsync({
        title: 'New Task',
        description: 'New Description',
        is_poll: false
      });

      await waitFor(() => {
        expect(result.current.createTaskMutation.isSuccess).toBe(true);
      });
    });


    it('should update a task successfully', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      } as any);

      tableMocks.trip_tasks = makeSupabaseChain({
        single: {
          data: {
            id: 'task-1',
            title: 'Updated Task',
            description: 'Updated Description',
            due_at: null,
            is_poll: false,
          },
          error: null,
        },
        limitResponse: { data: [], error: null },
      });
      tableMocks.task_assignments = makeSupabaseChain();
      tableMocks.task_status = makeSupabaseChain();

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.updateTaskMutation).toBeDefined();
      });

      await result.current.updateTaskMutation.mutateAsync({
        taskId: 'task-1',
        title: 'Updated Task',
        description: 'Updated Description',
        is_poll: false,
      });

      await waitFor(() => {
        expect(result.current.updateTaskMutation.isSuccess).toBe(true);
      });
    });

    it('should toggle task status successfully', async () => {
      const mockTask = {
        id: 'task-1',
        version: 1
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      tableMocks.trip_tasks = makeSupabaseChain({
        maybeSingle: { data: { version: 1 }, error: null },
        limitResponse: { data: [], error: null },
      });

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { success: true, new_version: 2, is_completed: true },
        error: null
      } as any);

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.toggleTaskMutation).toBeDefined();
      });

      await result.current.toggleTaskMutation.mutateAsync({
        taskId: 'task-1',
        completed: true
      });

      await waitFor(() => {
        expect(result.current.toggleTaskMutation.isSuccess).toBe(true);
      });
    });
  });

  describe('Optimistic Locking', () => {
    it('should retry on version conflict', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      const tripTasksChain = makeSupabaseChain({
        limitResponse: { data: [], error: null },
      });
      tripTasksChain.maybeSingle = vi
        .fn()
        .mockResolvedValueOnce({ data: { version: 1 }, error: null })
        .mockResolvedValueOnce({ data: { version: 2 }, error: null });
      tableMocks.trip_tasks = tripTasksChain;

      // First call fails with version conflict, second succeeds
      vi.mocked(supabase.rpc)
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Task has been modified by another user', code: 'P0001' }
        } as any)
        .mockResolvedValueOnce({
          data: { success: true, new_version: 3, is_completed: true },
          error: null
        } as any);

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.toggleTaskMutation).toBeDefined();
      });

      // Use setTimeout to simulate retry delay
      vi.useFakeTimers();
      
      const promise = result.current.toggleTaskMutation.mutateAsync({
        taskId: 'task-1',
        completed: true
      });

      // Advance timers to trigger retry
      await vi.advanceTimersByTimeAsync(2000);

      await promise;

      vi.useRealTimers();

      // Should have retried and succeeded
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      tableMocks.trip_tasks = makeSupabaseChain({
        maybeSingle: { data: { version: 1 }, error: null },
        limitResponse: { data: [], error: null },
      });

      // Always return version conflict
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Task has been modified by another user', code: 'P0001' }
      } as any);

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.toggleTaskMutation).toBeDefined();
      });

      vi.useFakeTimers();

      const promise = result.current.toggleTaskMutation.mutateAsync({
        taskId: 'task-1',
        completed: true
      });

      const expectation = expect(promise).rejects.toThrow();
      await vi.advanceTimersByTimeAsync(10_000);
      await expectation;

      vi.useRealTimers();
    });
  });

  describe('Offline Support', () => {
    it('should queue task creation when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      vi.mocked(offlineSyncService.queueOperation).mockResolvedValue('queue-id-1' as any);

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.createTaskMutation).toBeDefined();
      });

      await expect(
        result.current.createTaskMutation.mutateAsync({
          title: 'Offline Task',
          is_poll: false
        })
      ).rejects.toThrow('OFFLINE:');

      expect(offlineSyncService.queueOperation).toHaveBeenCalledWith(
        'task',
        'create',
        'trip-1',
        expect.objectContaining({ title: 'Offline Task' }),
      );
    });

    it('should queue task toggle when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      vi.mocked(offlineSyncService.queueOperation).mockResolvedValue('queue-id-2' as any);

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.toggleTaskMutation).toBeDefined();
      });

      await expect(
        result.current.toggleTaskMutation.mutateAsync({
          taskId: 'task-1',
          completed: true
        })
      ).rejects.toThrow('OFFLINE:');

      expect(offlineSyncService.queueOperation).toHaveBeenCalledWith(
        'task',
        'update',
        'trip-1',
        { completed: true },
        'task-1',
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle access denied errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      tableMocks.trip_tasks = makeSupabaseChain({
        single: { data: null, error: { code: 'PGRST116', message: 'Access denied' } },
        limitResponse: { data: [], error: null },
      });
      tableMocks.profiles = makeSupabaseChain({
        single: { data: { display_name: 'Test User', avatar_url: null }, error: null },
      });

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.createTaskMutation).toBeDefined();
      });

      await expect(
        result.current.createTaskMutation.mutateAsync({
          title: 'Test Task',
          is_poll: false
        })
      ).rejects.toThrow('Access denied');

      await waitFor(() => {
        expect(result.current.createTaskMutation.isError).toBe(true);
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      tableMocks.trip_tasks = makeSupabaseChain({
        maybeSingle: { data: null, error: { message: 'fetch failed', code: 'NETWORK_ERROR' } },
        limitResponse: { data: [], error: null },
      });

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.toggleTaskMutation).toBeDefined();
      });

      await expect(
        result.current.toggleTaskMutation.mutateAsync({
          taskId: 'task-1',
          completed: true
        })
      ).rejects.toThrow('Network error');

      await waitFor(() => {
        expect(result.current.toggleTaskMutation.isError).toBe(true);
      });
    });
  });

  describe('Pagination', () => {
    it('should limit initial task load to 100 tasks', async () => {
      const mockTasks = Array.from({ length: 150 }, (_, i) => ({
        id: `task-${i}`,
        trip_id: 'trip-1',
        creator_id: 'user-1',
        title: `Task ${i}`,
        is_poll: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        task_status: []
      }));

      tableMocks.trip_tasks = makeSupabaseChain({
        limitResponse: { data: mockTasks.slice(0, 100), error: null },
      });

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks.length).toBe(100);
      expect(result.current.hasMoreTasks).toBe(true);
    });

    it('should load all tasks when loadAllTasks is called', async () => {
      const mockTasks = Array.from({ length: 150 }, (_, i) => ({
        id: `task-${i}`,
        trip_id: 'trip-1',
        creator_id: 'user-1',
        title: `Task ${i}`,
        is_poll: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        task_status: []
      }));

      tableMocks.trip_tasks = makeSupabaseChain({
        limitResponse: { data: mockTasks.slice(0, 100), error: null },
      });

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // After user opts to load all tasks, return the full dataset (no `.limit()` call).
      tableMocks.trip_tasks = makeSupabaseChain({
        then: { data: mockTasks, error: null },
      });

      result.current.loadAllTasks();

      await waitFor(() => {
        expect(result.current.hasMoreTasks).toBe(false);
      });
    });
  });
});
