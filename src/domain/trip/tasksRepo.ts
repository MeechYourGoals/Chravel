import { supabase } from '@/integrations/supabase/client';

export interface TripTask {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  due_at?: string;
  completed: boolean;
  completed_at?: string;
  creator_id: string;
  // Note: Assignments are in task_assignments table, handled separately or via join
}

/**
 * Tasks Repository (TDAL)
 */
export const tasksRepo = {
  async getTasks(tripId: string): Promise<TripTask[]> {
    const { data, error } = await supabase
      .from('trip_tasks')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createTask(task: Omit<TripTask, 'id' | 'created_at' | 'completed' | 'completed_at'>): Promise<TripTask> {
    const { data, error } = await supabase
      .from('trip_tasks')
      .insert({
          ...task,
          completed: false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTask(taskId: string, updates: Partial<TripTask>): Promise<TripTask> {
    const { data, error } = await supabase
      .from('trip_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTask(taskId: string): Promise<void> {
      const { error } = await supabase
        .from('trip_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
  }
};
