import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AdminManager } from './AdminManager';
import { Shield } from 'lucide-react';

interface AdminManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripCreatorId: string;
}

export const AdminManagerDialog = ({ open, onOpenChange, tripId, tripCreatorId }: AdminManagerDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-900/95 backdrop-blur-md border-white/20">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Manage Administrators
          </DialogTitle>
        </DialogHeader>
        <AdminManager tripId={tripId} tripCreatorId={tripCreatorId} />
      </DialogContent>
    </Dialog>
  );
};
