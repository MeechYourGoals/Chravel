/**
 * Custom hook for managing message search state and operations
 */
import { useState, useCallback } from 'react';
import {
  searchMessages,
  searchMessagesByAuthor,
  searchMessagesByDateRange,
} from '@/services/messageSearchService';

interface UseMessageSearchOptions {
  tripId: string;
  localMessages?: Array<{
    id: string;
    text: string;
    sender: { name: string };
    createdAt: string;
  }>;
  isDemoMode?: boolean;
}

export const useMessageSearch = ({
  tripId,
  localMessages = [],
  isDemoMode = false,
}: UseMessageSearchOptions) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchLocal = useCallback(
    (searchQuery: string) => {
      return localMessages
        .filter(
          msg =>
            msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.sender.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
        .map(msg => ({
          id: msg.id,
          content: msg.text,
          author_name: msg.sender.name,
          created_at: msg.createdAt,
          trip_id: tripId,
        }))
        .slice(0, 50);
    },
    [localMessages, tripId],
  );

  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        let searchResults;

        if (isDemoMode) {
          searchResults = searchLocal(searchQuery);
        } else {
          searchResults = await searchMessages(tripId, searchQuery);
        }

        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [tripId, isDemoMode, searchLocal],
  );

  const searchByAuthor = useCallback(
    async (authorName: string) => {
      setIsSearching(true);
      try {
        let searchResults;

        if (isDemoMode) {
          searchResults = localMessages
            .filter(msg => msg.sender.name.toLowerCase().includes(authorName.toLowerCase()))
            .map(msg => ({
              id: msg.id,
              content: msg.text,
              author_name: msg.sender.name,
              created_at: msg.createdAt,
              trip_id: tripId,
            }));
        } else {
          searchResults = await searchMessagesByAuthor(tripId, authorName);
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Author search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [tripId, isDemoMode, localMessages],
  );

  const searchByDateRange = useCallback(
    async (startDate: string, endDate: string) => {
      setIsSearching(true);
      try {
        let searchResults;

        if (isDemoMode) {
          searchResults = localMessages
            .filter(msg => {
              const msgDate = new Date(msg.createdAt);
              return msgDate >= new Date(startDate) && msgDate <= new Date(endDate);
            })
            .map(msg => ({
              id: msg.id,
              content: msg.text,
              author_name: msg.sender.name,
              created_at: msg.createdAt,
              trip_id: tripId,
            }));
        } else {
          searchResults = await searchMessagesByDateRange(tripId, startDate, endDate);
        }

        setResults(searchResults);
      } catch (error) {
        console.error('Date range search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [tripId, isDemoMode, localMessages],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSelectedIndex(0);
  }, []);

  const selectNext = useCallback(() => {
    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
  }, [results.length]);

  const selectPrevious = useCallback(() => {
    setSelectedIndex(prev => Math.max(prev - 1, 0));
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    selectedIndex,
    performSearch,
    searchByAuthor,
    searchByDateRange,
    clearSearch,
    selectNext,
    selectPrevious,
  };
};
