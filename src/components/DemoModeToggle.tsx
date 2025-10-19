import React, { useState } from 'react';
import { Eye, EyeOff, Info } from 'lucide-react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

export const DemoModeToggle = () => {
  const { isDemoMode, toggleDemoMode } = useDemoMode();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleToggle = () => {
    if (isDemoMode) {
      // When turning OFF demo mode, show confirmation
      setShowConfirmDialog(true);
    } else {
      // When turning ON demo mode, just toggle
      toggleDemoMode();
    }
  };

  const confirmToggle = () => {
    toggleDemoMode();
    setShowConfirmDialog(false);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleToggle}
              variant="outline"
              size="sm"
              className={`w-full flex items-center justify-center gap-2 transition-all duration-200 rounded-xl ${
                isDemoMode 
                  ? 'bg-primary/20 border-primary/60 text-primary hover:bg-primary/30 shadow-lg shadow-primary/30 border-2' 
                  : 'bg-card/80 border-border/40 text-muted-foreground hover:bg-card/90 backdrop-blur-sm border-2'
              }`}
            >
              {isDemoMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="text-xs font-medium">
                {isDemoMode ? 'Demo ON' : 'Demo OFF'}
              </span>
              <Info className="h-3 w-3 opacity-60" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">
              {isDemoMode 
                ? 'Demo Mode is ON - Showing mock data for presentations. Toggle OFF to see clean, empty state ready for production.'
                : 'Demo Mode is OFF - Clean state with no mock data. Toggle ON to see full feature showcase with sample data.'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn Off Demo Mode?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>This will hide all mock data including:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Sample trips and collaborators</li>
                <li>Mock messages and broadcasts</li>
                <li>Demo payments and expenses</li>
                <li>Sample polls and calendar events</li>
                <li>Mock media (photos, videos, files)</li>
              </ul>
              <p className="mt-3 font-medium">
                The app will show a clean, empty state ready for real usage.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>
              Turn Off Demo Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};