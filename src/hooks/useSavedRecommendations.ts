import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Recommendation } from '@/data/recommendations';
import {
  savedRecommendationsService,
  SavedRecommendationRow,
} from '@/services/savedRecommendationsService';

export const useSavedRecommendations = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<SavedRecommendationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = user?.id;

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const list = await savedRecommendationsService.list(userId);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleSave = useCallback(
    async (rec: Recommendation) => {
      if (!userId) return { status: 'unauthenticated' as const };
      const result = await savedRecommendationsService.toggle(userId, rec);
      await refresh();
      return { status: result };
    },
    [userId, refresh],
  );

  const addToTrip = useCallback(
    async (saved: SavedRecommendationRow, tripId: string | number) => {
      if (!userId) return { status: 'unauthenticated' as const };
      await savedRecommendationsService.addToTrip(userId, saved, tripId);
      return { status: 'ok' as const };
    },
    [userId],
  );

  const isSaved = useCallback((recId: number) => items.some(i => i.rec_id === recId), [items]);

  return { items, loading, toggleSave, isSaved, addToTrip, refresh };
};
