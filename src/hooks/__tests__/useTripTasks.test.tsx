import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTripTasks } from '../useTripTasks';
import { supabase } from '../../integrations/supabase/client';
import { taskStorageService } from '../../services/taskStorageService';
import { taskOfflineQueue } from '../../services/taskOfflineQueue';

// Mock dependencies
vi.mock('../../integrations/supabase/client');
vi.mock('../../services/taskStorageService');
vi.mock('../../services/taskOfflineQueue');
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

describe('useTripTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
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

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockTasks,
          error: null
        })
      } as any);

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

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockNewTask,
          error: null
        })
      } as any);

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

    it('should toggle task status successfully', async () => {
      const mockTask = {
        id: 'task-1',
        version: 1
      };

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_completed: false, version: 1 },
          error: null
        })
      } as any);

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

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({
            data: { is_completed: false, version: 1 },
            error: null
          })
          .mockResolvedValueOnce({
            data: { is_completed: false, version: 2 },
            error: null
          })
      } as any);

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
      vi.advanceTimersByTime(2000);

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

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { is_completed: false, version: 1 },
          error: null
        })
      } as any);

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

      await expect(
        result.current.toggleTaskMutation.mutateAsync({
          taskId: 'task-1',
          completed: true
        })
      ).rejects.toThrow();

      vi.useRealTimers();
    });
  });

  describe('Offline Support', () => {
    it('should queue task creation when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      vi.mocked(taskOfflineQueue.enqueue).mockResolvedValue('queue-id-1');

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

      expect(taskOfflineQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'create',
          tripId: 'trip-1',
          data: expect.objectContaining({ title: 'Offline Task' })
        })
      );
    });

    it('should queue task toggle when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      vi.mocked(taskOfflineQueue.enqueue).mockResolvedValue('queue-id-2');

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

      expect(taskOfflineQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'toggle',
          tripId: 'trip-1',
          data: expect.objectContaining({ taskId: 'task-1', completed: true })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle access denied errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Access denied' }
        })
      } as any);

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.createTaskMutation).toBeDefined();
      });

      await result.current.createTaskMutation.mutateAsync({
        title: 'Test Task',
        is_poll: false
      });

      await waitFor(() => {
        expect(result.current.createTaskMutation.isError).toBe(true);
      });
    });

    it('should handle network errors', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'fetch failed', code: 'NETWORK_ERROR' }
        })
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

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockTasks.slice(0, 100),
          error: null
        })
      } as any);

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

      let limitCalled = false;
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          limitCalled = true;
          return Promise.resolve({
            data: mockTasks.slice(0, 100),
            error: null
          });
        })
      } as any);

      const { result } = renderHook(() => useTripTasks('trip-1'), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Mock unlimited query
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockTasks,
          error: null
        })
      } as any);

      result.current.loadAllTasks();

      await waitFor(() => {
        expect(result.current.hasMoreTasks).toBe(false);
      });
    });
  });
});
