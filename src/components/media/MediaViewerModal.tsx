/**
 * MediaViewerModal - iOS-safe fullscreen viewer with swipe navigation
 *
 * Features:
 * - iOS safe area insets for buttons (avoids status bar/notch)
 * - Swipe left/right to navigate between photos
 * - Image counter (1/5, 2/5, etc.)
 * - Download and close buttons always tappable
 * - Works in portrait and landscape modes
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Download, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface MediaViewerItem {
  id?: string;
  url: string;
  mimeType: string;
  fileName?: string | null;
  metadata?: unknown;
}

interface MediaViewerModalProps {
  /** Array of media items to navigate through */
  items: MediaViewerItem[];
  /** Initial index to show */
  initialIndex: number;
  /** Callback to close the modal */
  onClose: () => void;
  /** Optional callback when index changes */
  onIndexChange?: (index: number) => void;
}

function getMediaCategory(mimeType: string): 'video' | 'image' | 'document' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  items,
  initialIndex,
  onClose,
  onIndexChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [hasError, setHasError] = useState(false);
  const [direction, setDirection] = useState(0);

  // Touch gesture tracking
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[currentIndex];
  const category = currentItem ? getMediaCategory(currentItem.mimeType) : 'document';
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < items.length - 1;

  // Reset error state when item changes
  useEffect(() => {
    setHasError(false);
  }, [currentIndex]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      setDirection(-1);
      setCurrentIndex(prev => {
        const newIndex = prev - 1;
        onIndexChange?.(newIndex);
        return newIndex;
      });
    }
  }, [canGoPrev, onIndexChange]);

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setDirection(1);
      setCurrentIndex(prev => {
        const newIndex = prev + 1;
        onIndexChange?.(newIndex);
        return newIndex;
      });
    }
  }, [canGoNext, onIndexChange]);

  // Touch handlers for swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant and significant
    const minSwipeDistance = 50;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [goToPrev, goToNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, onClose]);

  if (!currentItem) {
    onClose();
    return null;
  }

  // Animation variants for swipe transitions
  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button - iOS safe area aware */}
      <button
        className="absolute right-4 z-20 text-white bg-white/20 rounded-full p-3 hover:bg-white/30 transition-colors backdrop-blur-sm"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close viewer"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Download button - iOS safe area aware */}
      <a
        href={currentItem.url}
        download={currentItem.fileName || 'media'}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-4 z-20 text-white bg-white/20 rounded-full p-3 hover:bg-white/30 transition-colors backdrop-blur-sm"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        onClick={(e) => e.stopPropagation()}
        aria-label="Download media"
      >
        <Download className="w-6 h-6" />
      </a>

      {/* Image counter - centered below buttons */}
      {items.length > 1 && (
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-20 text-white/80 text-sm font-medium bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 20px)' }}
        >
          {currentIndex + 1} / {items.length}
        </div>
      )}

      {/* Navigation arrows (visible on larger screens) */}
      {canGoPrev && (
        <button
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors hidden sm:flex"
          onClick={(e) => {
            e.stopPropagation();
            goToPrev();
          }}
          aria-label="Previous image"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {canGoNext && (
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors hidden sm:flex"
          onClick={(e) => {
            e.stopPropagation();
            goToNext();
          }}
          aria-label="Next image"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Error state with download fallback */}
      {hasError && (
        <div className="flex flex-col items-center justify-center p-8">
          <AlertCircle className="w-12 h-12 text-orange-400 mb-4" />
          <p className="text-white text-lg mb-4">Unable to preview</p>
          <a
            href={currentItem.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-5 h-5" />
            Download instead
          </a>
        </div>
      )}

      {/* Media content with swipe animation */}
      {!hasError && (
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.2 }}
            className="flex items-center justify-center w-full h-full px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Video player - iOS CRITICAL: muted required for autoplay */}
            {category === 'video' && (
              <video
                src={currentItem.url}
                controls
                autoPlay
                playsInline
                muted
                controlsList="nodownload"
                preload="metadata"
                className="max-w-full max-h-full"
                style={{
                  maxWidth: '95vw',
                  maxHeight: 'calc(95vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
                  width: 'auto',
                  height: 'auto',
                }}
                onError={() => setHasError(true)}
              />
            )}

            {/* Image viewer */}
            {category === 'image' && (
              <img
                src={currentItem.url}
                alt={currentItem.fileName || 'Trip media'}
                className="max-w-full max-h-full object-contain select-none"
                style={{
                  maxWidth: '95vw',
                  maxHeight: 'calc(95vh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))',
                }}
                draggable={false}
                onError={() => setHasError(true)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Swipe hint for mobile (shown briefly on first open) */}
      {items.length > 1 && (
        <div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 text-white/60 text-xs sm:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
        >
          Swipe to navigate
        </div>
      )}
    </div>
  );
};

export default MediaViewerModal;
