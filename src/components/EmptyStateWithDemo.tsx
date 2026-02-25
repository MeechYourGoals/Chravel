import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { useDemoMode } from '@/hooks/useDemoMode';

interface EmptyStateWithDemoProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  showDemoPrompt?: boolean;
}

export const EmptyStateWithDemo = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  showDemoPrompt = true,
}: EmptyStateWithDemoProps) => {
  const { isDemoMode, enableDemoMode } = useDemoMode();

  return (
    <div className="text-center py-12 px-4">
      <div className="w-20 h-20 mx-auto mb-6 bg-muted/20 rounded-full flex items-center justify-center">
        <Icon size={32} className="text-muted-foreground" />
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">{description}</p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="transition-all duration-200 hover:scale-105">
            {actionLabel}
          </Button>
        )}

        {showDemoPrompt && !isDemoMode && (
          <Button
            onClick={enableDemoMode}
            variant="outline"
            className="transition-all duration-200 hover:scale-105"
          >
            Show Demo Data
          </Button>
        )}
      </div>

      {showDemoPrompt && !isDemoMode && (
        <p className="text-xs text-muted-foreground mt-4 max-w-sm mx-auto">
          Turn on Demo Mode to see sample data and explore all features
        </p>
      )}
    </div>
  );
};
