/**
 * Message Search Component
 * Provides search functionality for chat messages with highlighting and keyboard shortcuts
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { searchMessages } from '@/services/messageSearchService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MessageSearchProps {
  tripId: string;
  onMessageSelect?: (messageId: string) => void;
  localMessages?: Array<{ id: string; text: string; sender: { name: string }; createdAt: string }>;
  isDemoMode?: boolean;
}

export const MessageSearch: React.FC<MessageSearchProps> = ({ 
  tripId, 
  onMessageSelect,
  localMessages = [],
  isDemoMode = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Highlight search term in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    // Escape special regex characters in searchTerm
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escapedTerm})`, 'gi'));
    
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() 
        ? <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{part}</mark>
        : part
    );
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let searchResults;
      
      if (isDemoMode && localMessages.length > 0) {
        // Local search for demo mode
        searchResults = localMessages
          .filter(msg => 
            msg.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.sender.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(msg => ({
            id: msg.id,
            content: msg.text,
            author_name: msg.sender.name,
            created_at: msg.createdAt,
            trip_id: tripId
          }))
          .slice(0, 50);
      } else {
        // Backend search for real data
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
  }, [tripId, isDemoMode, localMessages]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        handleSearch(query);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, handleSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setResults([]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results.length > 0) {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          onMessageSelect?.(selected.id);
          setIsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onMessageSelect]);

  // Scroll selected result into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selected?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="text-gray-400 hover:text-white"
        title="Search messages (Ctrl+F)"
      >
        <Search size={16} />
      </Button>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-gray-900/50 p-2 rounded-lg border border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search messages... (↑↓ to navigate, Enter to jump)"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-10 pr-10 bg-gray-800 border-gray-600"
            autoFocus
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {results.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>{selectedIndex + 1} / {results.length}</span>
            <button
              onClick={() => setSelectedIndex(prev => Math.max(prev - 1, 0))}
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"
              disabled={selectedIndex === 0}
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))}
              className="p-1 hover:bg-gray-700 rounded disabled:opacity-30"
              disabled={selectedIndex === results.length - 1}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setQuery('');
            setResults([]);
          }}
          className="hover:bg-gray-700"
        >
          <X size={16} />
        </Button>
      </div>

      {results.length > 0 && (
        <div 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-80 overflow-y-auto z-50"
        >
          {results.map((result, index) => (
            <button
              key={result.id}
              data-index={index}
              onClick={() => {
                onMessageSelect?.(result.id);
                setIsOpen(false);
                setQuery('');
              }}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-gray-700 last:border-b-0 transition-colors",
                index === selectedIndex 
                  ? "bg-blue-600/20 border-l-4 border-l-blue-500" 
                  : "hover:bg-gray-700"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-white">{result.author_name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(result.created_at).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="text-sm text-gray-300 line-clamp-2">
                {highlightText(result.content, query)}
              </div>
            </button>
          ))}
        </div>
      )}

      {query && !isSearching && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center text-gray-400">
          No messages found for "{query}"
        </div>
      )}

      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
            Searching...
          </div>
        </div>
      )}
    </div>
  );
};
