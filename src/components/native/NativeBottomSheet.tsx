import React, { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';

type SheetDetent = 'small' | 'medium' | 'large' | 'full';

interface DetentConfig {
  small: number;
  medium: number;
  large: number;
  full: number;
}

const DEFAULT_DETENTS: DetentConfig = {
  small: 0.25,
  medium: 0.5,
  large: 0.75,
  full: 0.95,
};

interface NativeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  detent?: SheetDetent;
  allowedDetents?: SheetDetent[];
  onDetentChange?: (detent: SheetDetent) => void;
  showGrabber?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

/**
 * iOS-style bottom sheet with spring physics and snap points (detents).
 * Mimics UISheetPresentationController behavior.
 */
export const NativeBottomSheet = ({
  isOpen,
  onClose,
  children,
  title,
  subtitle,
  detent = 'medium',
  allowedDetents = ['medium', 'large'],
  onDetentChange,
  showGrabber = true,
  showCloseButton = false,
  className,
}: NativeBottomSheetProps) => {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentDetent, setCurrentDetent] = useState<SheetDetent>(detent);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);

  const startY = useRef(0);
  const startTranslateY = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);

  // Calculate sheet height based on detent
  const getHeightForDetent = useCallback((d: SheetDetent): number => {
    const vh = window.innerHeight;
    return vh * DEFAULT_DETENTS[d];
  }, []);

  // Find nearest detent based on current position
  const findNearestDetent = useCallback(
    (currentY: number, vel: number): SheetDetent => {
      const vh = window.innerHeight;
      const currentRatio = 1 - currentY / vh;

      // If velocity is high, predict where sheet will end up
      const predictedRatio = currentRatio + (vel > 0 ? 0.15 : vel < 0 ? -0.15 : 0);

      let nearestDetent: SheetDetent = allowedDetents[0];
      let minDistance = Infinity;

      for (const d of allowedDetents) {
        const distance = Math.abs(DEFAULT_DETENTS[d] - predictedRatio);
        if (distance < minDistance) {
          minDistance = distance;
          nearestDetent = d;
        }
      }

      // If dragging down fast and below threshold, close
      if (vel < -500 && predictedRatio < DEFAULT_DETENTS[allowedDetents[0]] * 0.5) {
        return 'small'; // Will trigger close
      }

      return nearestDetent;
    },
    [allowedDetents],
  );

  // Spring animation to detent
  const animateToDetent = useCallback(
    (targetDetent: SheetDetent) => {
      if (targetDetent === 'small' && DEFAULT_DETENTS[targetDetent] < 0.3) {
        // Close sheet if snapping to small
        onClose();
        return;
      }

      setCurrentDetent(targetDetent);
      onDetentChange?.(targetDetent);
      setTranslateY(0);
      hapticService.light();
    },
    [onClose, onDetentChange],
  );

  // Touch handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      startY.current = e.touches[0].clientY;
      startTranslateY.current = translateY;
      lastY.current = e.touches[0].clientY;
      lastTime.current = Date.now();
      velocity.current = 0;
      setIsDragging(true);
    },
    [translateY],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;
      const now = Date.now();
      const dt = now - lastTime.current;

      // Calculate velocity
      if (dt > 0) {
        velocity.current = ((currentY - lastY.current) / dt) * 1000;
      }

      lastY.current = currentY;
      lastTime.current = now;

      // Only allow dragging down, with resistance at top
      const newTranslateY = startTranslateY.current + diff;
      if (newTranslateY < 0) {
        // Add rubber band resistance when pulling past top
        setTranslateY(newTranslateY * 0.2);
      } else {
        setTranslateY(newTranslateY);
      }
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const nearestDetent = findNearestDetent(translateY, velocity.current);
    animateToDetent(nearestDetent);
  }, [isDragging, translateY, findNearestDetent, animateToDetent]);

  // Prevent body scroll when open
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

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrentDetent(detent);
      setTranslateY(0);
    }
  }, [isOpen, detent]);

  if (!isOpen) return null;

  const sheetHeight = getHeightForDetent(currentDetent);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with iOS-style blur */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm',
          'transition-opacity duration-300',
          isDragging ? 'transition-none' : '',
        )}
        onClick={onClose}
        style={{
          opacity: Math.max(0, 1 - translateY / sheetHeight),
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'absolute inset-x-0 bottom-0',
          'bg-[#1c1c1e] rounded-t-[14px]', // iOS sheet background
          'shadow-2xl',
          isDragging ? 'transition-none' : 'transition-all duration-300 ease-out',
          className,
        )}
        style={{
          height: sheetHeight,
          transform: `translateY(${Math.max(0, translateY)}px)`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grabber */}
        {showGrabber && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-9 h-[5px] bg-white/30 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex-1">
              {title && (
                <h2 className="text-[17px] font-semibold text-white text-center">{title}</h2>
              )}
              {subtitle && (
                <p className="text-[13px] text-white/60 text-center mt-0.5">{subtitle}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute right-2 top-2 w-[30px] h-[30px] rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
              >
                <span className="text-white/60 text-lg leading-none">&times;</span>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            maxHeight: `calc(${sheetHeight}px - 60px - env(safe-area-inset-bottom))`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
