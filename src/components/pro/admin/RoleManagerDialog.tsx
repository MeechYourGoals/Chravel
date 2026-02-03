import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { RoleManager } from './RoleManager';

interface RoleManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripCreatorId?: string;
}

/**
 * Dialog wrapper for role management.
 * Shows role definitions with member assignment handled through the Members button per role.
 * Roles = Channel Access. Each role has an associated private channel.
 */
export const RoleManagerDialog: React.FC<RoleManagerDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  tripCreatorId,
}) => {
  const isMobile = useIsMobile();

  const content = <RoleManager tripId={tripId} tripCreatorId={tripCreatorId} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Manage Roles</SheetTitle>
            <SheetDescription>
              Manage roles, assign members, and control admin access
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto pb-8">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Roles</DialogTitle>
          <DialogDescription>
            Manage roles, assign members, and control admin access
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">{content}</div>
      </DialogContent>
    </Dialog>
  );
};
