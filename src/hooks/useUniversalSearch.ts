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

export const useUniversalSearch = (query: string, options: UseUniversalSearchOptions = {}) => {
  const {
    contentTypes = ['trips', 'messages', 'calendar', 'tasks', 'polls', 'media'],
    searchMode = 'keyword',
    tripIds,
  } = options;

  const [results, setResults] = useState<UniversalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const search = async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        return;
      }

      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }

      const abortController = new AbortController();
      activeRequestRef.current = abortController;
      setIsLoading(true);

      try {
        const searchResults = await performUniversalSearch({
          query: query.trim(),
          contentTypes,
          filters: { tripIds },
          searchMode,
          isDemoMode,
        });

        if (!abortController.signal.aborted) {
          setResults(searchResults);
        }
      } catch (error) {
        // Check if this is an AbortError (user cancelled the search)
        const isAbortError = error instanceof Error && error.name === 'AbortError';
        if (!isAbortError) {
          console.error('Search error:', error);
          toast({
            variant: 'destructive',
            title: 'Search failed',
            description: 'Unable to search. Please try again.',
          });
          setResults([]);
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
  }, [query, JSON.stringify(contentTypes), searchMode, JSON.stringify(tripIds), isDemoMode, toast]);

  return { results, isLoading };
};
