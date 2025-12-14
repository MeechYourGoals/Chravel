import React from 'react';
import { Film, Trash2 } from 'lucide-react';
import { useLongPress } from '../../hooks/useLongPress';
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete';
import { OptimizedImage } from './OptimizedImage';
import { hapticService } from '../../services/hapticService';
import { useResolvedTripMediaUrl } from '@/hooks/useResolvedTripMediaUrl';

interface MediaGridItemProps {
  item: {
    id: string;
    type: 'image' | 'video';
    url: string;
    metadata?: unknown;
  };
  onPress: () => void;
  onLongPress: () => void;
}

export const MediaGridItem: React.FC<MediaGridItemProps> = ({ item, onPress, onLongPress }) => {
  const resolvedUrl = useResolvedTripMediaUrl({ url: item.url, metadata: item.metadata });
  const effectiveUrl = resolvedUrl ?? item.url;

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

      {/* Main content */}
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
        <OptimizedImage
          src={effectiveUrl}
          alt="Trip media"
          className="w-full h-full object-cover"
          width={300}
          loading="lazy"
        />
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
              <Film size={20} className="text-white drop-shadow-lg" />
            </div>
          </div>
        )}
      </button>
    </div>
  );
};
