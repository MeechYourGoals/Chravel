import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EnhancedEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: string;
  className?: string;
}

export const EnhancedEmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  illustration,
  className = '',
}: EnhancedEmptyStateProps) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      {illustration ? (
        <div className="w-32 h-32 mx-auto mb-6 bg-muted/20 rounded-full flex items-center justify-center">
          <img src={illustration} alt="" className="w-24 h-24 opacity-60" />
        </div>
      ) : (
        <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon size={32} className="text-primary" />
        </div>
      )}

      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="animate-fade-in transition-all duration-200 hover:scale-105"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
