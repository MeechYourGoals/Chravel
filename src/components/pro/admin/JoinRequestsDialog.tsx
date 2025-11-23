import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JoinRequestsPanel } from './JoinRequestsPanel';
import { Clock } from 'lucide-react';

interface JoinRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
}

export const JoinRequestsDialog = ({ open, onOpenChange, tripId }: JoinRequestsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900/95 backdrop-blur-md border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            Join Requests
          </DialogTitle>
        </DialogHeader>
        <JoinRequestsPanel tripId={tripId} />
      </DialogContent>
    </Dialog>
  );
};
