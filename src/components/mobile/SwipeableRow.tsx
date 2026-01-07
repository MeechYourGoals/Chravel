import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { useSwipeToRevealActions } from '../../hooks/useSwipeToRevealActions';
import { hapticService } from '../../services/hapticService';

interface SwipeableRowProps {
  /** Content to display in the row */
  children: React.ReactNode;
  /** Callback when delete is confirmed */
  onDelete: () => Promise<void> | void;
  /** Optional callback when row opens */
  onOpenRow?: (rowId: string) => void;
  /** Currently open row ID (for single-row-open behavior) */
  openRowId?: string | null;
  /** Unique ID for this row */
  rowId: string;
  /** Whether swipe is disabled (e.g., demo mode) */
  disabled?: boolean;
  /** Optional className for the container */
  className?: string;
  /** Width of the action area (default: 88) */
  actionWidth?: number;
  /** Label for the delete button (default: "Delete") */
  deleteLabel?: string;
  /** Whether to use confirmation step (default: true) */
  requireConfirmation?: boolean;
}

type DeleteState = 'idle' | 'confirming' | 'deleting' | 'deleted';

/**
 * Swipeable row component with iOS-style swipe-to-reveal delete action.
 *
 * Features:
 * - Swipe left to reveal delete button
 * - Tap delete for confirmation (button changes to "Confirm" for 2s)
 * - Smooth delete animation (slide + fade + collapse)
 * - Haptic feedback
 * - Respects reduced motion preferences
 */
export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onDelete,
  onOpenRow,
  openRowId,
  rowId,
  disabled = false,
  className = '',
  actionWidth = 88,
  deleteLabel = 'Delete',
  requireConfirmation = true,
}) => {
  const [deleteState, setDeleteState] = useState<DeleteState>('idle');
  const [isCollapsing, setIsCollapsing] = useState(false);
  const [rowHeight, setRowHeight] = useState<number | undefined>(undefined);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const { handlers, state, close, contentStyle, actionsStyle, shouldPreventClick } =
    useSwipeToRevealActions({
      onOpen: () => {
        onOpenRow?.(rowId);
      },
      actionWidth,
      disabled: disabled || deleteState === 'deleting' || deleteState === 'deleted',
      rowId,
      openRowId,
    });

  // Clear confirmation timeout on unmount
  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  // Reset confirmation state when row closes
  useEffect(() => {
    if (!state.isOpen && deleteState === 'confirming') {
      setDeleteState('idle');
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = null;
      }
    }
  }, [state.isOpen, deleteState]);

  const handleDeleteClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();

      if (deleteState === 'deleting' || deleteState === 'deleted') {
        return;
      }

      if (requireConfirmation && deleteState === 'idle') {
        // First tap: show confirmation
        setDeleteState('confirming');
        hapticService.light();

        // Auto-reset to idle after 2 seconds
        confirmTimeoutRef.current = setTimeout(() => {
          setDeleteState('idle');
          confirmTimeoutRef.current = null;
        }, 2000);
        return;
      }

      // Second tap (or no confirmation required): execute delete
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
        confirmTimeoutRef.current = null;
      }

      setDeleteState('deleting');
      hapticService.medium();

      // Measure current height for collapse animation
      if (rowRef.current) {
        setRowHeight(rowRef.current.offsetHeight);
      }

      try {
        await onDelete();
        setDeleteState('deleted');

        // Animate collapse
        requestAnimationFrame(() => {
          setIsCollapsing(true);
        });
      } catch {
        // Revert on error
        setDeleteState('idle');
        close();
      }
    },
    [deleteState, requireConfirmation, onDelete, close],
  );

  // Handle click on content - check if we should prevent it
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (shouldPreventClick()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [shouldPreventClick],
  );

  // Handle click outside to close
  useEffect(() => {
    if (!state.isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        close();
      }
    };

    // Delay adding listener to avoid immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [state.isOpen, close]);

  // Animation classes based on reduced motion
  const transitionDuration = prefersReducedMotion ? '100ms' : '250ms';

  // Container styles for delete animation
  const containerStyle: React.CSSProperties = isCollapsing
    ? {
        height: 0,
        opacity: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: 'hidden',
        transition: `all ${transitionDuration} ease-out`,
      }
    : rowHeight !== undefined
      ? { height: rowHeight, overflow: 'hidden' }
      : {};

  // Content slide animation for delete
  const deleteContentStyle: React.CSSProperties =
    deleteState === 'deleting' || deleteState === 'deleted'
      ? {
          ...contentStyle,
          transform: `translateX(${state.offsetX - 50}px)`,
          opacity: 0.5,
          transition: `all ${transitionDuration} ease-out`,
        }
      : contentStyle;

  if (disabled) {
    // When disabled, render children directly without swipe
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={rowRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        ...containerStyle,
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Action area (delete button) */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600"
        style={actionsStyle}
        aria-hidden={!state.isOpen}
      >
        <button
          onClick={handleDeleteClick}
          disabled={deleteState === 'deleting' || deleteState === 'deleted'}
          className={`
            flex flex-col items-center justify-center w-full h-full
            text-white font-medium text-xs
            transition-colors duration-150
            ${deleteState === 'confirming' ? 'bg-red-700' : 'bg-red-600'}
            ${deleteState === 'deleting' ? 'opacity-50' : ''}
            active:bg-red-800
          `}
          aria-label={deleteState === 'confirming' ? 'Confirm delete' : deleteLabel}
        >
          <Trash2
            size={20}
            className={`mb-1 ${deleteState === 'confirming' ? 'animate-pulse' : ''}`}
          />
          <span className="whitespace-nowrap">
            {deleteState === 'confirming' ? 'Confirm' : deleteLabel}
          </span>
        </button>
      </div>

      {/* Main content */}
      <div
        {...handlers}
        onClick={handleContentClick}
        style={deleteContentStyle}
        className="relative bg-inherit"
      >
        {children}
      </div>
    </div>
  );
};
