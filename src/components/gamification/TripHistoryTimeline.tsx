import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AchievementBadge } from './AchievementBadge';
import { Badge } from '../ui/badge';
import { MapPin, Calendar, Users } from 'lucide-react';

interface TripHistoryItem {
  id: string;
  title: string;
  location: string;
  date: string;
  participants: number;
  coverImage?: string;
  achievements?: string[]; // Achievement IDs unlocked during this trip
}

interface TripHistoryTimelineProps {
  className?: string;
  maxItems?: number;
}

export const TripHistoryTimeline = ({ className, maxItems = 5 }: TripHistoryTimelineProps) => {
  // Mock trip history data - replace with real data
  const tripHistory: TripHistoryItem[] = [
    {
      id: '1',
      title: 'Spring Break Cancun',
      location: 'Cancun, Mexico',
      date: '2024-03-15',
      participants: 8,
      coverImage:
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=100&fit=crop',
      achievements: ['international_explorer'],
    },
    {
      id: '2',
      title: 'Nashville Bachelorette',
      location: 'Nashville, TN',
      date: '2023-11-20',
      participants: 12,
      coverImage:
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=100&fit=crop',
      achievements: ['group_organizer'],
    },
    {
      id: '3',
      title: 'Family Mountain Getaway',
      location: 'Aspen, CO',
      date: '2023-08-10',
      participants: 6,
      coverImage: 'https://images.unsplash.com/photo-1551524164-687a55dd1126?w=200&h=100&fit=crop',
    },
  ];

  const displayTrips = tripHistory.slice(0, maxItems);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Travel History</span>
          <Badge variant="secondary" className="text-xs">
            {tripHistory.length} trip{tripHistory.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {displayTrips.map((trip, index) => (
            <div key={trip.id} className="flex gap-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 bg-primary rounded-full flex-shrink-0" />
                {index < displayTrips.length - 1 && <div className="w-px h-16 bg-border mt-2" />}
              </div>

              {/* Trip content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start gap-3">
                  {/* Trip image */}
                  <div
                    className="w-16 h-10 bg-cover bg-center rounded-md flex-shrink-0"
                    style={{
                      backgroundImage: `url('${trip.coverImage || '/placeholder.svg'}')`,
                    }}
                  />

                  {/* Trip details */}
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm">{trip.title}</h4>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        {trip.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(trip.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={12} />
                        {trip.participants}
                      </div>
                    </div>

                    {/* Achievements earned */}
                    {trip.achievements && trip.achievements.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Earned:</span>
                        <div className="flex gap-1">
                          {trip.achievements.map(achievementId => (
                            <div
                              key={achievementId}
                              className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center"
                            >
                              <span className="text-xs">🏆</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {tripHistory.length === 0 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">No trips yet</p>
            <p className="text-xs text-muted-foreground">
              Your amazing adventures will appear here!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
