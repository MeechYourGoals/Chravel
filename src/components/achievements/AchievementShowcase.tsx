import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AchievementBadge } from '../gamification/AchievementBadge';
import { Badge } from '../ui/badge';
import { gamificationService } from '../../services/gamificationService';

interface AchievementShowcaseProps {
  className?: string;
  showTitle?: boolean;
  maxDisplay?: number;
}

export const AchievementShowcase = ({
  className,
  showTitle = true,
  maxDisplay = 6,
}: AchievementShowcaseProps) => {
  const userAchievements = gamificationService.getUserAchievements();
  const userStats = gamificationService.getUserStats();
  const organizerLevel = gamificationService.getOrganizerLevel(userStats);

  const displayAchievements = userAchievements.slice(0, maxDisplay);
  const remainingCount = Math.max(0, userAchievements.length - maxDisplay);

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span>Your Achievements</span>
            <Badge variant="secondary" className="text-xs">
              Level {organizerLevel.level}
            </Badge>
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className={showTitle ? 'pt-0' : 'p-6'}>
        {/* Organizer Level Progress */}
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{organizerLevel.title}</span>
            <span className="text-xs text-muted-foreground">Level {organizerLevel.level}</span>
          </div>

          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${organizerLevel.nextLevelProgress}%` }}
            />
          </div>

          {organizerLevel.nextLevelProgress < 100 && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(organizerLevel.nextLevelProgress)}% to next level
            </p>
          )}
        </div>

        {/* Achievement Badges */}
        {displayAchievements.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {displayAchievements.map(achievement => (
                <div key={achievement.id} className="flex justify-center">
                  <AchievementBadge achievement={achievement} size="md" showTitle={true} />
                </div>
              ))}
            </div>

            {remainingCount > 0 && (
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  +{remainingCount} more achievement{remainingCount !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">No achievements yet</p>
            <p className="text-xs text-muted-foreground">
              Start planning trips to unlock achievements!
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{userStats.totalTrips}</div>
            <div className="text-xs text-muted-foreground">Total Trips</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{userStats.planningStreak}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
