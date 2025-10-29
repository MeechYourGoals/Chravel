import React, { useState, useEffect } from 'react';
import { Camera, Upload, Image as ImageIcon, Film } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { hapticService } from '../../services/hapticService';
import { capacitorIntegration } from '../../services/capacitorIntegration';
import { StorageQuotaBar } from '../StorageQuotaBar';
import { useMediaManagement } from '../../hooks/useMediaManagement';
import { useDemoMode } from '../../hooks/useDemoMode';
import { MediaGridItem } from './MediaGridItem';

interface MediaItem {
  id: string;
  type: 'image' | 'video' | 'file';
  url: string;
  thumbnail?: string;
  uploadedBy: string;
  uploadedAt: Date;
  filename?: string;
  fileSize?: string;
}

interface MobileUnifiedMediaHubProps {
  tripId: string;
}

export const MobileUnifiedMediaHub = ({ tripId }: MobileUnifiedMediaHubProps) => {
  const { isDemoMode } = useDemoMode();
  const { mediaItems: realMediaItems, loading, refetch } = useMediaManagement(tripId);
  const [selectedTab, setSelectedTab] = useState<'all' | 'photos' | 'videos' | 'files'>('all');

  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    }
  });

  // Convert media items to unified format
  const mediaItems: MediaItem[] = realMediaItems
    .filter(item => item.media_type === 'image' || item.media_type === 'video')
    .map(item => ({
      id: item.id,
      type: item.media_type === 'video' ? 'video' : 'image',
      url: item.media_url,
      uploadedBy: 'User',
      uploadedAt: new Date(item.created_at)
    }));

  const filteredMedia = mediaItems.filter(item => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'photos') return item.type === 'image';
    if (selectedTab === 'videos') return item.type === 'video';
    if (selectedTab === 'files') return item.type === 'file';
    return true;
  });

  const handleTakePicture = async () => {
    await hapticService.medium();
    try {
      const result = await capacitorIntegration.takePicture();
      if (result) {
        console.log('Photo captured:', result);
        // Upload logic here
      }
    } catch (error) {
      console.error('Error taking picture:', error);
    }
  };

  const handleSelectImage = async () => {
    await hapticService.medium();
    try {
      const result = await capacitorIntegration.selectImage();
      if (result) {
        console.log('Image selected:', result);
        // Upload logic here
      }
    } catch (error) {
      console.error('Error selecting image:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={80}
      />

      {/* Action Buttons */}
      <div className="px-4 py-4 border-b border-white/10 safe-container">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleTakePicture}
            className="native-button flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-xl font-medium shadow-lg"
          >
            <Camera size={20} />
            <span>Take Photo</span>
          </button>
          <button
            onClick={handleSelectImage}
            className="native-button flex items-center justify-center gap-2 bg-white/10 text-white px-4 py-3 rounded-xl font-medium backdrop-blur-sm"
          >
            <Upload size={20} />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Storage Quota Bar */}
      <div className="px-4 py-3 border-b border-white/10 safe-container">
        <StorageQuotaBar tripId={tripId} showDetails={true} />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 px-4 py-3 border-b border-white/10 safe-container overflow-x-auto native-scroll scrollbar-hide">
        {(['all', 'photos', 'videos', 'files'] as const).map((tab) => (
          <button
            key={tab}
            onClick={async () => {
              await hapticService.light();
              setSelectedTab(tab);
            }}
            className={`
              native-tab px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0
              ${
                selectedTab === tab
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/10 text-gray-300'
              }
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      <div 
        className="flex-1 overflow-y-auto px-2 py-2 native-scroll safe-container-bottom"
        style={{ 
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain'
        }}
      >
        {loading ? (
          <div className="media-grid">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-white/5 skeleton-shimmer" />
            ))}
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="ios-bounce">
              <ImageIcon size={48} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2 font-medium">No media yet</p>
              <p className="text-sm text-gray-500">Tap the camera button to add photos</p>
            </div>
          </div>
        ) : (
          <div className="media-grid animate-fade-in">
            {filteredMedia
              .filter((item): item is MediaItem & { type: 'image' | 'video' } => 
                item.type === 'image' || item.type === 'video'
              )
              .map((item, index) => (
              <div 
                key={item.id}
                style={{ 
                  animationDelay: `${index * 30}ms`,
                  animation: 'fade-in 0.3s ease-out both'
                }}
              >
                <MediaGridItem
                  item={item}
                  onPress={() => {
                    console.log('Open fullscreen viewer for:', item.id);
                  }}
                  onLongPress={() => {
                    console.log('Show options menu for:', item.id);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
