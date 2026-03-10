import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type DashboardType = 'my_trips' | 'pro' | 'events';

// ---------------------------------------------------------------------------
// localStorage helpers (synchronous cache for instant UI)
// ---------------------------------------------------------------------------

function getStorageKey(userId: string, dashboardType: DashboardType): string {
  return `chravel:cardOrder:${userId}:${dashboardType}`;
}

function loadLocalOrder(userId: string, dashboardType: DashboardType): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId, dashboardType));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistLocalOrder(userId: string, dashboardType: DashboardType, ids: string[]): void {
  try {
    localStorage.setItem(getStorageKey(userId, dashboardType), JSON.stringify(ids));
  } catch {
    // localStorage full or unavailable
  }
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function fetchRemoteOrder(
  userId: string,
  dashboardType: DashboardType,
): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('dashboard_card_order' as any)
    .select('ordered_ids')
    .eq('user_id', userId)
    .eq('dashboard_type', dashboardType)
    .maybeSingle();

  if (error || !data) return null;
  const ids = (data as any).ordered_ids;
  return Array.isArray(ids) ? ids : null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDashboardCardOrder(userId: string | undefined, dashboardType: DashboardType) {
  const lastSavedRef = useRef<string>('');
  const upsertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // State instead of ref so remote fetch triggers re-render
  const [remoteOrder, setRemoteOrder] = useState<string[] | null>(null);

  // Background fetch from Supabase on mount
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetchRemoteOrder(userId, dashboardType).then(remote => {
      if (cancelled || !remote) return;
      setRemoteOrder(remote);
      persistLocalOrder(userId, dashboardType, remote);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, dashboardType]);

  const applyOrder = useCallback(
    <T>(items: T[], getId: (item: T) => string): T[] => {
      if (!userId || items.length <= 1) return items;

      // Prefer remote order if already fetched, else fall back to localStorage
      const savedIds = remoteOrder ?? loadLocalOrder(userId, dashboardType);
      if (savedIds.length === 0) return items;

      const currentIdSet = new Set(items.map(getId));
      const validSavedIds = savedIds.filter(id => currentIdSet.has(id));
      const savedIdSet = new Set(validSavedIds);

      const newItems = items.filter(item => !savedIdSet.has(getId(item)));
      const itemMap = new Map(items.map(item => [getId(item), item]));
      const orderedItems = validSavedIds.map(id => itemMap.get(id)).filter(Boolean) as T[];

      return [...newItems, ...orderedItems];
    },
    [userId, dashboardType, remoteOrder],
  );

  const saveOrder = useCallback(
    (orderedIds: string[]) => {
      if (!userId) return;
      const key = JSON.stringify(orderedIds);
      if (key === lastSavedRef.current) return;
      lastSavedRef.current = key;

      // Write to both localStorage (instant) and Supabase (cross-device)
      persistLocalOrder(userId, dashboardType, orderedIds);
      setRemoteOrder(orderedIds);

      // Instance-scoped debounce
      if (upsertTimerRef.current) clearTimeout(upsertTimerRef.current);
      upsertTimerRef.current = setTimeout(async () => {
        try {
          const { error } = await supabase.from('dashboard_card_order' as any).upsert(
            {
              user_id: userId,
              dashboard_type: dashboardType,
              ordered_ids: orderedIds,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: 'user_id,dashboard_type' },
          );
          if (error) {
            console.error('[CardOrder] Upsert failed:', error.message);
          }
        } catch (err) {
          console.error('[CardOrder] Network error during upsert:', err);
        }
      }, 500);
    },
    [userId, dashboardType],
  );

  return { applyOrder, saveOrder };
}
