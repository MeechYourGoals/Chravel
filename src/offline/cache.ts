import { getOfflineDb, type OfflineCachedEntity, type TripOverviewSnapshot } from './db';

const DEFAULT_CACHE_EXPIRY_DAYS = 30;
const DEFAULT_CACHE_EXPIRY_MS = DEFAULT_CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export type OfflineEntityType =
  | 'calendar_event'
  | 'chat_message'
  | 'trip_tasks'
  | 'trip_polls'
  | 'trip_links'
  | 'trip_media'
  | 'trip_files'
  | 'trip_basecamp';

export async function cacheEntity(params: {
  entityType: OfflineEntityType;
  entityId: string;
  tripId: string;
  data: unknown;
  version?: number;
}): Promise<void> {
  const db = await getOfflineDb();
  const cacheKey = `${params.entityType}:${params.entityId}`;

  const cached: OfflineCachedEntity = {
    id: cacheKey,
    tripId: params.tripId,
    entityType: params.entityType,
    data: params.data,
    cachedAt: Date.now(),
    version: params.version,
  };

  await db.put('cache', cached);
}

export async function getCachedEntities(params: {
  tripId: string;
  entityType?: OfflineEntityType;
  maxAgeMs?: number;
}): Promise<OfflineCachedEntity[]> {
  const db = await getOfflineDb();
  const maxAgeMs = params.maxAgeMs ?? DEFAULT_CACHE_EXPIRY_MS;

  let cached: OfflineCachedEntity[];
  if (params.entityType) {
    const all = await db.getAllFromIndex('cache', 'by-entity-type', params.entityType);
    cached = all.filter(c => c.tripId === params.tripId);
  } else {
    cached = await db.getAllFromIndex('cache', 'by-trip', params.tripId);
  }

  const now = Date.now();
  return cached.filter(c => now - c.cachedAt < maxAgeMs);
}

export async function getCachedEntity(params: {
  entityType: OfflineEntityType;
  entityId: string;
  maxAgeMs?: number;
}): Promise<OfflineCachedEntity | null> {
  const db = await getOfflineDb();
  const maxAgeMs = params.maxAgeMs ?? DEFAULT_CACHE_EXPIRY_MS;
  const cacheKey = `${params.entityType}:${params.entityId}`;
  const cached = await db.get('cache', cacheKey);
  if (!cached) return null;

  const now = Date.now();
  if (now - cached.cachedAt >= maxAgeMs) {
    await db.delete('cache', cacheKey);
    return null;
  }
  return cached;
}

export async function clearExpiredCache(maxAgeMs: number = DEFAULT_CACHE_EXPIRY_MS): Promise<number> {
  const db = await getOfflineDb();
  const all = await db.getAll('cache');
  const now = Date.now();
  let cleared = 0;
  for (const cached of all) {
    if (now - cached.cachedAt >= maxAgeMs) {
      await db.delete('cache', cached.id);
      cleared++;
    }
  }
  return cleared;
}

export async function upsertTripOverviewSnapshot(snapshot: TripOverviewSnapshot): Promise<void> {
  const db = await getOfflineDb();
  await db.put('tripOverview', snapshot);
}

export async function getTripOverviewSnapshot(tripId: string): Promise<TripOverviewSnapshot | null> {
  const db = await getOfflineDb();
  return (await db.get('tripOverview', tripId)) ?? null;
}

