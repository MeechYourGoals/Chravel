import { getOfflineDb, type OfflineQueuedOperation, type OfflineQueueStatus } from './db';

export type OfflineQueueEntityType = 'chat_message' | 'task' | 'calendar_event' | 'poll_vote';
export type OfflineQueueOperationType = 'create' | 'update' | 'delete';

const MAX_RETRIES_DEFAULT = 3;

function randomId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function enqueueOperation(params: {
  entityType: OfflineQueueEntityType;
  operationType: OfflineQueueOperationType;
  tripId: string;
  data: unknown;
  entityId?: string;
  version?: number;
  id?: string;
}): Promise<string> {
  // Guardrail: never allow basecamp writes in the offline queue.
  if (params.entityType === ('basecamp' as any)) {
    throw new Error('Basecamp updates are not supported offline.');
  }

  const db = await getOfflineDb();
  const id = params.id ?? randomId('sync');

  const operation: OfflineQueuedOperation = {
    id,
    entityType: params.entityType,
    operationType: params.operationType,
    tripId: params.tripId,
    entityId: params.entityId,
    data: params.data,
    timestamp: Date.now(),
    retryCount: 0,
    status: 'pending',
    version: params.version,
  };

  await db.put('syncQueue', operation);
  return id;
}

export async function getQueuedOperations(filters?: {
  status?: OfflineQueueStatus;
  tripId?: string;
  entityType?: OfflineQueueEntityType;
}): Promise<OfflineQueuedOperation[]> {
  const db = await getOfflineDb();
  let ops: OfflineQueuedOperation[];

  if (filters?.status) {
    ops = await db.getAllFromIndex('syncQueue', 'by-status', filters.status);
  } else {
    ops = await db.getAll('syncQueue');
  }

  if (filters?.tripId) ops = ops.filter(o => o.tripId === filters.tripId);
  if (filters?.entityType) ops = ops.filter(o => o.entityType === filters.entityType);

  return ops.sort((a, b) => a.timestamp - b.timestamp);
}

export async function removeOperation(operationId: string): Promise<boolean> {
  const db = await getOfflineDb();
  try {
    await db.delete('syncQueue', operationId);
    return true;
  } catch {
    return false;
  }
}

export async function updateOperationStatus(params: {
  operationId: string;
  status: OfflineQueueStatus;
  incrementRetry?: boolean;
}): Promise<OfflineQueuedOperation | null> {
  const db = await getOfflineDb();
  const op = await db.get('syncQueue', params.operationId);
  if (!op) return null;

  const updated: OfflineQueuedOperation = {
    ...op,
    status: params.status,
    retryCount: params.incrementRetry ? op.retryCount + 1 : op.retryCount,
  };
  await db.put('syncQueue', updated);
  return updated;
}

export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  syncing: number;
  failed: number;
}> {
  const ops = await getQueuedOperations();
  return {
    total: ops.length,
    pending: ops.filter(o => o.status === 'pending').length,
    syncing: ops.filter(o => o.status === 'syncing').length,
    failed: ops.filter(o => o.status === 'failed').length,
  };
}

export async function getReadyOperations(params?: {
  maxRetries?: number;
  retryDelayMs?: number;
}): Promise<OfflineQueuedOperation[]> {
  const maxRetries = params?.maxRetries ?? MAX_RETRIES_DEFAULT;
  const retryDelayMs = params?.retryDelayMs ?? 5000;
  const pending = await getQueuedOperations({ status: 'pending' });
  const now = Date.now();

  return pending.filter(op => {
    const retryDelay = retryDelayMs * (op.retryCount + 1);
    return now - op.timestamp >= retryDelay && op.retryCount < maxRetries;
  });
}

export async function clearAllQueuedOperations(): Promise<void> {
  const ops = await getQueuedOperations();
  await Promise.all(ops.map(op => removeOperation(op.id)));
}
