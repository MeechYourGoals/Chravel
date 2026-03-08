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
      className={`bg-gold-primary/15 text-gold-primary border-gold-primary/30 hover:bg-gold-primary/25 transition-colors flex items-center gap-1.5 font-medium ${className}`}
    >
      <Sparkles size={12} />
      Premium Feature
    </Badge>
  );
};
