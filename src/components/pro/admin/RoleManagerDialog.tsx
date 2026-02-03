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
}

/**
 * Dialog wrapper for RoleManager component.
 * Allows admins to manage roles (create, delete, rename, manage members)
 * directly from the Team tab.
 */
export const RoleManagerDialog: React.FC<RoleManagerDialogProps> = ({
  open,
  onOpenChange,
  tripId,
}) => {
  const isMobile = useIsMobile();

  const content = <RoleManager tripId={tripId} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>Manage Roles</SheetTitle>
            <SheetDescription>
              Create, edit, delete roles, and manage role memberships
            </SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto">{content}</div>
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
            Create, edit, delete roles, and manage role memberships
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">{content}</div>
      </DialogContent>
    </Dialog>
  );
};
