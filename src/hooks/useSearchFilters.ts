import { useState, useCallback, useMemo } from 'react';

export type SortOption = 'relevance' | 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

export interface SearchFilter {
  key: string;
  value: string | string[] | boolean | number;
  label?: string;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  fuzzyMatch?: boolean;
  maxResults?: number;
}

export const useSearchFilters = (initialQuery = '', initialFilters: SearchFilter[] = []) => {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilter[]>(initialFilters);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [options, setOptions] = useState<SearchOptions>({
    caseSensitive: false,
    fuzzyMatch: true,
    maxResults: 50,
  });

  const addFilter = useCallback((filter: SearchFilter) => {
    setFilters(prev => {
      // Remove existing filter with same key
      const filtered = prev.filter(f => f.key !== filter.key);
      return [...filtered, filter];
    });
  }, []);

  const removeFilter = useCallback((filterKey: string) => {
    setFilters(prev => prev.filter(f => f.key !== filterKey));
  }, []);

  const updateFilter = useCallback((filterKey: string, newValue: SearchFilter['value']) => {
    setFilters(prev => prev.map(f => (f.key === filterKey ? { ...f, value: newValue } : f)));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const clearAll = useCallback(() => {
    setQuery('');
    setFilters([]);
    setSortBy('relevance');
  }, []);

  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);

    // Add to history if query is substantial
    if (newQuery.trim().length > 2) {
      setSearchHistory(prev => {
        const filtered = prev.filter(q => q !== newQuery);
        return [newQuery, ...filtered].slice(0, 10); // Keep last 10 searches
      });
    }
  }, []);

  const clearHistory = useCallback(() => {
    setSearchHistory([]);
  }, []);

  const applyFilters = useCallback(
    <T extends Record<string, any>>(items: T[]): T[] => {
      let filtered = items;

      // Apply query search
      if (query.trim()) {
        const searchQuery = options.caseSensitive ? query : query.toLowerCase();

        filtered = filtered.filter(item => {
          const searchableFields = Object.values(item).join(' ');
          const searchText = options.caseSensitive
            ? searchableFields
            : searchableFields.toLowerCase();

          if (options.fuzzyMatch) {
            // Simple fuzzy match: check if all query words are present
            const queryWords = searchQuery.split(/\s+/);
            return queryWords.every(word => searchText.includes(word));
          } else {
            return searchText.includes(searchQuery);
          }
        });
      }

      // Apply custom filters
      filters.forEach(filter => {
        filtered = filtered.filter(item => {
          const itemValue = item[filter.key];

          if (Array.isArray(filter.value)) {
            // Array filter: item value must be in filter values
            return filter.value.includes(itemValue);
          } else if (typeof filter.value === 'boolean') {
            // Boolean filter
            return itemValue === filter.value;
          } else if (typeof filter.value === 'number') {
            // Numeric filter
            return itemValue === filter.value;
          } else {
            // String filter
            return itemValue
              ?.toString()
              .toLowerCase()
              .includes(filter.value.toString().toLowerCase());
          }
        });
      });

      return filtered;
    },
    [query, filters, options],
  );

  const sortResults = useCallback(
    <T extends Record<string, any>>(items: T[]): T[] => {
      const sorted = [...items];

      switch (sortBy) {
        case 'date-desc':
          return sorted.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || a.date || 0);
            const dateB = new Date(b.createdAt || b.created_at || b.date || 0);
            return dateB.getTime() - dateA.getTime();
          });

        case 'date-asc':
          return sorted.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || a.date || 0);
            const dateB = new Date(b.createdAt || b.created_at || b.date || 0);
            return dateA.getTime() - dateB.getTime();
          });

        case 'name-asc':
          return sorted.sort((a, b) => {
            const nameA = (a.name || a.title || '').toLowerCase();
            const nameB = (b.name || b.title || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });

        case 'name-desc':
          return sorted.sort((a, b) => {
            const nameA = (a.name || a.title || '').toLowerCase();
            const nameB = (b.name || b.title || '').toLowerCase();
            return nameB.localeCompare(nameA);
          });

        case 'relevance':
        default:
          return sorted;
      }
    },
    [sortBy],
  );

  const getFilteredAndSorted = useCallback(
    <T extends Record<string, any>>(items: T[]): T[] => {
      const filtered = applyFilters(items);
      const sorted = sortResults(filtered);

      if (options.maxResults) {
        return sorted.slice(0, options.maxResults);
      }

      return sorted;
    },
    [applyFilters, sortResults, options.maxResults],
  );

  const activeFilterCount = useMemo(() => {
    return filters.length + (query.trim() ? 1 : 0);
  }, [filters.length, query]);

  const hasActiveFilters = useMemo(() => {
    return activeFilterCount > 0;
  }, [activeFilterCount]);

  return {
    // State
    query,
    filters,
    sortBy,
    searchHistory,
    options,

    // Computed
    activeFilterCount,
    hasActiveFilters,

    // Actions
    setQuery: updateQuery,
    setSortBy,
    setOptions,
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    clearAll,
    clearHistory,
    applyFilters,
    sortResults,
    getFilteredAndSorted,
  };
};
