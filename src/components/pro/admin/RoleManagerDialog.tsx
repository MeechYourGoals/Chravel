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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { RoleManager } from './RoleManager';
import { RoleAssignmentPanel } from './RoleAssignmentPanel';
import { Users, UserPlus } from 'lucide-react';

interface RoleManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripCreatorId?: string;
}

/**
 * Simplified Dialog wrapper for role management.
 * Contains two tabs: Roles (channel access definitions) and Assign (member + admin management).
 * Roles = Channel Access. Trip Admins are managed inline in the Assign tab.
 */
export const RoleManagerDialog: React.FC<RoleManagerDialogProps> = ({
  open,
  onOpenChange,
  tripId,
  tripCreatorId,
}) => {
  const isMobile = useIsMobile();

  const content = (
    <Tabs defaultValue="roles" className="w-full">
      <TabsList className="grid w-full grid-cols-2 rounded-full bg-white/5 p-1 mb-4">
        <TabsTrigger 
          value="roles" 
          className="rounded-full data-[state=active]:bg-purple-600 data-[state=active]:text-white flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Roles</span>
        </TabsTrigger>
        <TabsTrigger 
          value="assign" 
          className="rounded-full data-[state=active]:bg-green-600 data-[state=active]:text-white flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Assign</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roles" className="mt-0">
        <RoleManager tripId={tripId} />
      </TabsContent>

      <TabsContent value="assign" className="mt-0">
        <RoleAssignmentPanel tripId={tripId} tripCreatorId={tripCreatorId} />
      </TabsContent>
    </Tabs>
  );

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
