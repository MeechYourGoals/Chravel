import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useSwipeToRevealActions } from '../../hooks/useSwipeToRevealActions';
import { useSwipeableRowContext } from '../../contexts/SwipeableRowContext';
import { useIsMobile } from '../../hooks/use-mobile';
import { hapticService } from '../../services/hapticService';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface SwipeableRowProps {
  /** Unique identifier for this row */
  id: string;
  /** Content to render inside the swipeable row */
  children: React.ReactNode;
  /** Called when delete is confirmed */
  onDelete: () => void | Promise<void>;
  /** Title shown in delete confirmation dialog */
  deleteTitle?: string;
  /** Description shown in delete confirmation dialog */
  deleteDescription?: string;
  /** Whether this row can be deleted (disable swipe if false) */
  canDelete?: boolean;
  /** Additional class name for the container */
  className?: string;
  /** Called when the row is clicked (not swiped) */
  onClick?: () => void;
}

/**
 * iOS-style swipeable row component.
 *
 * Features:
 * - Swipe left to reveal delete button
 * - Tap delete button to show confirmation dialog
 * - Tap-to-navigate still works (click is not triggered after swipe)
 * - Only one row open at a time (via context)
 * - Smooth animations with reduced motion support
 * - Desktop: no swipe behavior, unchanged appearance
 */
export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  id,
  children,
  onDelete,
  deleteTitle = 'Delete?',
  deleteDescription = 'This action cannot be undone.',
  canDelete = true,
  className = '',
  onClick,
}) => {
  const isMobile = useIsMobile();
  const { openRowId, setOpenRow, closeOpenRow, shouldForceClose } = useSwipeableRowContext();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if this row should be forced closed (another row opened)
  const forceClose = shouldForceClose(id);

  const {
    handlers,
    swipeState,
    close,
    resetSwipeFlag,
    getContentStyle,
    getActionStyle,
    actionWidth,
  } = useSwipeToRevealActions({
    disabled: !canDelete || !isMobile,
    forceClose,
    onOpen: () => setOpenRow(id),
    onClose: () => {
      if (openRowId === id) {
        closeOpenRow();
      }
    },
  });

  // Detect reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      : false;

  // Close on outside click/touch
  useEffect(() => {
    if (!swipeState.isOpen || !isMobile) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    // Delay adding listener to avoid immediate close from the same tap
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleOutsideClick, { passive: true });
      document.addEventListener('touchstart', handleOutsideClick, { passive: true });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [swipeState.isOpen, close, isMobile]);

  // Handle content click (navigate to trip)
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't navigate if we just swiped
      if (swipeState.didSwipe) {
        e.preventDefault();
        e.stopPropagation();
        resetSwipeFlag();
        return;
      }

      // Close if open and user taps content
      if (swipeState.isOpen) {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }

      // Normal click - call onClick handler
      onClick?.();
    },
    [swipeState.didSwipe, swipeState.isOpen, resetSwipeFlag, close, onClick],
  );

  // Handle delete button tap
  const handleDeleteTap = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    hapticService.medium();
    setShowConfirmDialog(true);
  }, []);

  // Handle delete confirmation
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    hapticService.heavy();

    try {
      await onDelete();
      setShowConfirmDialog(false);
      close();
    } catch (error) {
      // Error handling is done by parent component (toast, etc.)
      setIsDeleting(false);
    }
  }, [onDelete, close]);

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    if (!isDeleting) {
      setShowConfirmDialog(false);
    }
  }, [isDeleting]);

  // Desktop: render without swipe functionality
  if (!isMobile) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    );
  }

  // Get styles with reduced motion support
  const contentStyle = getContentStyle();
  const actionStyle = getActionStyle();

  if (prefersReducedMotion) {
    // Simplified transitions for reduced motion
    contentStyle.transition = swipeState.isDragging ? 'none' : 'transform 0.1s linear';
    actionStyle.transition = 'none';
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`relative overflow-hidden touch-pan-y ${className}`}
        style={{
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Action area (revealed behind content) */}
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600"
          style={{
            width: `${actionWidth}px`,
            ...actionStyle,
          }}
        >
          <button
            onClick={handleDeleteTap}
            className="flex flex-col items-center justify-center w-full h-full text-white active:bg-red-700 transition-colors"
            aria-label="Delete"
          >
            <Trash2 size={22} className="mb-1" />
            <span className="text-xs font-medium">Delete</span>
          </button>
        </div>

        {/* Main content */}
        <div
          {...handlers}
          onClick={handleContentClick}
          style={{
            ...contentStyle,
            backgroundColor: 'inherit', // Ensure content covers action area when closed
          }}
          className="relative"
        >
          {/* Content wrapper with background to cover action area */}
          <div className="bg-background">{children}</div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={handleDialogClose}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-muted-foreground">
              {deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDialogClose} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/80 text-destructive-foreground"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SwipeableRow;
