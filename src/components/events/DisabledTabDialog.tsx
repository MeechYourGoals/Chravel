import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface DisabledTabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DisabledTabDialog: React.FC<DisabledTabDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-card border-border" showClose={false}>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-foreground">
            The event organizers have disabled this tab for this event.
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-lg bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
