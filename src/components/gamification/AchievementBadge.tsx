import React from 'react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  className?: string;
}

const rarityConfig = {
  common: {
    gradient: 'from-slate-400 to-slate-600',
    border: 'border-slate-400/30',
    glow: 'shadow-slate-400/20',
  },
  rare: {
    gradient: 'from-blue-400 to-blue-600',
    border: 'border-blue-400/30',
    glow: 'shadow-blue-400/20',
  },
  epic: {
    gradient: 'from-purple-400 to-purple-600',
    border: 'border-purple-400/30',
    glow: 'shadow-purple-400/20',
  },
  legendary: {
    gradient: 'from-yellow-400 to-orange-500',
    border: 'border-yellow-400/30',
    glow: 'shadow-yellow-400/20',
  },
};

const sizeConfig = {
  sm: { icon: 'text-lg', badge: 'w-8 h-8', title: 'text-xs' },
  md: { icon: 'text-2xl', badge: 'w-12 h-12', title: 'text-sm' },
  lg: { icon: 'text-3xl', badge: 'w-16 h-16', title: 'text-base' },
};

export const AchievementBadge = ({
  achievement,
  size = 'md',
  showTitle = false,
  className,
}: AchievementBadgeProps) => {
  const rarity = rarityConfig[achievement.rarity];
  const sizing = sizeConfig[size];

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'rounded-full flex items-center justify-center border-2 transition-all duration-300 hover:scale-110',
          `bg-gradient-to-br ${rarity.gradient}`,
          rarity.border,
          `shadow-lg ${rarity.glow}`,
          sizing.badge,
        )}
        title={achievement.description}
      >
        <span className={cn('filter drop-shadow-sm', sizing.icon)}>{achievement.icon}</span>
      </div>

      {showTitle && (
        <span className={cn('font-medium text-white text-center max-w-20', sizing.title)}>
          {achievement.title}
        </span>
      )}
    </div>
  );
};
