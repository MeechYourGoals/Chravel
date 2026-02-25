import { useCallback, useRef } from 'react';

type DashboardType = 'my_trips' | 'pro' | 'events';

function getStorageKey(userId: string, dashboardType: DashboardType): string {
  return `chravel:cardOrder:${userId}:${dashboardType}`;
}

function loadOrder(userId: string, dashboardType: DashboardType): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId, dashboardType));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistOrder(userId: string, dashboardType: DashboardType, ids: string[]): void {
  try {
    localStorage.setItem(getStorageKey(userId, dashboardType), JSON.stringify(ids));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

export function useDashboardCardOrder(userId: string | undefined, dashboardType: DashboardType) {
  const lastSavedRef = useRef<string>('');

  /**
   * Sorts items by saved order.
   * New IDs (not in saved order) are prepended to the front.
   * Stale IDs (in saved order but not in current items) are filtered out.
   */
  const applyOrder = useCallback(
    <T>(items: T[], getId: (item: T) => string): T[] => {
      if (!userId || items.length <= 1) return items;

      const savedIds = loadOrder(userId, dashboardType);
      if (savedIds.length === 0) return items;

      const currentIdSet = new Set(items.map(getId));
      // Filter saved order to only IDs that still exist
      const validSavedIds = savedIds.filter(id => currentIdSet.has(id));
      const savedIdSet = new Set(validSavedIds);

      // New items not in saved order — prepend them
      const newItems = items.filter(item => !savedIdSet.has(getId(item)));
      // Saved-order items
      const itemMap = new Map(items.map(item => [getId(item), item]));
      const orderedItems = validSavedIds.map(id => itemMap.get(id)).filter(Boolean) as T[];

      return [...newItems, ...orderedItems];
    },
    [userId, dashboardType],
  );

  const saveOrder = useCallback(
    (orderedIds: string[]) => {
      if (!userId) return;
      const key = JSON.stringify(orderedIds);
      if (key === lastSavedRef.current) return; // skip duplicate saves
      lastSavedRef.current = key;
      persistOrder(userId, dashboardType, orderedIds);
    },
    [userId, dashboardType],
  );

  return { applyOrder, saveOrder };
}
