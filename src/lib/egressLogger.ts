/**
 * Supabase Egress Logger — DEV ONLY
 *
 * Lightweight instrumentation to measure query frequency and payload sizes.
 * Automatically disabled in production (import.meta.env.DEV guard).
 *
 * Usage:
 *   import { logEgress, logChannel, getEgressReport } from '@/lib/egressLogger';
 *   const { data, error } = await supabase.from('trips').select('*').eq('id', id);
 *   logEgress('trips', 'select', data);
 */

const isDev = import.meta.env.DEV;

interface QueryStat {
  count: number;
  totalBytes: number;
  lastSeen: number;
}

const queryCounts: Map<string, QueryStat> = new Map();
const channelCounts: Map<string, number> = new Map();

/**
 * Log a completed Supabase query.
 * @param table - Table name (e.g. 'trip_media_index')
 * @param action - 'select' | 'insert' | 'update' | 'delete' | 'rpc'
 * @param data - Raw response data (used to estimate payload size)
 * @param meta - Optional extra context (filter values, limit used, etc.)
 */
export function logEgress(
  table: string,
  action: string,
  data: unknown[] | unknown | null,
  meta?: Record<string, unknown>,
): void {
  if (!isDev) return;

  const key = `${table}:${action}`;
  const approxBytes = data ? JSON.stringify(data).length : 0;
  const rows = Array.isArray(data) ? data.length : data ? 1 : 0;

  const existing = queryCounts.get(key) ?? { count: 0, totalBytes: 0, lastSeen: 0 };
  queryCounts.set(key, {
    count: existing.count + 1,
    totalBytes: existing.totalBytes + approxBytes,
    lastSeen: Date.now(),
  });

  console.debug(
    `[Egress] ${table}.${action} → ${rows} rows ~${(approxBytes / 1024).toFixed(1)}KB`,
    meta ?? '',
  );
}

/**
 * Log a realtime channel subscription event.
 * @param channelName - Channel name
 * @param event - 'subscribe' | 'unsubscribe'
 */
export function logChannel(channelName: string, event: 'subscribe' | 'unsubscribe'): void {
  if (!isDev) return;

  const current = channelCounts.get(channelName) ?? 0;
  const next = event === 'subscribe' ? current + 1 : Math.max(0, current - 1);
  channelCounts.set(channelName, next);

  const totalActive = Array.from(channelCounts.values()).reduce((s, v) => s + v, 0);
  console.debug(`[Egress/RT] channel "${channelName}" ${event} | active channels: ${totalActive}`);
}

/**
 * Print a summary report to the browser console.
 * Call from DevTools: import('/src/lib/egressLogger.ts').then(m => m.getEgressReport())
 */
export function getEgressReport(): void {
  if (!isDev) {
    console.warn('[Egress] Report only available in DEV mode');
    return;
  }

  console.group('[Egress Report] Query Statistics');
  const sorted = Array.from(queryCounts.entries()).sort(
    ([, a], [, b]) => b.totalBytes - a.totalBytes,
  );
  console.table(
    sorted.map(([key, stat]) => ({
      query: key,
      calls: stat.count,
      totalKB: (stat.totalBytes / 1024).toFixed(1),
      avgKB: (stat.totalBytes / stat.count / 1024).toFixed(1),
    })),
  );
  console.groupEnd();

  console.group('[Egress Report] Active Realtime Channels');
  console.table(
    Array.from(channelCounts.entries()).map(([name, count]) => ({ name, active: count })),
  );
  console.groupEnd();
}

// Expose to window in dev for easy console access
if (isDev && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__egressReport = getEgressReport;
  console.info('[Egress Logger] Active. Run __egressReport() in console for stats.');
}
