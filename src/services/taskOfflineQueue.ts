import { getStorageItem, setStorageItem } from '@/platform/storage';
import { CreateTaskRequest, ToggleTaskRequest } from '@/types/tasks';

export interface QueuedTaskOperation {
  id: string;
  type: 'create' | 'update' | 'toggle';
  tripId: string;
  data: CreateTaskRequest | ToggleTaskRequest;
  timestamp: number;
  retries: number;
}

class TaskOfflineQueue {
  private readonly QUEUE_KEY = 'task_offline_queue';
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds

  /**
   * Get all queued operations
   */
  async getQueue(): Promise<QueuedTaskOperation[]> {
    try {
      return await getStorageItem<QueuedTaskOperation[]>(this.QUEUE_KEY, []);
    } catch (error) {
      console.error('Error loading offline queue:', error);
      return [];
    }
  }

  /**
   * Add an operation to the queue
   */
  async enqueue(operation: Omit<QueuedTaskOperation, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const queue = await this.getQueue();
    const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedOperation: QueuedTaskOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retries: 0
    };

    queue.push(queuedOperation);
    await this.saveQueue(queue);
    
    return id;
  }

  /**
   * Remove an operation from the queue
   */
  async dequeue(operationId: string): Promise<boolean> {
    const queue = await this.getQueue();
    const filtered = queue.filter(op => op.id !== operationId);
    
    if (filtered.length !== queue.length) {
      await this.saveQueue(filtered);
      return true;
    }
    
    return false;
  }

  /**
   * Get operations for a specific trip
   */
  async getTripOperations(tripId: string): Promise<QueuedTaskOperation[]> {
    const queue = await this.getQueue();
    return queue.filter(op => op.tripId === tripId);
  }

  /**
   * Increment retry count for an operation
   */
  async incrementRetry(operationId: string): Promise<QueuedTaskOperation | null> {
    const queue = await this.getQueue();
    const operation = queue.find(op => op.id === operationId);
    
    if (!operation) return null;
    
    operation.retries += 1;
    await this.saveQueue(queue);
    
    return operation;
  }

  /**
   * Clear all operations for a trip
   */
  async clearTripQueue(tripId: string): Promise<void> {
    const queue = await this.getQueue();
    const filtered = queue.filter(op => op.tripId !== tripId);
    await this.saveQueue(filtered);
  }

  /**
   * Clear all operations
   */
  async clearQueue(): Promise<void> {
    await this.saveQueue([]);
  }

  /**
   * Get operations that are ready to retry (exceeded retry delay)
   */
  async getReadyOperations(): Promise<QueuedTaskOperation[]> {
    const queue = await this.getQueue();
    const now = Date.now();
    
    return queue.filter(op => {
      const timeSinceQueued = now - op.timestamp;
      const retryDelay = this.RETRY_DELAY * (op.retries + 1);
      return timeSinceQueued >= retryDelay && op.retries < this.MAX_RETRIES;
    });
  }

  /**
   * Get operations that have exceeded max retries
   */
  async getFailedOperations(): Promise<QueuedTaskOperation[]> {
    const queue = await this.getQueue();
    return queue.filter(op => op.retries >= this.MAX_RETRIES);
  }

  /**
   * Check if online
   */
  private isOnline(): boolean {
    return navigator.onLine !== false;
  }

  /**
   * Save queue to storage
   */
  private async saveQueue(queue: QueuedTaskOperation[]): Promise<void> {
    try {
      await setStorageItem(this.QUEUE_KEY, queue);
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  /**
   * Process queue when online
   */
  async processQueue(
    onCreateTask: (tripId: string, data: CreateTaskRequest) => Promise<any>,
    onToggleTask: (data: ToggleTaskRequest) => Promise<any>
  ): Promise<{ processed: number; failed: number }> {
    if (!this.isOnline()) {
      return { processed: 0, failed: 0 };
    }

    const readyOps = await this.getReadyOperations();
    let processed = 0;
    let failed = 0;

    for (const operation of readyOps) {
      try {
        if (operation.type === 'create') {
          await onCreateTask(operation.tripId, operation.data as CreateTaskRequest);
          await this.dequeue(operation.id);
          processed++;
        } else if (operation.type === 'toggle') {
          await onToggleTask(operation.data as ToggleTaskRequest);
          await this.dequeue(operation.id);
          processed++;
        }
      } catch (error) {
        console.error(`Failed to process operation ${operation.id}:`, error);
        const updated = await this.incrementRetry(operation.id);
        
        if (updated && updated.retries >= this.MAX_RETRIES) {
          failed++;
          // Keep in queue but mark as failed - user can manually retry
        }
      }
    }

    return { processed, failed };
  }
}

export const taskOfflineQueue = new TaskOfflineQueue();
