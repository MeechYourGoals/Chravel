import React from 'react';
import { Eye, EyeOff, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDemoMode } from '@/hooks/useDemoMode';
import { DemoView } from '@/store/demoModeStore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export const DemoModeSelector = () => {
  const { demoView, setDemoView, isLoading } = useDemoMode();

  const handleViewChange = async (view: DemoView) => {
    if (isLoading) return;
    await setDemoView(view);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex rounded-lg border-2 border-border/50 p-1 bg-background/40 backdrop-blur-md shadow-sm">
            <button
              onClick={() => handleViewChange('off')}
              disabled={isLoading}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all duration-200 flex items-center gap-1',
                demoView === 'off'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              aria-label="Demo mode off"
            >
              <EyeOff className="h-3 w-3" />
              <span className="hidden sm:inline">OFF</span>
            </button>
            <button
              onClick={() => handleViewChange('marketing')}
              disabled={isLoading}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all duration-200 flex items-center gap-1',
                demoView === 'marketing'
                  ? 'bg-primary/30 text-primary shadow-sm border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              aria-label="Marketing view"
            >
              <FileText className="h-3 w-3" />
              <span className="hidden sm:inline">Marketing</span>
            </button>
            <button
              onClick={() => handleViewChange('app-preview')}
              disabled={isLoading}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all duration-200 flex items-center gap-1',
                demoView === 'app-preview'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
              aria-label="App preview mode"
            >
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">App</span>
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2 text-xs">
            <p><strong>OFF:</strong> Clean marketing pages</p>
            <p><strong>Marketing:</strong> Marketing with demo previews</p>
            <p><strong>App:</strong> Full app interface with mock data</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
