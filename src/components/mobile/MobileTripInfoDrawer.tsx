import React from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '../ui/dialog';
import { TripHeader } from '../TripHeader';
import { hapticService } from '../../services/hapticService';
import { ProTripCategory } from '../../types/proCategories';

interface MobileTripInfoDrawerProps {
  trip: any;
  isOpen: boolean;
  onClose: () => void;
  onDescriptionUpdate: (description: string) => void;
  onShowExport?: () => void;
  category?: ProTripCategory | string;
  tags?: string[];
}

export const MobileTripInfoDrawer = ({
  trip,
  isOpen,
  onClose,
  onDescriptionUpdate,
  onShowExport,
  category,
  tags,
}: MobileTripInfoDrawerProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showClose={false} 
        className="!fixed !inset-x-0 !top-[env(safe-area-inset-top,3vh)] !bottom-0 !left-0 !right-0 !translate-x-0 !translate-y-0 bg-black border-t border-white/10 !max-w-full !w-full !rounded-t-2xl !rounded-b-none flex flex-col p-0 gap-0 animate-slide-in-from-bottom"
      >
        <DialogHeader className="border-b border-white/10 p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-lg font-semibold">
              Trip Details
            </DialogTitle>
            <DialogClose asChild>
              <button
                onClick={() => {
                  hapticService.light();
                  onClose();
                }}
                className="p-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all absolute right-3 top-3"
              >
                <X size={20} className="text-white" />
              </button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="px-4 py-3 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,20px)]">
          <TripHeader
            trip={trip}
            onDescriptionUpdate={onDescriptionUpdate}
            onShowExport={onShowExport}
            category={category as ProTripCategory}
            tags={tags}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
