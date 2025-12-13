import React from 'react';
import { Trash2 } from 'lucide-react';
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete';

interface SwipeableListItemProps {
  children: React.ReactNode;
  onDelete: () => void;
  className?: string;
}

/**
 * Reusable swipeable list item component for mobile
 * Provides swipe-to-delete functionality with visual feedback
 */
export const SwipeableListItem: React.FC<SwipeableListItemProps> = ({
  children,
  onDelete,
  className = '',
}) => {
  const { handlers, swipeState } = useSwipeToDelete({
    onDelete,
  });

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
      }}
    >
      {/* Delete background */}
      <div
        className="absolute inset-0 bg-red-600 flex items-center justify-end px-6"
        style={{
          opacity: swipeState.shouldShowDelete ? 1 : 0,
          transition: swipeState.isSwiping ? 'none' : 'opacity 0.2s ease-out',
        }}
      >
        <Trash2 size={20} className="text-white" />
      </div>

      {/* Main content */}
      <div
        {...handlers}
        style={{
          transform: `translateX(-${swipeState.swipeDistance}px)`,
          transition: swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};
