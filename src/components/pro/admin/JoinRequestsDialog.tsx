import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { JoinRequestsPanel } from './JoinRequestsPanel';
import { Clock } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface JoinRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
}

export const JoinRequestsDialog = ({ open, onOpenChange, tripId }: JoinRequestsDialogProps) => {
  const isMobile = useIsMobile();

  const content = <JoinRequestsPanel tripId={tripId} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              Join Requests
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900/95 backdrop-blur-md border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            Join Requests
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
