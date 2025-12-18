import React from 'react';
import { X } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '../ui/drawer';
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
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-black border-t border-white/10 !mt-4 min-h-[70vh] flex flex-col">
        <DrawerHeader className="border-b border-white/10 !p-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-white text-lg font-semibold">
              Trip Details
            </DrawerTitle>
            <DrawerClose asChild>
              <button
                onClick={() => {
                  hapticService.light();
                  onClose();
                }}
                className="p-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
              >
                <X size={20} className="text-white" />
              </button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 py-3 flex-1 overflow-y-auto flex flex-col justify-center">
          <TripHeader
            trip={trip}
            onDescriptionUpdate={onDescriptionUpdate}
            onShowExport={onShowExport}
            category={category as ProTripCategory}
            tags={tags}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
};
