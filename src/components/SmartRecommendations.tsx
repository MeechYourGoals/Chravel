import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useAuth } from '../hooks/useAuth';

interface Recommendation {
  id: string;
  type: 'trip' | 'place' | 'activity' | 'venue';
  title: string;
  description: string;
  location?: string;
  similarity: number;
  reasons: string[];
  metadata?: {
    price?: string;
    duration?: string;
    category?: string;
    rating?: number;
  };
}

interface SmartRecommendationsProps {
  tripId?: string;
  userPreferences?: any;
  basedOn?: 'trip' | 'preferences' | 'history';
  limit?: number;
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({
  tripId,
  userPreferences,
  basedOn = 'preferences',
  limit = 6,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadRecommendations();
    }
  }, [tripId, userPreferences, basedOn]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/smart-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tripId,
          userPreferences,
          basedOn,
          limit,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRecommendations(data.recommendations);
        }
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      // Load fallback recommendations
      setRecommendations(getFallbackRecommendations());
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackRecommendations = (): Recommendation[] => {
    return [
      {
        id: '1',
        type: 'place',
        title: 'Local Art District',
        description: 'Explore vibrant street art and local galleries',
        location: 'Downtown',
        similarity: 0.85,
        reasons: ['Matches your love for culture', 'Similar to previous trips'],
        metadata: { category: 'Culture', duration: '2-3 hours' },
      },
      {
        id: '2',
        type: 'activity',
        title: 'Food Walking Tour',
        description: 'Taste authentic local cuisine with expert guides',
        similarity: 0.78,
        reasons: ['Based on dining preferences', 'Highly rated by similar travelers'],
        metadata: { price: '$$', duration: '3 hours', rating: 4.8 },
      },
    ];
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'trip':
        return <Calendar className="w-4 h-4" />;
      case 'place':
        return <MapPin className="w-4 h-4" />;
      case 'activity':
        return <Sparkles className="w-4 h-4" />;
      case 'venue':
        return <Users className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.8) return 'text-green-400';
    if (similarity >= 0.6) return 'text-yellow-400';
    return 'text-orange-400';
  };

  if (isLoading) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Sparkles className="w-5 h-5" />
            Smart Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-white/20 rounded mb-2" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/10 border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5" />
          Smart Recommendations
          <Badge variant="secondary" className="ml-auto">
            AI-Powered
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map(rec => (
          <div
            key={rec.id}
            className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(rec.type)}
                  <span className="font-medium text-white">{rec.title}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getSimilarityColor(rec.similarity)}`}
                  >
                    {Math.round(rec.similarity * 100)}% match
                  </Badge>
                </div>

                <p className="text-sm text-white/80 mb-2">{rec.description}</p>

                {rec.location && (
                  <div className="flex items-center gap-1 text-xs text-white/60 mb-2">
                    <MapPin className="w-3 h-3" />
                    {rec.location}
                  </div>
                )}

                {rec.metadata && (
                  <div className="flex gap-2 mb-2">
                    {rec.metadata.category && (
                      <Badge variant="outline" className="text-xs">
                        {rec.metadata.category}
                      </Badge>
                    )}
                    {rec.metadata.duration && (
                      <Badge variant="outline" className="text-xs">
                        {rec.metadata.duration}
                      </Badge>
                    )}
                    {rec.metadata.price && (
                      <Badge variant="outline" className="text-xs">
                        {rec.metadata.price}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  {rec.reasons.map((reason, idx) => (
                    <div key={idx} className="text-xs text-white/60 flex items-center gap-1">
                      <div className="w-1 h-1 bg-white/40 rounded-full" />
                      {reason}
                    </div>
                  ))}
                </div>
              </div>

              <Button size="sm" variant="outline" className="shrink-0">
                Add
              </Button>
            </div>
          </div>
        ))}

        {recommendations.length === 0 && !isLoading && (
          <div className="text-center py-6 text-white/60">
            <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No recommendations available yet</p>
            <p className="text-xs">Add more trip details to get personalized suggestions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
