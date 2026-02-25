import React, { useState } from 'react';
import { Search, Sparkles, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { useAuth } from '../hooks/useAuth';

interface SearchResult {
  id: string;
  objectType: string;
  objectId: string;
  tripId?: string;
  content: string;
  snippet: string;
  score: number;
  similarity: number;
  matchReason: string;
  deepLink?: string;
}

interface SemanticSearchProps {
  tripId?: string;
  onResultClick?: (result: SearchResult) => void;
  placeholder?: string;
}

export const SemanticSearch: React.FC<SemanticSearchProps> = ({
  tripId,
  onResultClick,
  placeholder = 'Search with AI understanding...',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchType, setSearchType] = useState<'semantic' | 'keyword' | 'hybrid'>('hybrid');
  const { user } = useAuth();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          tripId,
          limit: 20,
          threshold: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      if (data.success) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Semantic search error:', error);
      // Fallback to traditional search if semantic search fails
      // This would call your existing search function
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'trip':
        return '✈️';
      case 'place':
        return '📍';
      case 'event':
        return '📅';
      case 'message':
        return '💬';
      case 'file':
        return '📄';
      default:
        return '🔍';
    }
  };

  const getMatchReasonBadge = (reason: string) => {
    switch (reason) {
      case 'semantic_similarity':
        return (
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            AI Match
          </Badge>
        );
      case 'keyword_match':
        return (
          <Badge variant="outline" className="text-xs">
            Keyword
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs">
            Match
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="pl-10 pr-20 bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
        <Button
          onClick={handleSearch}
          disabled={isLoading || !query.trim()}
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
        >
          {isLoading ? <Clock className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </div>

      {/* Search Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={searchType === 'semantic' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchType('semantic')}
          className="text-xs"
        >
          <Sparkles className="w-3 h-3 mr-1" />
          AI Only
        </Button>
        <Button
          variant={searchType === 'hybrid' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchType('hybrid')}
          className="text-xs"
        >
          Hybrid
        </Button>
        <Button
          variant={searchType === 'keyword' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSearchType('keyword')}
          className="text-xs"
        >
          Keywords
        </Button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map(result => (
            <Card
              key={result.id}
              className="cursor-pointer hover:bg-white/5 transition-colors bg-white/5 border-white/10"
              onClick={() => onResultClick?.(result)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getResultIcon(result.objectType)}</span>
                      <span className="text-sm font-medium text-white capitalize">
                        {result.objectType}
                      </span>
                      {getMatchReasonBadge(result.matchReason)}
                      {result.similarity > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(result.similarity * 100)}% match
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-white/80 line-clamp-2">{result.snippet}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {query && !isLoading && results.length === 0 && (
        <div className="text-center py-8 text-white/60">
          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No results found for "{query}"</p>
          <p className="text-sm">Try different keywords or check your spelling</p>
        </div>
      )}
    </div>
  );
};
