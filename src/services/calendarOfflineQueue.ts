/**
 * Calendar Events Offline Queue
 * Queues calendar event operations for sync when connection is restored
 */

import { offlineSyncService } from './offlineSyncService';
import type { CreateEventData, TripEvent } from './calendarService';

export interface QueuedCalendarOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  tripId: string;
  eventId?: string;
  data?: CreateEventData | Partial<TripEvent>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  version?: number;
}

class CalendarOfflineQueue {
  /**
   * Queue a calendar event creation
   */
  async queueCreate(tripId: string, eventData: CreateEventData): Promise<string> {
    return offlineSyncService.queueOperation('calendar_event', 'create', tripId, eventData);
  }

  /**
   * Queue a calendar event update
   */
  async queueUpdate(
    tripId: string,
    eventId: string,
    updates: Partial<TripEvent>,
    version?: number,
  ): Promise<string> {
    return offlineSyncService.queueOperation(
      'calendar_event',
      'update',
      tripId,
      updates,
      eventId,
      version,
    );
  }

  /**
   * Queue a calendar event deletion
   */
  async queueDelete(tripId: string, eventId: string): Promise<string> {
    return offlineSyncService.queueOperation('calendar_event', 'delete', tripId, {}, eventId);
  }

  /**
   * Get queued operations for a trip
   */
  async getQueuedOperations(tripId: string): Promise<QueuedCalendarOperation[]> {
    const operations = await offlineSyncService.getQueuedOperations({
      tripId,
      entityType: 'calendar_event',
    });

    return operations.map(op => ({
      id: op.id,
      type: op.operationType as 'create' | 'update' | 'delete',
      tripId: op.tripId,
      eventId: op.entityId,
      data: op.data,
      timestamp: op.timestamp,
      retryCount: op.retryCount,
      status: op.status,
      version: op.version,
    }));
  }

  /**
   * Get failed operations
   */
  async getFailedOperations(tripId?: string): Promise<QueuedCalendarOperation[]> {
    const filters: any = {
      status: 'failed',
      entityType: 'calendar_event',
    };
    if (tripId) {
      filters.tripId = tripId;
    }

    const operations = await offlineSyncService.getQueuedOperations(filters);

    return operations.map(op => ({
      id: op.id,
      type: op.operationType as 'create' | 'update' | 'delete',
      tripId: op.tripId,
      eventId: op.entityId,
      data: op.data,
      timestamp: op.timestamp,
      retryCount: op.retryCount,
      status: op.status,
      version: op.version,
    }));
  }

  /**
   * Remove an operation from the queue
   */
  async removeOperation(operationId: string): Promise<boolean> {
    return offlineSyncService.removeOperation(operationId);
  }

  /**
   * Retry a failed operation
   */
  async retryOperation(operationId: string): Promise<boolean> {
    const operations = await offlineSyncService.getQueuedOperations();
    const operation = operations.find(op => op.id === operationId);

    if (!operation || operation.status !== 'failed') {
      return false;
    }

    await offlineSyncService.updateOperationStatus(operationId, 'pending');
    return true;
  }

  /**
   * Clear all queued operations for a trip
   */
  async clearTripQueue(tripId: string): Promise<void> {
    const operations = await this.getQueuedOperations(tripId);
    await Promise.all(operations.map(op => this.removeOperation(op.id)));
  }
}

export const calendarOfflineQueue = new CalendarOfflineQueue();
