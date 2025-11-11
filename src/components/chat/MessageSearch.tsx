/**
 * Message Search Component
 * Provides search functionality for chat messages
 */
import React, { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { searchMessages } from '@/services/messageSearchService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MessageSearchProps {
  tripId: string;
  onMessageSelect?: (messageId: string) => void;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ tripId, onMessageSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await searchMessages(tripId, searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [tripId]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-gray-400 hover:text-white"
      >
        <Search size={16} />
      </Button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            type="text"
            placeholder="Search messages..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-10 pr-10"
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setQuery('');
            setResults([]);
          }}
        >
          <X size={16} />
        </Button>
      </div>

      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => {
                onMessageSelect?.(result.id);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 border-b border-gray-700 last:border-b-0"
            >
              <div className="text-sm font-medium text-white">{result.author_name}</div>
              <div className="text-xs text-gray-400 truncate">{result.content}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(result.created_at).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center text-gray-400">
          Searching...
        </div>
      )}
    </div>
  );
};
