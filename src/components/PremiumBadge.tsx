import React from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from './ui/badge';

interface PremiumBadgeProps {
  className?: string;
  variant?: 'default' | 'outline';
}

export const PremiumBadge = ({ className = '', variant = 'default' }: PremiumBadgeProps) => {
  return (
    <Badge
      variant="secondary"
      className={`bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30 transition-colors flex items-center gap-1.5 font-medium ${className}`}
    >
      <Sparkles size={12} />
      Premium Feature
    </Badge>
  );
};
