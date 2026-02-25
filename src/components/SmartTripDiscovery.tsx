import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users, Sparkles, TrendingUp } from 'lucide-react';

interface TripRecommendation {
  id: string;
  title: string;
  location: string;
  dateRange: string;
  participants: number;
  similarity: number;
  tripType: 'regular' | 'pro' | 'event';
  imageUrl?: string;
  tags: string[];
  deepLink: string;
  reason: string;
}

interface SmartTripDiscoveryProps {
  currentTripId?: string;
  userPreferences?: {
    favoriteDestinations: string[];
    tripTypes: string[];
    activities: string[];
  };
  basedOn?: 'similar' | 'trending' | 'preferences';
}

export const SmartTripDiscovery = ({
  currentTripId,
  userPreferences,
  basedOn = 'similar',
}: SmartTripDiscoveryProps) => {
  const [recommendations, setRecommendations] = useState<TripRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, [currentTripId, basedOn]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const { data } = await fetch('/api/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:
            basedOn === 'similar'
              ? `trips similar to ${currentTripId}`
              : basedOn === 'trending'
                ? 'trending popular trips'
                : `trips matching ${userPreferences?.activities?.join(' ')}`,
          limit: 6,
          threshold: 0.6,
        }),
      }).then(r => r.json());

      const formattedResults =
        data?.results?.map((result: any) => ({
          id: result.id,
          title: result.tripName || result.content?.slice(0, 50),
          location: result.metadata?.location || 'Various Locations',
          dateRange: result.metadata?.dateRange || 'Flexible Dates',
          participants: result.metadata?.participants || 0,
          similarity: result.similarity,
          tripType: result.metadata?.tripType || 'regular',
          tags: result.metadata?.tags || [],
          deepLink: result.deepLink,
          reason: getRecommendationReason(result.similarity, basedOn),
        })) || [];

      setRecommendations(formattedResults);
    } catch (error) {
      console.error('Failed to load trip recommendations:', error);
      setRecommendations(getFallbackRecommendations());
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationReason = (similarity: number, type: string): string => {
    if (type === 'similar') return `${Math.round(similarity * 100)}% similar to your current trip`;
    if (type === 'trending') return 'Popular with other travelers';
    return `Matches your ${similarity > 0.8 ? 'perfect' : 'good'} preferences`;
  };

  const getFallbackRecommendations = (): TripRecommendation[] => [
    {
      id: 'fallback-1',
      title: 'European Adventure',
      location: 'Paris, France',
      dateRange: 'Spring 2025',
      participants: 4,
      similarity: 0.85,
      tripType: 'regular',
      tags: ['culture', 'food', 'museums'],
      deepLink: '/trip/european-adventure',
      reason: '85% similar to your current trip',
    },
    {
      id: 'fallback-2',
      title: 'Tech Conference SF',
      location: 'San Francisco, CA',
      dateRange: 'Q2 2025',
      participants: 50,
      similarity: 0.78,
      tripType: 'pro',
      tags: ['business', 'networking', 'tech'],
      deepLink: '/tour/pro/lakers-road-trip',
      reason: 'Popular with professionals',
    },
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pro':
        return <TrendingUp className="w-4 h-4" />;
      case 'event':
        return <Calendar className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const getSimilarityColor = (similarity: number): string => {
    if (similarity >= 0.8) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (similarity >= 0.6) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Smart Trip Discovery</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="bg-gray-800/50 border-gray-700 animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-700 rounded mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Smart Trip Discovery</h3>
        </div>
        <div className="flex gap-2">
          <Button
            variant={basedOn === 'similar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => loadRecommendations()}
            className="text-xs"
          >
            Similar
          </Button>
          <Button
            variant={basedOn === 'trending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => loadRecommendations()}
            className="text-xs"
          >
            Trending
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map(rec => (
          <Card
            key={rec.id}
            className="bg-gray-800/50 border-gray-700 hover:bg-gray-800/70 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getTypeIcon(rec.tripType)}
                  <CardTitle className="text-sm font-medium text-white truncate">
                    {rec.title}
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs ${getSimilarityColor(rec.similarity)}`}
                >
                  {Math.round(rec.similarity * 100)}%
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  <span>{rec.location}</span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  <span>{rec.dateRange}</span>
                </div>

                {rec.participants > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Users className="w-3 h-3" />
                    <span>{rec.participants} participants</span>
                  </div>
                )}

                <p className="text-xs text-gray-500 italic">{rec.reason}</p>

                {rec.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {rec.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => (window.location.href = rec.deepLink)}
                >
                  View Trip
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {recommendations.length === 0 && !isLoading && (
        <Card className="bg-gray-800/30 border-gray-700">
          <CardContent className="text-center py-8">
            <Sparkles className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-400">No similar trips found. Try different preferences.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
