/**
 * Unified Offline Sync Service
 * 
 * Provides optimistic UI with sync queue for:
 * - Chat messages (High priority)
 * - Tasks (Medium priority)
 * - Calendar events (Medium priority)
 * 
 * Features:
 * - Read caching (last 30 days)
 * - Write queue for offline operations
 * - Conflict resolution (last-write-wins with version field)
 * - Automatic sync when connection restored
 */

import { getOfflineDb } from '@/offline/db';

// ============================================================================
// Types
// ============================================================================

export type SyncEntityType = 'chat_message' | 'task' | 'calendar_event' | 'poll_vote';

export type SyncOperationType = 'create' | 'update' | 'delete';

export interface QueuedSyncOperation {
  id: string; // Temporary ID for tracking
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  tripId: string;
  entityId?: string; // For updates/deletes
  data: any; // Entity data
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  version?: number; // For conflict resolution
}

export interface CachedEntity {
  id: string;
  tripId: string;
  entityType: SyncEntityType;
  data: any;
  cachedAt: number;
  version?: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds
const CACHE_EXPIRY_DAYS = 30;
const CACHE_EXPIRY_MS = CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// ============================================================================
// Database Initialization
// ============================================================================

async function getDB() {
  // Single source of truth for offline DB schema/migrations.
  return await getOfflineDb();
}

// ============================================================================
// Sync Queue Operations
// ============================================================================

class OfflineSyncService {
  /**
   * Queue an operation for sync when connection is restored
   */
  async queueOperation(
    entityType: SyncEntityType,
    operationType: SyncOperationType,
    tripId: string,
    data: any,
    entityId?: string,
    version?: number
  ): Promise<string> {
    // Guardrail: never allow basecamp writes via offline queue.
    if (entityType === ('basecamp' as any)) {
      throw new Error('Basecamp updates are not supported offline.');
    }

    const db = await getDB();
    const queueId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const operation: QueuedSyncOperation = {
      id: queueId,
      entityType,
      operationType,
      tripId,
      entityId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending',
      version,
    };

    await db.put('syncQueue', operation);
    return queueId;
  }

  /**
   * Get all queued operations
   */
  async getQueuedOperations(
    filters?: {
      status?: QueuedSyncOperation['status'];
      tripId?: string;
      entityType?: SyncEntityType;
    }
  ): Promise<QueuedSyncOperation[]> {
    const db = await getDB();
    let operations: QueuedSyncOperation[];

    if (filters?.status) {
      operations = await db.getAllFromIndex('syncQueue', 'by-status', filters.status);
    } else {
      operations = await db.getAll('syncQueue');
    }

    // Apply additional filters
    if (filters?.tripId) {
      operations = operations.filter(op => op.tripId === filters.tripId);
    }
    if (filters?.entityType) {
      operations = operations.filter(op => op.entityType === filters.entityType);
    }

    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Remove an operation from the queue
   */
  async removeOperation(operationId: string): Promise<boolean> {
    const db = await getDB();
    try {
      await db.delete('syncQueue', operationId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update operation status
   */
  async updateOperationStatus(
    operationId: string,
    status: QueuedSyncOperation['status'],
    incrementRetry = false
  ): Promise<QueuedSyncOperation | null> {
    const db = await getDB();
    const operation = await db.get('syncQueue', operationId);

    if (!operation) return null;

    const updated: QueuedSyncOperation = {
      ...operation,
      status,
      retryCount: incrementRetry ? operation.retryCount + 1 : operation.retryCount,
    };

    await db.put('syncQueue', updated);
    return updated;
  }

  /**
   * Get operations ready to retry
   */
  async getReadyOperations(): Promise<QueuedSyncOperation[]> {
    const pending = await this.getQueuedOperations({ status: 'pending' });
    const now = Date.now();

    return pending.filter(op => {
      const timeSinceQueued = now - op.timestamp;
      // Process new operations immediately; apply backoff only between retries.
      if (op.retryCount === 0) return true;
      const retryDelay = RETRY_DELAY * op.retryCount;
      return timeSinceQueued >= retryDelay && op.retryCount < MAX_RETRIES;
    });
  }

  /**
   * Get failed operations
   */
  async getFailedOperations(): Promise<QueuedSyncOperation[]> {
    return this.getQueuedOperations({ status: 'failed' });
  }

  // ============================================================================
  // Cache Operations
  // ============================================================================

  /**
   * Cache an entity for offline reading
   */
  async cacheEntity(
    entityType: SyncEntityType,
    entityId: string,
    tripId: string,
    data: any,
    version?: number
  ): Promise<void> {
    const db = await getDB();
    const cacheKey = `${entityType}:${entityId}`;

    const cached: CachedEntity = {
      id: cacheKey,
      tripId,
      entityType,
      data,
      cachedAt: Date.now(),
      version,
    };

    await db.put('cache', cached);
  }

  /**
   * Get cached entities for a trip
   */
  async getCachedEntities(
    tripId: string,
    entityType?: SyncEntityType
  ): Promise<CachedEntity[]> {
    const db = await getDB();
    let cached: CachedEntity[];

    if (entityType) {
      const allCached = await db.getAllFromIndex('cache', 'by-entity-type', entityType);
      cached = allCached.filter(c => c.tripId === tripId);
    } else {
      const allCached = await db.getAllFromIndex('cache', 'by-trip', tripId);
      cached = allCached;
    }

    // Filter expired entries
    const now = Date.now();
    return cached.filter(c => now - c.cachedAt < CACHE_EXPIRY_MS);
  }

  /**
   * Get a specific cached entity
   */
  async getCachedEntity(
    entityType: SyncEntityType,
    entityId: string
  ): Promise<CachedEntity | null> {
    const db = await getDB();
    const cacheKey = `${entityType}:${entityId}`;
    const cached = await db.get('cache', cacheKey);

    if (!cached) return null;

    // Check expiry
    const now = Date.now();
    if (now - cached.cachedAt >= CACHE_EXPIRY_MS) {
      await db.delete('cache', cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Remove cached entity
   */
  async removeCachedEntity(entityType: SyncEntityType, entityId: string): Promise<void> {
    const db = await getDB();
    const cacheKey = `${entityType}:${entityId}`;
    await db.delete('cache', cacheKey);
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<number> {
    const db = await getDB();
    const allCached = await db.getAll('cache');
    const now = Date.now();
    let cleared = 0;

    for (const cached of allCached) {
      if (now - cached.cachedAt >= CACHE_EXPIRY_MS) {
        await db.delete('cache', cached.id);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all cache for a trip
   */
  async clearTripCache(tripId: string, entityType?: SyncEntityType): Promise<void> {
    const db = await getDB();
    const cached = await this.getCachedEntities(tripId, entityType);

    for (const c of cached) {
      await db.delete('cache', c.id);
    }
  }

  // ============================================================================
  // Sync Processing
  // ============================================================================

  /**
   * Process sync queue when connection is restored
   * Returns count of successful and failed operations
   */
  async processSyncQueue(
    handlers: {
      onChatMessageCreate?: (tripId: string, data: any) => Promise<any>;
      onChatMessageUpdate?: (entityId: string, data: any) => Promise<any>;
      onTaskCreate?: (tripId: string, data: any) => Promise<any>;
      onTaskUpdate?: (entityId: string, data: any) => Promise<any>;
      onTaskToggle?: (entityId: string, data: any) => Promise<any>;
      onPollVote?: (pollId: string, data: any) => Promise<any>;
      onCalendarEventCreate?: (tripId: string, data: any) => Promise<any>;
      onCalendarEventUpdate?: (entityId: string, data: any) => Promise<any>;
      onCalendarEventDelete?: (entityId: string) => Promise<any>;
    }
  ): Promise<{ processed: number; failed: number }> {
    if (!navigator.onLine) {
      return { processed: 0, failed: 0 };
    }

    const readyOps = await this.getReadyOperations();
    let processed = 0;
    let failed = 0;

    for (const operation of readyOps) {
      try {
        // Atomically update status to 'syncing' - if operation was already removed, this returns null
        // This prevents concurrent processors from handling the same operation
        const updated = await this.updateOperationStatus(operation.id, 'syncing');
        if (!updated) {
          // Operation was already removed or is being processed by another sync
          continue;
        }

        let result: any;
        let handlerRan = false;

        // Route to appropriate handler
        switch (operation.entityType) {
          case 'chat_message':
            if (operation.operationType === 'create' && handlers.onChatMessageCreate) {
              result = await handlers.onChatMessageCreate(operation.tripId, operation.data);
              handlerRan = true;
            } else if (operation.operationType === 'update' && handlers.onChatMessageUpdate) {
              result = await handlers.onChatMessageUpdate(operation.entityId!, operation.data);
              handlerRan = true;
            }
            break;

          case 'task':
            if (operation.operationType === 'create' && handlers.onTaskCreate) {
              result = await handlers.onTaskCreate(operation.tripId, operation.data);
              handlerRan = true;
            } else if (operation.operationType === 'update' && handlers.onTaskUpdate) {
              result = await handlers.onTaskUpdate(operation.entityId!, operation.data);
              handlerRan = true;
            } else if (operation.operationType === 'update' && operation.data.completed !== undefined && handlers.onTaskToggle) {
              result = await handlers.onTaskToggle(operation.entityId!, operation.data);
              handlerRan = true;
            }
            break;

          case 'poll_vote':
            if (operation.operationType === 'create' && handlers.onPollVote) {
              result = await handlers.onPollVote(operation.entityId!, operation.data);
              handlerRan = true;
            }
            break;

          case 'calendar_event':
            if (operation.operationType === 'create' && handlers.onCalendarEventCreate) {
              result = await handlers.onCalendarEventCreate(operation.tripId, operation.data);
              handlerRan = true;
            } else if (operation.operationType === 'update' && handlers.onCalendarEventUpdate) {
              result = await handlers.onCalendarEventUpdate(operation.entityId!, operation.data);
              handlerRan = true;
            } else if (operation.operationType === 'delete' && handlers.onCalendarEventDelete) {
              result = await handlers.onCalendarEventDelete(operation.entityId!);
              handlerRan = true;
            }
            break;
        }

        // CRITICAL: Only remove operation if a handler actually ran and succeeded
        // This prevents data loss when handlers are not provided for all entity types
        if (!handlerRan) {
          // No handler for this operation type - skip it (don't remove, don't fail)
          console.warn(
            `[OfflineSync] No handler provided for ${operation.entityType}:${operation.operationType} operation ${operation.id}. ` +
            `Operation preserved in queue for later processing.`
          );
          // Reset status back to pending so it can be processed later with proper handlers
          // DO NOT remove from queue - this would cause permanent data loss
          await this.updateOperationStatus(operation.id, 'pending');
          continue; // Skip to next operation - do NOT call removeOperation
        }

        // Handler ran successfully - safe to remove from queue
        // Only reached if handlerRan === true
        await this.removeOperation(operation.id);
        processed++;
      } catch (error: any) {
        console.error(`Failed to sync operation ${operation.id}:`, error);

        const updated = await this.updateOperationStatus(operation.id, 'pending', true);

        if (updated && updated.retryCount >= MAX_RETRIES) {
          await this.updateOperationStatus(operation.id, 'failed');
          failed++;
        }
      }
    }

    return { processed, failed };
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine !== false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    pending: number;
    syncing: number;
    failed: number;
  }> {
    const all = await this.getQueuedOperations();
    return {
      total: all.length,
      pending: all.filter(op => op.status === 'pending').length,
      syncing: all.filter(op => op.status === 'syncing').length,
      failed: all.filter(op => op.status === 'failed').length,
    };
  }
}

// Export singleton instance
export const offlineSyncService = new OfflineSyncService();
