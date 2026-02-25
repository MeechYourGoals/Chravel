import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AdminManager } from './AdminManager';
import { Shield } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface AdminManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripCreatorId: string;
}

export const AdminManagerDialog = ({
  open,
  onOpenChange,
  tripId,
  tripCreatorId,
}: AdminManagerDialogProps) => {
  const isMobile = useIsMobile();

  const content = <AdminManager tripId={tripId} tripCreatorId={tripCreatorId} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              Manage Administrators
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
            <Shield className="w-5 h-5 text-blue-400" />
            Manage Administrators
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};
