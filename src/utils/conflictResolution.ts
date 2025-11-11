/**
 * Conflict Resolution Utilities
 * 
 * Implements last-write-wins with optimistic locking using version fields
 * for chat messages, tasks, and calendar events
 */

import { OptimisticLockError } from './concurrencyUtils';

export interface VersionedEntity {
  id: string;
  version?: number | null;
  updated_at?: string;
  [key: string]: any;
}

/**
 * Check if an error indicates a version conflict
 */
export function isVersionConflict(error: any): boolean {
  if (!error) return false;

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';

  return (
    errorMessage.includes('version') ||
    errorMessage.includes('conflict') ||
    errorMessage.includes('modified by another user') ||
    errorMessage.includes('concurrent modification') ||
    errorCode === 'P0001' || // PostgreSQL exception code
    errorCode === '23505' || // Unique violation (can indicate conflict)
    error instanceof OptimisticLockError
  );
}

/**
 * Extract version from entity or error response
 */
export function extractVersion(entity: VersionedEntity | null, error?: any): number {
  if (entity?.version !== null && entity?.version !== undefined) {
    return entity.version;
  }

  // Try to extract from error response
  if (error?.data?.version !== null && error?.data?.version !== undefined) {
    return error.data.version;
  }

  // Default to 1 if no version found
  return 1;
}

/**
 * Resolve conflict using last-write-wins strategy
 * 
 * @param localEntity - Local version of the entity
 * @param serverEntity - Server version of the entity
 * @returns The resolved entity (server wins if timestamps are equal)
 */
export function resolveConflict(
  localEntity: VersionedEntity,
  serverEntity: VersionedEntity
): VersionedEntity {
  const localTime = localEntity.updated_at 
    ? new Date(localEntity.updated_at).getTime() 
    : 0;
  const serverTime = serverEntity.updated_at 
    ? new Date(serverEntity.updated_at).getTime() 
    : 0;

  // Last-write-wins: use the entity with the most recent updated_at
  if (serverTime >= localTime) {
    return serverEntity;
  }

  return localEntity;
}

/**
 * Create optimistic update with version increment
 */
export function createOptimisticUpdate<T extends VersionedEntity>(
  entity: T,
  updates: Partial<T>
): T {
  const currentVersion = entity.version || 1;
  return {
    ...entity,
    ...updates,
    version: currentVersion + 1,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Validate version before update
 * Throws OptimisticLockError if versions don't match
 */
export function validateVersion(
  localVersion: number,
  serverVersion: number | null | undefined,
  entityId: string
): void {
  const serverVer = serverVersion || 1;

  if (localVersion !== serverVer) {
    throw new OptimisticLockError(
      `Entity ${entityId} has been modified by another user. Local version: ${localVersion}, Server version: ${serverVer}. Please refresh and try again.`
    );
  }
}

/**
 * Handle version conflict error with retry logic
 */
export async function handleVersionConflict<T>(
  operation: () => Promise<T>,
  getCurrentVersion: () => Promise<number>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      if (!isVersionConflict(error)) {
        // Not a version conflict, re-throw immediately
        throw error;
      }

      if (attempt === maxRetries) {
        // Max retries reached
        break;
      }

      // Get current version and retry
      try {
        const currentVersion = await getCurrentVersion();
        // Wait a bit before retry (exponential backoff)
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );
        // Operation will be retried with updated version
      } catch (versionError) {
        // Can't get version, give up
        throw new OptimisticLockError(
          'Unable to resolve version conflict. Please refresh and try again.'
        );
      }
    }
  }

  throw lastError || new OptimisticLockError('Max retries exceeded');
}

/**
 * Merge local and server changes (simple last-write-wins)
 * For more complex scenarios, consider operational transformation
 */
export function mergeChanges<T extends VersionedEntity>(
  local: T,
  server: T
): T {
  return resolveConflict(local, server) as T;
}

/**
 * Check if entity needs sync based on version
 */
export function needsSync(
  localEntity: VersionedEntity | null,
  serverEntity: VersionedEntity
): boolean {
  if (!localEntity) return true;

  const localVersion = localEntity.version || 1;
  const serverVersion = serverEntity.version || 1;

  return serverVersion > localVersion;
}
