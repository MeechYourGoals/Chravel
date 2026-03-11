import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';
import type { ArtifactSearchResult, ArtifactSearchQuery } from '@/types/artifacts';

interface SearchState {
  isSearching: boolean;
  error: string | null;
  results: ArtifactSearchResult[];
}

export function useArtifactSearch() {
  const [state, setState] = useState<SearchState>({
    isSearching: false,
    error: null,
    results: [],
  });
  const { isDemoMode } = useDemoMode();

  const searchArtifacts = useCallback(
    async (query: ArtifactSearchQuery): Promise<ArtifactSearchResult[]> => {
      if (!query.tripId || !query.query) {
        console.warn('[useArtifactSearch] tripId and query are required');
        return [];
      }

      if (isDemoMode) {
        setState({ isSearching: false, error: null, results: [] });
        return [];
      }

      setState(prev => ({ ...prev, isSearching: true, error: null }));

      try {
        const { data, error } = await supabase.functions.invoke('artifact-search', {
          body: {
            tripId: query.tripId,
            query: query.query,
            artifactTypes: query.artifactTypes,
            sourceTypes: query.sourceTypes,
            createdAfter: query.createdAfter,
            createdBefore: query.createdBefore,
            creatorId: query.creatorId,
            limit: query.limit || 10,
            threshold: query.threshold || 0.5,
          },
        });

        if (error) {
          throw error;
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Artifact search failed');
        }

        const results: ArtifactSearchResult[] = data.results || [];
        setState({ isSearching: false, error: null, results });
        return results;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[useArtifactSearch] Failed:', errorMessage);
        setState({ isSearching: false, error: errorMessage, results: [] });
        return [];
      }
    },
    [isDemoMode],
  );

  const clearResults = useCallback(() => {
    setState({ isSearching: false, error: null, results: [] });
  }, []);

  return {
    ...state,
    searchArtifacts,
    clearResults,
  };
}
