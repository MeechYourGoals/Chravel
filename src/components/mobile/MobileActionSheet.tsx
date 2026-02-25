import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MobileActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const MobileActionSheet = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}: MobileActionSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle drag to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    const diff = currentY.current - startY.current;

    if (sheetRef.current) {
      if (diff > 100) {
        // Close if dragged down more than 100px
        onClose();
      } else {
        // Snap back to position
        sheetRef.current.style.transform = 'translateY(0)';
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet Content */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute inset-x-0 bottom-0 bg-background',
          'rounded-t-3xl shadow-mobile-sheet',
          'animate-slide-in-bottom',
          'max-h-[80vh] flex flex-col',
          className,
        )}
        style={{
          paddingBottom: `max(16px, env(safe-area-inset-bottom))`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-6 pb-4">
            <h3 className="text-h3 font-semibold text-center text-foreground">{title}</h3>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
};
