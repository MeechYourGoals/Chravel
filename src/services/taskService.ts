/**
 * Task Service - Authenticated Mode
 * 
 * Provides task CRUD operations for authenticated users.
 * Wraps taskStorageService and useTripTasks hook for easier consumption.
 * 
 * PHASE 2: Collaboration Features
 */

import { supabase } from '@/integrations/supabase/client';
import { taskStorageService } from './taskStorageService';

export interface Task {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  creator_id: string;
  due_at?: string;
  is_poll: boolean;
  created_at: string;
  updated_at: string;
  version?: number;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  due_at?: string;
  assignedTo?: string[];
  is_poll?: boolean;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  due_at?: string;
  completed?: boolean;
}

export const taskService = {
  /**
   * Get all tasks for a trip (authenticated mode)
   */
  async getTasks(tripId: string, isDemoMode: boolean = false): Promise<Task[]> {
    if (isDemoMode) {
      // Demo mode uses taskStorageService directly
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('trip_tasks')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(item => ({
        id: item.id,
        trip_id: item.trip_id,
        title: item.title,
        description: item.description || undefined,
        creator_id: item.creator_id,
        due_at: item.due_at || undefined,
        is_poll: item.is_poll,
        created_at: item.created_at,
        updated_at: item.updated_at,
        version: item.version || undefined
      }));
    } catch (error) {
      console.error('[taskService] Error fetching tasks:', error);
      throw error;
    }
  },

  /**
   * Create a new task (authenticated mode)
   */
  async createTask(
    tripId: string, 
    taskData: CreateTaskRequest,
    isDemoMode: boolean = false
  ): Promise<Task> {
    if (isDemoMode) {
      // Demo mode uses taskStorageService - need to adapt types
      const result = await taskStorageService.createTask(tripId, {
        ...taskData,
        is_poll: taskData.is_poll || false,
        assignedTo: taskData.assignedTo || []
      });
      
      return {
        id: result.id,
        trip_id: result.trip_id,
        title: result.title,
        description: result.description,
        creator_id: result.creator_id,
        due_at: result.due_at,
        is_poll: result.is_poll,
        created_at: result.created_at,
        updated_at: result.updated_at
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('trip_tasks')
        .insert({
          trip_id: tripId,
          title: taskData.title,
          description: taskData.description,
          due_at: taskData.due_at,
          creator_id: user.id,
          is_poll: taskData.is_poll || false
        })
        .select()
        .single();

      if (error) throw error;

      // Handle task assignments if provided
      if (taskData.assignedTo && taskData.assignedTo.length > 0) {
        await this.assignTask(data.id, taskData.assignedTo);
      }

      return {
        id: data.id,
        trip_id: data.trip_id,
        title: data.title,
        description: data.description || undefined,
        creator_id: data.creator_id,
        due_at: data.due_at || undefined,
        is_poll: data.is_poll,
        created_at: data.created_at,
        updated_at: data.updated_at,
        version: data.version || undefined
      };
    } catch (error) {
      console.error('[taskService] Error creating task:', error);
      throw error;
    }
  },

  /**
   * Update an existing task (authenticated mode)
   */
  async updateTask(
    taskId: string,
    updates: UpdateTaskRequest,
    isDemoMode: boolean = false
  ): Promise<Task> {
    if (isDemoMode) {
      throw new Error('Update not supported in demo mode');
    }

    try {
      const { data, error } = await supabase
        .from('trip_tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[taskService] Error updating task:', error);
      throw error;
    }
  },

  /**
   * Toggle task completion status
   * Uses task_status table for per-user completion tracking
   */
  async toggleTask(
    taskId: string, 
    userId: string,
    completed: boolean
  ): Promise<void> {
    try {
      // Upsert task_status for this user
      const { error } = await supabase
        .from('task_status')
        .upsert({
          task_id: taskId,
          user_id: userId,
          completed,
          completed_at: completed ? new Date().toISOString() : null
        }, {
          onConflict: 'task_id,user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('[taskService] Error toggling task:', error);
      throw error;
    }
  },

  /**
   * Delete a task (authenticated mode)
   */
  async deleteTask(taskId: string, isDemoMode: boolean = false): Promise<void> {
    if (isDemoMode) {
      throw new Error('Delete not supported in demo mode');
    }

    try {
      const { error } = await supabase
        .from('trip_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('[taskService] Error deleting task:', error);
      throw error;
    }
  },

  /**
   * Assign users to a task
   */
  async assignTask(taskId: string, userIds: string[]): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const assignments = userIds.map(userId => ({
        task_id: taskId,
        user_id: userId,
        assigned_by: user.id
      }));

      const { error } = await supabase
        .from('task_assignments')
        .insert(assignments);

      if (error) throw error;
    } catch (error) {
      console.error('[taskService] Error assigning task:', error);
      throw error;
    }
  },

  /**
   * Get users assigned to a task
   */
  async getTaskAssignees(taskId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', taskId);

      if (error) throw error;
      return data?.map(a => a.user_id) || [];
    } catch (error) {
      console.error('[taskService] Error fetching assignees:', error);
      return [];
    }
  }
};
