import { toast } from '@/hooks/use-toast';

export interface VersionedData {
  version: number;
  updated_at: string;
  [key: string]: any;
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  resolvedData?: VersionedData;
}

/**
 * Detect version conflicts
 */
export function detectConflict(localVersion: number, remoteVersion: number): boolean {
  return remoteVersion > localVersion;
}

/**
 * Resolve conflicts based on strategy
 */
export function resolveConflict(
  localData: VersionedData,
  remoteData: VersionedData,
  strategy: ConflictResolution['strategy'] = 'remote',
): ConflictResolution {
  console.log('[Conflict] Resolving conflict', {
    localVersion: localData.version,
    remoteVersion: remoteData.version,
    strategy,
  });

  switch (strategy) {
    case 'local':
      // Keep local changes, discard remote
      return {
        strategy: 'local',
        resolvedData: localData,
      };

    case 'remote':
      // Keep remote changes, discard local
      toast({
        title: 'Changes Updated',
        description: 'This item was modified by another user. Showing latest version.',
        duration: 4000,
      });
      return {
        strategy: 'remote',
        resolvedData: remoteData,
      };

    case 'merge': {
      // Attempt to merge both changes (simple field-level merge)
      const merged = { ...localData };

      // Take newer values for each field
      Object.keys(remoteData).forEach(key => {
        if (key !== 'version' && key !== 'updated_at') {
          // If local doesn't have this field or remote is newer, take remote
          if (!localData[key] || new Date(remoteData.updated_at) > new Date(localData.updated_at)) {
            merged[key] = remoteData[key];
          }
        }
      });

      // Use remote version and timestamp
      merged.version = remoteData.version;
      merged.updated_at = remoteData.updated_at;

      toast({
        title: 'Changes Merged',
        description: 'Your changes were merged with updates from another user.',
        duration: 4000,
      });

      return {
        strategy: 'merge',
        resolvedData: merged,
      };
    }

    case 'manual':
      // Let user choose
      toast({
        title: 'Conflict Detected',
        description: 'This item was modified by another user. Please refresh and try again.',
        variant: 'destructive',
        duration: 5000,
      });
      return {
        strategy: 'manual',
        resolvedData: undefined,
      };

    default:
      return {
        strategy: 'remote',
        resolvedData: remoteData,
      };
  }
}

/**
 * Handle optimistic update conflicts
 */
export async function handleOptimisticUpdateConflict<T extends VersionedData>(
  optimisticData: T,
  serverFetch: () => Promise<T>,
  onConflict: (resolution: ConflictResolution) => void,
  strategy: ConflictResolution['strategy'] = 'remote',
): Promise<T> {
  try {
    // Fetch latest from server
    const serverData = await serverFetch();

    // Check for conflict
    if (detectConflict(optimisticData.version, serverData.version)) {
      console.log('[Conflict] Version mismatch detected');

      // Resolve conflict
      const resolution = resolveConflict(optimisticData, serverData, strategy);
      onConflict(resolution);

      return resolution.resolvedData || serverData;
    }

    // No conflict
    return optimisticData;
  } catch (error) {
    console.error('[Conflict] Failed to fetch server data', error);
    // On error, keep optimistic data
    return optimisticData;
  }
}

/**
 * Wrap mutation with conflict detection
 */
export async function withConflictDetection<T extends VersionedData>(
  currentData: T,
  mutation: () => Promise<T>,
  _strategy: ConflictResolution['strategy'] = 'remote',
): Promise<T> {
  try {
    const result = await mutation();
    return result;
  } catch (error) {
    // Check if error is a version conflict
    const errorMessage = error instanceof Error ? error.message : '';
    if (
      errorMessage.includes('modified by another user') ||
      errorMessage.includes('version mismatch')
    ) {
      toast({
        title: 'Conflict Detected',
        description: 'This item was modified by another user. Please refresh and try again.',
        variant: 'destructive',
        duration: 5000,
      });

      throw error;
    }

    throw error;
  }
}
