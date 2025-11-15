/**
 * Global Sync Processor
 * 
 * Provides all handlers for processing the unified offline sync queue.
 * This ensures no operations are dropped due to missing handlers.
 * 
 * Call this from App.tsx or a dedicated sync hook to process all queued operations.
 */

import { offlineSyncService } from './offlineSyncService';
import { sendChatMessage } from './chatService';
import { calendarService } from './calendarService';

/**
 * Process sync queue with all handlers
 * 
 * This should be called:
 * - When connection is restored (online event)
 * - Periodically when online
 * - On app startup if online
 */
export async function processGlobalSyncQueue(): Promise<{
  processed: number;
  failed: number;
  skipped: number;
}> {
  if (!navigator.onLine) {
    return { processed: 0, failed: 0, skipped: 0 };
  }

  // Get all operations before processing to check for skipped ones
  const allOperations = await offlineSyncService.getQueuedOperations({ status: 'pending' });
  
  const result = await offlineSyncService.processSyncQueue({
    // Chat message handlers
    onChatMessageCreate: async (tripId, data) => {
      return await sendChatMessage(data);
    },
    onChatMessageUpdate: async (entityId, data) => {
      // Chat message updates are rare, but handle if needed
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: updated, error } = await supabase
        .from('trip_chat_messages')
        .update(data)
        .eq('id', entityId)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },

    // Task handlers - delegate to task service
    onTaskCreate: async (tripId, data) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: newTask, error } = await supabase
        .from('trip_tasks')
        .insert({
          trip_id: tripId,
          creator_id: user.id,
          title: data.title,
          description: data.description,
          due_at: data.due_at,
          is_poll: data.is_poll,
        })
        .select()
        .single();

      if (error) throw error;
      return newTask;
    },
    onTaskUpdate: async (entityId, data) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: updated, error } = await supabase
        .from('trip_tasks')
        .update(data)
        .eq('id', entityId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onTaskToggle: async (entityId, data) => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Use the same atomic function as useTripTasks
      const { error } = await supabase.rpc('toggle_task_status', {
        p_task_id: entityId,
        p_user_id: user.id,
        p_completed: data.completed,
        p_current_version: data.version || 1,
      });

      if (error) throw error;
      return { taskId: entityId, completed: data.completed };
    },

    // Calendar event handlers
    onCalendarEventCreate: async (tripId, data) => {
      const result = await calendarService.createEvent(data);
      if (!result) throw new Error('Failed to create calendar event');
      return result;
    },
    onCalendarEventUpdate: async (entityId, data) => {
      const success = await calendarService.updateEvent(entityId, data);
      if (!success) throw new Error('Failed to update calendar event');
      return { id: entityId, ...data };
    },
    onCalendarEventDelete: async (entityId) => {
      const success = await calendarService.deleteEvent(entityId);
      if (!success) throw new Error('Failed to delete calendar event');
      return { id: entityId };
    },
  });

  // Count skipped operations (those without handlers)
  const operationsAfter = await offlineSyncService.getQueuedOperations({ status: 'pending' });
  const skipped = allOperations.length - operationsAfter.length - result.processed - result.failed;

  return {
    ...result,
    skipped: Math.max(0, skipped), // Ensure non-negative
  };
}

/**
 * Hook to use in App.tsx or a dedicated sync component
 * Processes sync queue when connection is restored
 */
export function setupGlobalSyncProcessor() {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    try {
      const result = await processGlobalSyncQueue();
      
      if (result.skipped > 0) {
        console.warn(`[Sync] ${result.skipped} operations skipped (no handlers)`);
      }
    } catch (error) {
      console.error('[Sync] Error processing sync queue:', error);
    }
  };

  // Process on mount if online
  if (navigator.onLine) {
    handleOnline();
  }

  // Process when connection restored
  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
