import { TripTask, CreateTaskRequest, TaskStatus } from '@/types/tasks';
import { getStorageItem, setStorageItem, removeStorageItem } from '@/platform/storage';

class TaskStorageService {
  private getStorageKey(tripId: string): string {
    return `tasks_${tripId}`;
  }

  // Get all tasks for a trip
  async getTasks(tripId: string): Promise<TripTask[]> {
    try {
      return await getStorageItem<TripTask[]>(this.getStorageKey(tripId), []);
    } catch (error) {
      console.error('Error loading tasks from storage:', error);
      return [];
    }
  }

  // Save tasks for a trip
  private async saveTasks(tripId: string, tasks: TripTask[]): Promise<void> {
    try {
      await setStorageItem(this.getStorageKey(tripId), tasks);
    } catch (error) {
      console.error('Error saving tasks to storage:', error);
    }
  }

  // Create a new task
  async createTask(tripId: string, taskData: CreateTaskRequest & { assignedTo: string[] }): Promise<TripTask> {
    const tasks = await this.getTasks(tripId);
    
    const newTask: TripTask = {
      id: `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      trip_id: tripId,
      creator_id: 'demo-user',
      title: taskData.title,
      description: taskData.description,
      due_at: taskData.due_at,
      is_poll: taskData.is_poll,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      creator: {
        id: 'demo-user',
        name: 'You'
      },
      task_status: this.createInitialTaskStatus(taskData, 'demo-user')
    };

    tasks.unshift(newTask);
    await this.saveTasks(tripId, tasks);
    return newTask;
  }

  // Create initial task status based on assignment
  private createInitialTaskStatus(taskData: CreateTaskRequest & { assignedTo: string[] }, creatorId: string): TaskStatus[] {
    if (taskData.is_poll) {
      // Group task - assign to everyone
      return taskData.assignedTo.map(userId => ({
        task_id: '', // Will be set after task creation
        user_id: userId,
        completed: false
      }));
    } else {
      // Single task - assign to specified users or creator
      const assignees = taskData.assignedTo.length > 0 ? taskData.assignedTo : [creatorId];
      return assignees.map(userId => ({
        task_id: '', // Will be set after task creation
        user_id: userId,
        completed: false
      }));
    }
  }

  // Toggle task completion for a user
  async toggleTask(tripId: string, taskId: string, userId: string, completed: boolean): Promise<TripTask | null> {
    const tasks = await this.getTasks(tripId);
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) return null;

    const task = tasks[taskIndex];
    const statusIndex = task.task_status?.findIndex(s => s.user_id === userId) ?? -1;

    if (statusIndex === -1) {
      // Add new status if user not found
      task.task_status = task.task_status || [];
      task.task_status.push({
        task_id: taskId,
        user_id: userId,
        completed,
        completed_at: completed ? new Date().toISOString() : undefined
      });
    } else {
      // Update existing status
      task.task_status[statusIndex] = {
        ...task.task_status[statusIndex],
        completed,
        completed_at: completed ? new Date().toISOString() : undefined
      };
    }

    task.updated_at = new Date().toISOString();
    await this.saveTasks(tripId, tasks);
    return task;
  }

  // Delete a task
  async deleteTask(tripId: string, taskId: string): Promise<boolean> {
    const tasks = await this.getTasks(tripId);
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    
    if (filteredTasks.length !== tasks.length) {
      await this.saveTasks(tripId, filteredTasks);
      return true;
    }
    
    return false;
  }

  // Clear all tasks for a trip (useful for demo reset)
  async clearTasks(tripId: string): Promise<void> {
    await removeStorageItem(this.getStorageKey(tripId));
  }

  // Clear all demo data
  async clearAllDemoTasks(): Promise<void> {
    // Note: platformStorage doesn't expose Object.keys() like localStorage
    // This will be handled by individual clearTasks calls per trip
    console.warn('Clear all demo tasks not fully supported with platformStorage');
  }
}

export const taskStorageService = new TaskStorageService();