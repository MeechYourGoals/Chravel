import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TripHeader } from '../TripHeader';
import { hapticService } from '../../services/hapticService';
import { ProTripCategory } from '../../types/proCategories';
import { usePullToDismiss } from '../../hooks/usePullToDismiss';

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
  const {
    y,
    opacity,
    scale,
    handleDragStart,
    handleDragEnd,
    dragConstraints,
    dragElastic,
  } = usePullToDismiss({
    onDismiss: () => {
      hapticService.light();
      onClose();
    },
    threshold: 120,
    velocityThreshold: 400,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => {
              hapticService.light();
              onClose();
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={dragConstraints}
            dragElastic={dragElastic}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{ y, opacity, scale }}
            className="fixed inset-x-0 bottom-0 z-50 bg-black border-t border-white/10 rounded-t-2xl flex flex-col"
            // Height: from safe-area-top to bottom
            // Using calc to account for status bar
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-white/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="border-b border-white/10 px-4 pb-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-white text-lg font-semibold">Trip Details</h2>
                <button
                  onClick={() => {
                    hapticService.light();
                    onClose();
                  }}
                  className="p-2 -mr-2 rounded-lg hover:bg-white/10 active:scale-95 transition-all"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Split-pane layout */}
            <div 
              className="flex-1 min-h-0 overflow-hidden px-4 py-3"
              style={{ 
                maxHeight: 'calc(100dvh - env(safe-area-inset-top, 44px) - 80px)',
              }}
            >
              <div className="h-full min-h-0 grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                <TripHeader
                  trip={trip}
                  onDescriptionUpdate={onDescriptionUpdate}
                  onShowExport={onShowExport}
                  category={category as ProTripCategory}
                  tags={tags}
                  drawerLayout
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
