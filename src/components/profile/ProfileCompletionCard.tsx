import React from 'react';
import { Card, CardContent } from '../ui/card';
import { ProgressRing } from '../gamification/ProgressRing';
import { Badge } from '../ui/badge';
import { Camera, MapPin, Heart, Settings } from 'lucide-react';

interface ProfileCompletionStep {
  id: string;
  title: string;
  completed: boolean;
  icon: React.ReactNode;
  points: number;
}

interface ProfileCompletionCardProps {
  className?: string;
}

export const ProfileCompletionCard = ({ className }: ProfileCompletionCardProps) => {
  // Mock profile completion data - replace with real user data
  const steps: ProfileCompletionStep[] = [
    {
      id: 'avatar',
      title: 'Upload profile photo',
      completed: true,
      icon: <Camera size={16} />,
      points: 10,
    },
    {
      id: 'preferences',
      title: 'Set travel preferences',
      completed: false,
      icon: <Heart size={16} />,
      points: 15,
    },
    {
      id: 'location',
      title: 'Add home location',
      completed: true,
      icon: <MapPin size={16} />,
      points: 10,
    },
    {
      id: 'settings',
      title: 'Complete profile settings',
      completed: false,
      icon: <Settings size={16} />,
      points: 15,
    },
  ];

  const completedSteps = steps.filter(step => step.completed);
  const totalPoints = steps.reduce((sum, step) => sum + step.points, 0);
  const earnedPoints = completedSteps.reduce((sum, step) => sum + step.points, 0);
  const completionPercentage = (earnedPoints / totalPoints) * 100;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <ProgressRing progress={completionPercentage} size="md" showPercentage={true} />
          <div>
            <h3 className="font-semibold text-foreground">Complete Your Profile</h3>
            <p className="text-sm text-muted-foreground">
              {completedSteps.length} of {steps.length} steps completed
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {steps.map(step => (
            <div
              key={step.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                step.completed
                  ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800/30'
                  : 'bg-muted/50 border-border hover:bg-muted'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    step.completed
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step.icon}
                </div>
                <span
                  className={`text-sm font-medium ${
                    step.completed ? 'text-green-700 dark:text-green-300' : 'text-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={step.completed ? 'default' : 'secondary'} className="text-xs">
                  +{step.points} pts
                </Badge>
                {step.completed && (
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {completionPercentage < 100 && (
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Complete your profile to unlock personalized trip recommendations!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
