import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, Sparkles, TrendingUp, Clock, Target } from 'lucide-react';

interface SmartSuggestion {
  id: string;
  text: string;
  type: 'trending' | 'personalized' | 'semantic' | 'recent';
  confidence: number;
  reason: string;
  embedding?: number[];
}

interface SmartSearchSuggestionsProps {
  currentQuery: string;
  tripId?: string;
  onSuggestionClick?: (suggestion: string) => void;
  userHistory?: string[];
  maxSuggestions?: number;
}

export const SmartSearchSuggestions = ({
  currentQuery,
  tripId,
  onSuggestionClick,
  userHistory = [],
  maxSuggestions = 6,
}: SmartSearchSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentQuery.length >= 2) {
      generateSmartSuggestions();
    } else {
      setSuggestions(getDefaultSuggestions());
    }
  }, [currentQuery, tripId]);

  const generateSmartSuggestions = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would call the semantic search API
      const semanticSuggestions = await generateSemanticSuggestions(currentQuery);
      const contextualSuggestions = generateContextualSuggestions(currentQuery, tripId);
      const trendingSuggestions = getTrendingSuggestions();

      const allSuggestions = [
        ...semanticSuggestions,
        ...contextualSuggestions,
        ...trendingSuggestions,
      ];

      // Rank suggestions by relevance and confidence
      const rankedSuggestions = rankSuggestions(allSuggestions, currentQuery);
      setSuggestions(rankedSuggestions.slice(0, maxSuggestions));
    } catch (error) {
      console.error('Failed to generate smart suggestions:', error);
      setSuggestions(getFallbackSuggestions(currentQuery));
    } finally {
      setIsLoading(false);
    }
  };

  const generateSemanticSuggestions = async (query: string): Promise<SmartSuggestion[]> => {
    // Simulate semantic analysis
    const semanticExpansions = [
      {
        base: 'flight',
        expansions: [
          'airline tickets',
          'boarding passes',
          'flight confirmations',
          'travel documents',
        ],
      },
      {
        base: 'hotel',
        expansions: ['accommodations', 'lodging', 'reservations', 'check-in details'],
      },
      {
        base: 'restaurant',
        expansions: ['dining reservations', 'food recommendations', 'local cuisine', 'meal plans'],
      },
      { base: 'activity', expansions: ['attractions', 'tours', 'experiences', 'entertainment'] },
      { base: 'receipt', expansions: ['expenses', 'purchases', 'payments', 'transaction records'] },
    ];

    const queryLower = query.toLowerCase();
    const suggestions: SmartSuggestion[] = [];

    for (const expansion of semanticExpansions) {
      if (queryLower.includes(expansion.base)) {
        expansion.expansions.forEach((exp, index) => {
          suggestions.push({
            id: `semantic-${expansion.base}-${index}`,
            text: exp,
            type: 'semantic',
            confidence: 0.9 - index * 0.1,
            reason: `Semantically related to "${expansion.base}"`,
          });
        });
      }
    }

    return suggestions;
  };

  const generateContextualSuggestions = (query: string, tripId?: string): SmartSuggestion[] => {
    if (!tripId) return [];

    // Context-aware suggestions based on trip type and current query
    const contextualMaps = [
      {
        context: 'business',
        suggestions: [
          { text: 'meeting rooms and venues', reason: 'Business trip context' },
          { text: 'corporate expense receipts', reason: 'Business travel expenses' },
          { text: 'conference schedules', reason: 'Business events' },
          { text: 'transportation for meetings', reason: 'Business logistics' },
        ],
      },
      {
        context: 'vacation',
        suggestions: [
          { text: 'tourist attractions near me', reason: 'Vacation planning' },
          { text: 'local dining experiences', reason: 'Vacation dining' },
          { text: 'activity bookings and tickets', reason: 'Vacation entertainment' },
          { text: 'souvenir shopping locations', reason: 'Vacation memories' },
        ],
      },
      {
        context: 'family',
        suggestions: [
          { text: 'family-friendly activities', reason: 'Family trip focus' },
          { text: 'kid-safe accommodations', reason: 'Family safety' },
          { text: 'group transportation options', reason: 'Family logistics' },
          { text: 'emergency contact information', reason: 'Family safety' },
        ],
      },
    ];

    // Simple context detection (would be more sophisticated in real implementation)
    const detectedContext = query.toLowerCase().includes('business')
      ? 'business'
      : query.toLowerCase().includes('family')
        ? 'family'
        : 'vacation';

    const contextMap = contextualMaps.find(c => c.context === detectedContext) || contextualMaps[1];

    return contextMap.suggestions.map((suggestion, index) => ({
      id: `contextual-${detectedContext}-${index}`,
      text: suggestion.text,
      type: 'personalized' as const,
      confidence: 0.8 - index * 0.1,
      reason: suggestion.reason,
    }));
  };

  const getTrendingSuggestions = (): SmartSuggestion[] => {
    const trending = [
      { text: 'flight delay notifications', reason: 'Trending this week' },
      { text: 'local weather updates', reason: 'Popular search' },
      { text: 'currency exchange rates', reason: 'Frequently requested' },
      { text: 'passport and visa requirements', reason: 'Important documents' },
      { text: 'travel insurance details', reason: 'Safety priority' },
    ];

    return trending.map((item, index) => ({
      id: `trending-${index}`,
      text: item.text,
      type: 'trending' as const,
      confidence: 0.7 - index * 0.05,
      reason: item.reason,
    }));
  };

  const getDefaultSuggestions = (): SmartSuggestion[] => {
    return [
      {
        id: 'default-1',
        text: 'flight tickets and boarding passes',
        type: 'trending',
        confidence: 0.9,
        reason: 'Most searched travel document',
      },
      {
        id: 'default-2',
        text: 'restaurant reservations',
        type: 'trending',
        confidence: 0.85,
        reason: 'Popular dining queries',
      },
      {
        id: 'default-3',
        text: 'hotel confirmations',
        type: 'trending',
        confidence: 0.8,
        reason: 'Essential accommodation info',
      },
      {
        id: 'default-4',
        text: 'activity bookings and tickets',
        type: 'personalized',
        confidence: 0.75,
        reason: 'Entertainment planning',
      },
    ];
  };

  const getFallbackSuggestions = (query: string): SmartSuggestion[] => {
    const fallbacks = [
      `${query} recommendations`,
      `${query} near me`,
      `${query} bookings`,
      `${query} information`,
    ];

    return fallbacks.map((text, index) => ({
      id: `fallback-${index}`,
      text,
      type: 'semantic' as const,
      confidence: 0.6,
      reason: 'Query expansion',
    }));
  };

  const rankSuggestions = (suggestions: SmartSuggestion[], query: string): SmartSuggestion[] => {
    return suggestions
      .filter(suggestion => suggestion.text.toLowerCase() !== query.toLowerCase())
      .sort((a, b) => {
        // Prioritize by type: semantic > personalized > trending > recent
        const typeOrder = { semantic: 4, personalized: 3, trending: 2, recent: 1 };
        const typeScore = (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0);

        if (typeScore !== 0) return typeScore;

        // Then by confidence
        return b.confidence - a.confidence;
      });
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'semantic':
        return <Sparkles className="w-3 h-3 text-purple-400" />;
      case 'personalized':
        return <Target className="w-3 h-3 text-blue-400" />;
      case 'trending':
        return <TrendingUp className="w-3 h-3 text-green-400" />;
      case 'recent':
        return <Clock className="w-3 h-3 text-yellow-400" />;
      default:
        return <Lightbulb className="w-3 h-3 text-gray-400" />;
    }
  };

  const getSuggestionTypeLabel = (type: string): string => {
    const labels = {
      semantic: 'AI Enhanced',
      personalized: 'For You',
      trending: 'Popular',
      recent: 'Recent',
    };
    return labels[type as keyof typeof labels] || 'Suggestion';
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (confidence >= 0.6) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  };

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium text-gray-300">Smart Suggestions</span>
        {isLoading && (
          <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>

      {/* Suggestions Grid */}
      <div className="grid grid-cols-1 gap-2">
        {suggestions.map(suggestion => (
          <Card
            key={suggestion.id}
            className="bg-gray-800/30 border-gray-700 hover:bg-gray-800/50 cursor-pointer transition-colors group"
            onClick={() => onSuggestionClick?.(suggestion.text)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getSuggestionIcon(suggestion.type)}
                  <span className="text-sm text-gray-200 truncate group-hover:text-white">
                    {suggestion.text}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                  >
                    {Math.round(suggestion.confidence * 100)}%
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getSuggestionTypeLabel(suggestion.type)}
                  </Badge>
                </div>
              </div>

              {suggestion.reason && (
                <p className="text-xs text-gray-500 mt-1 italic">{suggestion.reason}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      {currentQuery.length > 0 && (
        <div className="flex gap-2 pt-2 border-t border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSuggestionClick?.(`${currentQuery} near me`)}
            className="text-xs"
          >
            <Target className="w-3 h-3 mr-1" />
            Near Me
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSuggestionClick?.(`${currentQuery} recommendations`)}
            className="text-xs"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Recommendations
          </Button>
        </div>
      )}
    </div>
  );
};
