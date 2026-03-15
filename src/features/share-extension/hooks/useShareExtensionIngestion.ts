/**
 * Hook to process pending shared items from the iOS Share Extension.
 *
 * Runs on app foreground and deep link navigation.
 * Reads queued items from the Capacitor bridge (App Group shared storage)
 * and materializes them via shareIngestionService.
 */

import { useEffect, useCallback, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { processSharedItem } from '../shareIngestionService';
import { syncTripCacheToNative, syncAuthToNative } from '../nativeBridge';
import type { SharedInboundItem } from '../types';

interface UseShareExtensionIngestionOptions {
  userId: string | null;
  isAuthenticated: boolean;
  trips: Array<{
    id: string;
    title: string;
    cover_image_url?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    member_count?: number;
  }>;
}

export function useShareExtensionIngestion({
  userId,
  isAuthenticated,
  trips,
}: UseShareExtensionIngestionOptions): void {
  const processingRef = useRef(false);

  // Sync auth state to native whenever it changes
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    syncAuthToNative(isAuthenticated);
  }, [isAuthenticated]);

  // Sync trip cache to native whenever trips change
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || trips.length === 0) return;
    syncTripCacheToNative(trips);
  }, [trips]);

  const processPendingShares = useCallback(async () => {
    if (!userId || !isAuthenticated || processingRef.current) return;
    if (!Capacitor.isNativePlatform()) return;

    processingRef.current = true;

    try {
      const pendingItems = await readPendingSharesFromNative();

      for (const item of pendingItems) {
        const result = await processSharedItem(item, userId);
        if (result.success) {
          await clearProcessedShareFromNative(item.id);
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [userId, isAuthenticated]);

  // Process on mount and app resume
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    processPendingShares();

    const listener = CapApp.addListener('appStateChange', state => {
      if (state.isActive) {
        processPendingShares();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [processPendingShares]);

  // Process on deep link with shared_item param
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener('appUrlOpen', event => {
      const url = new URL(event.url);
      if (url.searchParams.has('shared_item')) {
        processPendingShares();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [processPendingShares]);
}

// ── Native Bridge Helpers ────────────────────────────────────────────────────

/**
 * Read pending shared items from the native App Group shared storage.
 * This calls the Capacitor plugin that reads JSON files from the shared container.
 */
async function readPendingSharesFromNative(): Promise<SharedInboundItem[]> {
  try {
    const capacitorCore = await import('@capacitor/core');
    // intentional: Capacitor plugin not in published typings
    const result = await (
      (capacitorCore as any).Plugins as Record<
        string,
        { getPendingShares?: () => Promise<{ items: string }> }
      >
    ).ChravelShareBridge?.getPendingShares?.();
    if (result?.items) {
      return JSON.parse(result.items) as SharedInboundItem[];
    }
  } catch {
    // Plugin not available or no pending items
  }
  return [];
}

/**
 * Clear a processed share from native storage.
 */
async function clearProcessedShareFromNative(itemId: string): Promise<void> {
  try {
    const capacitorCore = await import('@capacitor/core');
    // intentional: Capacitor plugin not in published typings
    await (
      (capacitorCore as any).Plugins as Record<
        string,
        { clearProcessedShare?: (opts: { id: string }) => Promise<void> }
      >
    ).ChravelShareBridge?.clearProcessedShare?.({ id: itemId });
  } catch {
    // Plugin not available
  }
}
