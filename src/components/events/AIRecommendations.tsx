import React, { useState, useEffect } from 'react';
import { Sparkles, Star, Users, Clock, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { Session, Speaker } from '../../types/events';

interface RecommendationReason {
  type: 'interest_match' | 'popular' | 'trending' | 'time_fit' | 'speaker_rating';
  label: string;
  score: number;
}

interface SessionRecommendation {
  session: Session;
  reasons: RecommendationReason[];
  overallScore: number;
  speaker?: Speaker;
}

interface AIRecommendationsProps {
  sessions: Session[];
  speakers: Speaker[];
  userInterests?: string[];
  userSchedule?: string[]; // session IDs already in user's schedule
}

export const AIRecommendations = ({
  sessions,
  speakers,
  userInterests = [],
  userSchedule = [],
}: AIRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<SessionRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    generateRecommendations();
  }, [sessions, speakers, userInterests, userSchedule]);

  const generateRecommendations = async () => {
    setIsLoading(true);

    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const scoredSessions = sessions
      .filter(session => !userSchedule.includes(session.id))
      .map(session => {
        const speaker = speakers.find(s => s.id === session.speaker);
        const reasons: RecommendationReason[] = [];
        let totalScore = 0;

        // Interest matching
        const sessionKeywords = `${session.title} ${session.description}`.toLowerCase();
        const interestMatches = userInterests.filter(interest =>
          sessionKeywords.includes(interest.toLowerCase()),
        ).length;

        if (interestMatches > 0) {
          const score = Math.min(interestMatches * 0.3, 0.9);
          reasons.push({
            type: 'interest_match',
            label: `Matches ${interestMatches} of your interests`,
            score,
          });
          totalScore += score;
        }

        // Speaker rating (simulated)
        if (speaker) {
          const speakerScore = 0.7; // Would be calculated from real ratings
          reasons.push({
            type: 'speaker_rating',
            label: 'Highly rated speaker',
            score: speakerScore,
          });
          totalScore += speakerScore;
        }

        // Time fit (prefer sessions not too early or too late)
        const startHour = parseInt(session.startTime.split(':')[0]);
        if (startHour >= 10 && startHour <= 16) {
          const score = 0.4;
          reasons.push({
            type: 'time_fit',
            label: 'Optimal time slot',
            score,
          });
          totalScore += score;
        }

        // Trending topics (simulate based on keywords)
        const trendingTopics = ['ai', 'blockchain', 'sustainability', 'innovation'];
        const hasTrendingTopic = trendingTopics.some(topic => sessionKeywords.includes(topic));

        if (hasTrendingTopic) {
          const score = 0.5;
          reasons.push({
            type: 'trending',
            label: 'Trending topic',
            score,
          });
          totalScore += score;
        }

        return {
          session,
          speaker,
          reasons,
          overallScore: Math.min(totalScore, 1.0),
        };
      })
      .filter(rec => rec.overallScore > 0.3)
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 6);

    setRecommendations(scoredSessions);
    setIsLoading(false);
  };

  const getReasonIcon = (type: RecommendationReason['type']) => {
    switch (type) {
      case 'interest_match':
        return <Star size={12} className="text-yellow-400" />;
      case 'popular':
        return <Users size={12} className="text-blue-400" />;
      case 'trending':
        return <TrendingUp size={12} className="text-green-400" />;
      case 'time_fit':
        return <Clock size={12} className="text-purple-400" />;
      case 'speaker_rating':
        return <Sparkles size={12} className="text-glass-orange" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-gray-400';
  };

  if (!user) {
    return (
      <div className="text-center py-8">
        <Sparkles size={48} className="text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400">Log in to get personalized session recommendations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles size={24} className="text-glass-orange" />
        <h3 className="text-xl font-bold text-white">AI Recommendations</h3>
        <Badge variant="secondary" className="bg-glass-orange/20 text-glass-orange">
          Powered by AI
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-600 rounded mb-2 w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded mb-2 w-1/2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-8">
          <Sparkles size={48} className="text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No recommendations available.</p>
          <p className="text-gray-500 text-sm">
            Update your interests in settings to get better recommendations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map(rec => (
            <div
              key={rec.session.id}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-white font-semibold text-lg">{rec.session.title}</h4>
                    <div className={`text-sm font-medium ${getScoreColor(rec.overallScore)}`}>
                      {Math.round(rec.overallScore * 100)}% match
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                    {rec.session.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      {rec.session.startTime} - {rec.session.endTime}
                    </div>
                    <div>{rec.session.location}</div>
                    {rec.speaker && <div>Speaker: {rec.speaker.name}</div>}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {rec.reasons.map((reason, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-xs text-gray-300"
                      >
                        {getReasonIcon(reason.type)}
                        {reason.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    Learn More
                  </Button>
                  <Button size="sm" className="bg-glass-orange hover:bg-glass-orange/80 text-white">
                    Add to Schedule
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation Settings */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h5 className="text-white font-medium mb-2">Improve Your Recommendations</h5>
        <p className="text-gray-400 text-sm mb-3">
          The more we know about your interests, the better we can recommend sessions.
        </p>
        <Button variant="outline" size="sm">
          Update Interests
        </Button>
      </div>
    </div>
  );
};
