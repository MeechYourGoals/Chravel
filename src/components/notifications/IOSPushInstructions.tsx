/**
 * Simple iOS Push Instructions Dialog
 *
 * Shows when user tries to enable push on iOS Safari.
 * Instructs them to add the app to their Home Screen first.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IOSPushInstructionsProps {
  open: boolean;
  onClose: () => void;
}

export const IOSPushInstructions: React.FC<IOSPushInstructionsProps> = ({ open, onClose }) => (
  <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Enable Notifications on iOS</DialogTitle>
        <DialogDescription>
          To receive push notifications on your iPhone or iPad, you need to add Chravel to your Home
          Screen first.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <p className="font-medium text-sm">Follow these steps:</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari
            </li>
            <li>
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </li>
            <li>
              Tap <strong>"Add"</strong> in the top right
            </li>
            <li>Open Chravel from your Home Screen to enable notifications</li>
          </ol>
        </div>

        <p className="text-xs text-muted-foreground">
          This is a one-time setup required by Apple for web app notifications.
        </p>
      </div>

      <DialogFooter>
        <Button onClick={onClose} className="w-full">
          Got It
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default IOSPushInstructions;
