import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useDemoMode } from '@/hooks/useDemoMode';
import { demoModeService } from '@/services/demoModeService';
import { hapticService } from '@/services/hapticService';
import { demoEvents } from '@/telemetry/events';

interface ExitDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExitDemoModal: React.FC<ExitDemoModalProps> = ({ open, onOpenChange }) => {
  const { setDemoView } = useDemoMode();
  const navigate = useNavigate();

  const handleExitDemo = async () => {
    // Track exit event
    demoEvents.exited('button', demoModeService.getSessionActionsCount());

    // Clear all session state
    demoModeService.clearAllSessionState();

    // Disable demo mode
    await setDemoView('off');

    // Haptic feedback
    await hapticService.success();

    // Close modal
    onOpenChange(false);

    // Navigate to home
    navigate('/');
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Exit Demo Mode?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Changes you made in demo mode won't be saved. Ready to create your own trip?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Stay in Demo</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExitDemo}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Exit Demo
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
