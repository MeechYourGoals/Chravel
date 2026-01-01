import type { OfflineQueuedOperation } from './db';
import { getReadyOperations, removeOperation, updateOperationStatus } from './queue';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

export type OfflineSyncHandlers = {
  // Chat
  onChatMessageCreate?: (tripId: string, data: unknown) => Promise<unknown>;
  // Tasks
  onTaskToggle?: (taskId: string, data: unknown) => Promise<unknown>;
  // Polls
  onPollVote?: (pollId: string, data: unknown) => Promise<unknown>;
};

/**
 * Process queued operations in order.
 *
 * Safety properties:
 * - If no handler exists for an op, it is preserved (status reset to pending).
 * - Ops are only removed after a handler runs successfully.
 */
export async function processOfflineQueue(handlers: OfflineSyncHandlers): Promise<{
  processed: number;
  failed: number;
}> {
  if (navigator.onLine === false) {
    return { processed: 0, failed: 0 };
  }

  const ready = await getReadyOperations({ maxRetries: MAX_RETRIES, retryDelayMs: RETRY_DELAY_MS });
  let processed = 0;
  let failed = 0;

  for (const op of ready) {
    try {
      const locked = await updateOperationStatus({ operationId: op.id, status: 'syncing' });
      if (!locked) continue;

      const result = await runHandler(op as OfflineQueuedOperation, handlers);
      if (!result.handlerRan) {
        // Preserve operation: no handler provided.
        await updateOperationStatus({ operationId: op.id, status: 'pending' });
        continue;
      }

      // Handler succeeded -> remove.
      await removeOperation(op.id);
      processed++;
    } catch (err) {
      const updated = await updateOperationStatus({
        operationId: op.id,
        status: 'pending',
        incrementRetry: true,
      });

      if (updated && updated.retryCount >= MAX_RETRIES) {
        await updateOperationStatus({ operationId: op.id, status: 'failed' });
        failed++;
      }
    }
  }

  return { processed, failed };
}

async function runHandler(
  op: OfflineQueuedOperation,
  handlers: OfflineSyncHandlers,
): Promise<{ handlerRan: boolean }> {
  switch (op.entityType) {
    case 'chat_message': {
      if (op.operationType === 'create' && handlers.onChatMessageCreate) {
        await handlers.onChatMessageCreate(op.tripId, op.data);
        return { handlerRan: true };
      }
      return { handlerRan: false };
    }
    case 'task': {
      // MVP: only queue task completion toggles (update with completed field)
      if (op.operationType === 'update' && handlers.onTaskToggle && op.entityId) {
        await handlers.onTaskToggle(op.entityId, op.data);
        return { handlerRan: true };
      }
      return { handlerRan: false };
    }
    case 'poll_vote': {
      if (op.operationType === 'create' && handlers.onPollVote && op.entityId) {
        await handlers.onPollVote(op.entityId, op.data);
        return { handlerRan: true };
      }
      return { handlerRan: false };
    }
    default:
      return { handlerRan: false };
  }
}

