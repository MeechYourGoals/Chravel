import React from 'react';
import { Trash2 } from 'lucide-react';
import { useLongPress } from '../../hooks/useLongPress';
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete';
import { hapticService } from '../../services/hapticService';
import { TripMediaRenderer } from '../media/TripMediaRenderer';

interface MediaGridItemProps {
  item: {
    id: string;
    type: 'image' | 'video';
    url: string;
  };
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * MediaGridItem - Mobile media grid item using TripMediaRenderer
 * 
 * Uses the canonical TripMediaRenderer for consistent iOS-safe media rendering.
 * Supports swipe-to-delete and long-press gestures.
 */
export const MediaGridItem: React.FC<MediaGridItemProps> = ({ item, onPress, onLongPress }) => {
  const longPressHandlers = useLongPress({
    onLongPress: async () => {
      await hapticService.medium();
      onLongPress();
    },
  });

  const { handlers: swipeHandlers, swipeState } = useSwipeToDelete({
    onDelete: () => {
      onLongPress(); // Trigger the delete confirmation modal
    },
  });

  // Derive MIME type from item type
  const mimeType = item.type === 'video' ? 'video/mp4' : 'image/jpeg';

  return (
    <div
      className="relative overflow-hidden rounded-md"
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none'
      }}
    >
      {/* Delete background that shows when swiping */}
      <div
        className="absolute inset-0 bg-red-600 flex items-center justify-end px-4 rounded-md"
        style={{
          opacity: swipeState.shouldShowDelete ? 1 : 0,
          transition: swipeState.isSwiping ? 'none' : 'opacity 0.2s ease-out',
        }}
      >
        <Trash2 size={24} className="text-white" />
      </div>

      {/* Main content - Using canonical TripMediaRenderer */}
      <button
        {...longPressHandlers}
        {...swipeHandlers}
        onClick={async (e) => {
          // Don't trigger click if we just finished swiping
          if (swipeState.isSwiping) {
            e.preventDefault();
            return;
          }
          await hapticService.light();
          onPress();
        }}
        className="media-grid-item rounded-md bg-white/5 relative"
        style={{
          transform: `translateX(-${swipeState.swipeDistance}px)`,
          transition: swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <TripMediaRenderer
          url={item.url}
          mimeType={mimeType}
          mode="thumbnail"
          className="w-full h-full"
        />
      </button>
    </div>
  );
};
