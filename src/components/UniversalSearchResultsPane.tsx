import React from 'react';
import { Sparkles, MapPin, Calendar, FileText, MessageSquare, Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

interface SemanticSearchResult {
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

interface UniversalSearchResult {
  id: string;
  objectType: 'message' | 'calendar_event' | 'file' | 'receipt' | 'place' | 'participant';
  objectId: string;
  tripId: string;
  tripName: string;
  content: string;
  snippet: string;
  score: number;
  deepLink: string;
  matchReason: string;
  metadata?: {
    fileName?: string;
    fileType?: string;
    amount?: number;
    date?: string;
    participants?: string[];
  };
}

interface UniversalSearchResultsPaneProps {
  results: (SemanticSearchResult | UniversalSearchResult)[];
  onResultClick?: (result: SemanticSearchResult | UniversalSearchResult) => void;
}

export const UniversalSearchResultsPane: React.FC<UniversalSearchResultsPaneProps> = ({
  results,
  onResultClick,
}) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'trip':
      case 'calendar_event':
        return <Calendar className="w-4 h-4" />;
      case 'place':
        return <MapPin className="w-4 h-4" />;
      case 'file':
      case 'receipt':
        return <FileText className="w-4 h-4" />;
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'participant':
        return <Users className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
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

  const handleResultClick = (result: SemanticSearchResult | UniversalSearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else if (result.deepLink) {
      // Scroll to element or navigate
      const element = document.querySelector(result.deepLink);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-white/60" />
        <span className="text-sm font-medium text-white/80">Search Results ({results.length})</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map(result => (
          <Card
            key={result.id}
            className="cursor-pointer hover:bg-white/10 transition-colors bg-white/5 border-white/10"
            onClick={() => handleResultClick(result)}
          >
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">{getIcon(result.objectType)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white capitalize">
                      {result.objectType.replace('_', ' ')}
                    </span>
                    {getMatchReasonBadge(result.matchReason)}

                    {'similarity' in result && (
                      <Badge variant="outline" className="text-xs">
                        {Math.round(result.similarity * 100)}% match
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-white/70 line-clamp-2 mb-2">{result.snippet}</p>

                  {'metadata' in result && result.metadata && (
                    <div className="flex gap-2 text-xs text-white/50">
                      {result.metadata.fileName && <span>📄 {result.metadata.fileName}</span>}
                      {result.metadata.amount && <span>💰 ${result.metadata.amount}</span>}
                      {result.metadata.date && <span>📅 {result.metadata.date}</span>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
