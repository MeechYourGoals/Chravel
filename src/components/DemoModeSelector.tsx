import React from 'react';
import { Eye, EyeOff, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useAuth } from '@/hooks/useAuth';
import { DemoView } from '@/store/demoModeStore';
import { SUPER_ADMIN_EMAILS } from '@/constants/admins';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export const DemoModeSelector = () => {
  const { demoView, setDemoView, isLoading } = useDemoMode();
  const { user } = useAuth();

  // Only show for super admin - hide for everyone else (authenticated or not)
  const isSuperAdmin = user?.email && SUPER_ADMIN_EMAILS.includes(user.email);

  if (!isSuperAdmin) {
    return null;
  }

  const handleViewChange = async (view: DemoView) => {
    if (isLoading) return;
    await setDemoView(view);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex rounded-lg border-2 border-border/50 p-0.5 sm:p-1 bg-background/40 backdrop-blur-md shadow-sm min-h-[36px]">
            <button
              onClick={() => handleViewChange('off')}
              disabled={isLoading}
              className={cn(
                'px-2 py-1.5 sm:px-2.5 rounded-md text-[9px] sm:text-[10px] font-medium transition-all duration-200 flex items-center gap-0.5 sm:gap-1 min-h-[32px] sm:min-h-[28px]',
                demoView === 'off'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
              aria-label="Marketing landing page"
            >
              <EyeOff className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">Info</span>
            </button>
            <button
              onClick={() => handleViewChange('marketing')}
              disabled={isLoading}
              className={cn(
                'px-2 py-1.5 sm:px-2.5 rounded-md text-[9px] sm:text-[10px] font-medium transition-all duration-200 flex items-center gap-0.5 sm:gap-1 min-h-[32px] sm:min-h-[28px]',
                demoView === 'marketing'
                  ? 'bg-primary/30 text-primary shadow-sm border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
              aria-label="Home view"
            >
              <Home className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">Home</span>
            </button>
            <button
              onClick={() => handleViewChange('app-preview')}
              disabled={isLoading}
              className={cn(
                'px-2 py-1.5 sm:px-2.5 rounded-md text-[9px] sm:text-[10px] font-medium transition-all duration-200 flex items-center gap-0.5 sm:gap-1 min-h-[32px] sm:min-h-[28px]',
                demoView === 'app-preview'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
              aria-label="Demo data mode"
            >
              <Eye className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">Demo</span>
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p>
              <strong>info:</strong> marketing landing page
            </p>
            <p>
              <strong>Home:</strong> Authenticated user dashboard
            </p>
            <p>
              <strong>Demo:</strong> Demo data preview
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
