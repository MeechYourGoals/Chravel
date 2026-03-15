import { useState, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDemoMode } from '@/hooks/useDemoMode';
import {
  performUniversalSearch,
  ContentType,
  SearchMode,
  UniversalSearchResult,
} from '@/services/universalSearchService';

interface UseUniversalSearchOptions {
  contentTypes?: ContentType[];
  searchMode?: SearchMode;
  tripIds?: string[];
}

/** Max cached queries to prevent unbounded memory growth */
const MAX_CACHE_SIZE = 20;

export const useUniversalSearch = (query: string, options: UseUniversalSearchOptions = {}) => {
  const {
    contentTypes = ['trips', 'messages', 'calendar', 'task', 'poll', 'media'],
    searchMode = 'keyword',
    tripIds,
  } = options;

  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const activeRequestRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, UniversalSearchResult[]>>(new Map());

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < 2) {
      setResults([]);
      return;
    }

    const cacheKey = trimmedQuery.toLowerCase();

    // Return cached results immediately to eliminate perceived latency
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResults(cached);
      // Still refresh in background but don't show loading state
    }

    const search = async () => {
      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }

      const abortController = new AbortController();
      activeRequestRef.current = abortController;

      // Only show loading spinner if we have no cached results
      if (!cached) {
        setIsLoading(true);
      }

      try {
        const searchResults = await performUniversalSearch({
          query: trimmedQuery,
          contentTypes,
          filters: { tripIds },
          searchMode,
          isDemoMode,
        });

        if (!abortController.signal.aborted) {
          setResults(searchResults);

          // Evict oldest entry if cache is full
          if (cacheRef.current.size >= MAX_CACHE_SIZE) {
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey !== undefined) {
              cacheRef.current.delete(firstKey);
            }
          }
          cacheRef.current.set(cacheKey, searchResults);
        }
      } catch (error) {
        const isAbortError = error instanceof Error && error.name === 'AbortError';
        if (!isAbortError) {
          toast({
            variant: 'destructive',
            title: 'Search failed',
            description: 'Unable to search. Please try again.',
          });
          if (!cached) {
            setResults([]);
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(search, 300);
    return () => {
      clearTimeout(timeoutId);
      activeRequestRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- JSON.stringify deps are correct but not statically analyzable
  }, [query, JSON.stringify(contentTypes), searchMode, JSON.stringify(tripIds), isDemoMode, toast]);

  return { results, isLoading };
};
