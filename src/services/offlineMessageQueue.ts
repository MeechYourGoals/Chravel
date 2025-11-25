/**
 * Offline Message Queue Service
 * Queues messages sent while offline and syncs them when connection is restored
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessageInsert } from './chatService';

interface QueuedMessage {
  id: string; // Temporary ID for tracking
  message: ChatMessageInsert;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed';
}

interface OfflineQueueDB extends DBSchema {
  queue: {
    key: string;
    value: QueuedMessage;
    indexes: { 'by-status': string; 'by-timestamp': number };
  };
}

const DB_NAME = 'chravel-offline-queue';
const DB_VERSION = 1;
const MAX_RETRIES = 3;

let dbInstance: IDBPDatabase<OfflineQueueDB> | null = null;

async function getDB(): Promise<IDBPDatabase<OfflineQueueDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('queue')) {
        const store = db.createObjectStore('queue', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return dbInstance;
}

/**
 * Queue a message for sending when connection is restored
 */
export async function queueMessage(message: ChatMessageInsert): Promise<string> {
  const db = await getDB();
  const queueId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const queuedMessage: QueuedMessage = {
    id: queueId,
    message,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
  };

  await db.put('queue', queuedMessage);
  return queueId;
}

/**
 * Get all pending messages from the queue
 */
export async function getQueuedMessages(): Promise<QueuedMessage[]> {
  const db = await getDB();
  return db.getAllFromIndex('queue', 'by-status', 'pending');
}

/**
 * Process queued messages when connection is restored
 */
export async function processQueue(): Promise<{ success: number; failed: number }> {
  const db = await getDB();
  const pendingMessages = await db.getAllFromIndex('queue', 'by-status', 'pending');
  
  let success = 0;
  let failed = 0;

  for (const queued of pendingMessages) {
    try {
      // Update status to sending
      await db.put('queue', { ...queued, status: 'sending' });

      // Attempt to send
      const { data, error } = await supabase
        .from('trip_chat_messages')
        .insert({
          ...queued.message,
          privacy_mode: queued.message.privacy_mode || 'standard',
        })
        .select()
        .single();

      if (error) throw error;

      // Success - remove from queue
      await db.delete('queue', queued.id);
      success++;
    } catch (error) {
      console.error(`Failed to send queued message ${queued.id}:`, error);
      
      const newRetryCount = queued.retryCount + 1;
      
      if (newRetryCount >= MAX_RETRIES) {
        // Max retries reached - mark as failed
        await db.put('queue', {
          ...queued,
          status: 'failed',
          retryCount: newRetryCount,
        });
        failed++;
      } else {
        // Retry later
        await db.put('queue', {
          ...queued,
          status: 'pending',
          retryCount: newRetryCount,
        });
      }
    }
  }

  return { success, failed };
}

/**
 * Remove a message from the queue (e.g., after successful send)
 */
export async function removeQueuedMessage(queueId: string): Promise<void> {
  const db = await getDB();
  await db.delete('queue', queueId);
}

/**
 * Get failed messages for user review
 */
export async function getFailedMessages(): Promise<QueuedMessage[]> {
  const db = await getDB();
  return db.getAllFromIndex('queue', 'by-status', 'failed');
}

/**
 * Retry a failed message
 */
export async function retryFailedMessage(queueId: string): Promise<boolean> {
  const db = await getDB();
  const queued = await db.get('queue', queueId);
  
  if (!queued || queued.status !== 'failed') {
    return false;
  }

  await db.put('queue', {
    ...queued,
    status: 'pending',
    retryCount: 0,
  });

  // Try to process immediately
  await processQueue();
  return true;
}

/**
 * Clear all queued messages (use with caution)
 */
export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.clear('queue');
}
