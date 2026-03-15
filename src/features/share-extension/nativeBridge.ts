/**
 * Native bridge utilities for syncing app state to the Share Extension
 * via App Group shared storage (UserDefaults).
 */

import { Capacitor } from '@capacitor/core';

interface TripInfoForCache {
  id: string;
  title: string;
  cover_image_url?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  member_count?: number;
}

/**
 * Sync the trip list to native shared storage so the Share Extension can display it.
 */
export async function syncTripCacheToNative(trips: TripInfoForCache[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const capacitorCore = await import('@capacitor/core');
    // intentional: Capacitor plugin not in published typings
    const bridge = (capacitorCore as any).Plugins as Record<
      string,
      {
        syncTripCache?: (opts: { trips: string }) => Promise<void>;
      }
    >;

    const tripInfos = trips.map(t => ({
      id: t.id,
      title: t.title,
      coverImageURL: t.cover_image_url ?? null,
      location: t.location ?? null,
      startDate: t.start_date ?? null,
      endDate: t.end_date ?? null,
      memberCount: t.member_count ?? 1,
    }));

    await bridge.ChravelShareBridge?.syncTripCache?.({
      trips: JSON.stringify(tripInfos),
    });
  } catch {
    // Plugin not available on web
  }
}

/**
 * Sync auth state to native shared storage for Share Extension access.
 */
export async function syncAuthToNative(isAuthenticated: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const capacitorCore = await import('@capacitor/core');
    // intentional: Capacitor plugin not in published typings
    const bridge = (capacitorCore as any).Plugins as Record<
      string,
      {
        syncAuthState?: (opts: { isAuthenticated: boolean }) => Promise<void>;
      }
    >;

    await bridge.ChravelShareBridge?.syncAuthState?.({
      isAuthenticated,
    });
  } catch {
    // Plugin not available on web
  }
}
