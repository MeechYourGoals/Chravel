import React, { useState } from 'react';
import { Film, Play, Trash2 } from 'lucide-react';
import { useLongPress } from '../../hooks/useLongPress';
import { useSwipeToDelete } from '../../hooks/useSwipeToDelete';
import { OptimizedImage } from './OptimizedImage';
import { hapticService } from '../../services/hapticService';

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
 * VideoThumbnail - Renders a video thumbnail using the first frame
 * Uses <video preload="metadata"> to load just the poster frame
 * iOS CRITICAL: playsInline prevents fullscreen takeover
 */
const VideoThumbnail: React.FC<{ src: string }> = ({ src }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <Film size={24} className="text-gray-500" />
      </div>
    );
  }

  return (
    <video
      src={src}
      className="w-full h-full object-cover"
      muted
      playsInline
      preload="metadata"
      onError={() => setHasError(true)}
      // Load just enough to show first frame
      onLoadedMetadata={(e) => {
        // Seek to first frame to ensure thumbnail shows
        const video = e.currentTarget;
        if (video.readyState >= 1) {
          video.currentTime = 0.1;
        }
      }}
    />
  );
};

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
        {/* Render video thumbnail for videos, OptimizedImage for images */}
        {item.type === 'video' ? (
          <VideoThumbnail src={item.url} />
        ) : (
          <OptimizedImage
            src={item.url}
            alt="Trip media"
            className="w-full h-full object-cover"
            width={300}
            loading="lazy"
          />
        )}
        
        {/* Play button overlay for videos */}
        {item.type === 'video' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
              <Play size={24} className="text-white drop-shadow-lg" fill="white" />
            </div>
          </div>
        )}
      </button>
    </div>
  );
};
