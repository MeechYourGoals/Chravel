import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaManagement } from '@/hooks/useMediaManagement';
import { MediaSubTabs } from './MediaSubTabs';
import { MediaGrid } from './media/MediaGrid';
import { StorageQuotaBar } from './StorageQuotaBar';
import { MediaUrlsPanel } from './media/MediaUrlsPanel';
import { extractUrlsFromTripChat } from '@/services/chatUrlExtractor';
import type { NormalizedUrl } from '@/services/chatUrlExtractor';

interface UnifiedMediaHubProps {
  tripId: string;
  onPromoteToTripLink?: (url: NormalizedUrl) => void;
}

export const UnifiedMediaHub = ({ tripId, onPromoteToTripLink }: UnifiedMediaHubProps) => {
  const [activeTab, setActiveTab] = useState('all');
  const [urlsCount, setUrlsCount] = useState(0);
  
  const {
    mediaItems,
    loading
  } = useMediaManagement(tripId);

  // Fetch URLs count
  useEffect(() => {
    const fetchUrlsCount = async () => {
      try {
        const urls = await extractUrlsFromTripChat(tripId);
        setUrlsCount(urls.length);
      } catch (error) {
        console.error('Error fetching URLs count:', error);
      }
    };
    fetchUrlsCount();
  }, [tripId]);

  const filterMediaByType = (type: string) => {
    if (type === 'all') return mediaItems;
    if (type === 'photos') return mediaItems.filter(item => item.media_type === 'image');
    if (type === 'videos') return mediaItems.filter(item => item.media_type === 'video');
    if (type === 'files') return mediaItems.filter(item => item.media_type === 'document');
    return mediaItems;
  };

  const renderAllItems = () => {
    if (mediaItems.length === 0) {
      return (
        <div className="text-center py-12">
          <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Media Yet</h3>
          <p className="text-muted-foreground">
            Photos, videos, and files shared in chat or uploaded will appear here automatically
          </p>
        </div>
      );
    }

    const displayItems = mediaItems.slice(0, 8);

    return (
      <div className="space-y-4">
        {displayItems.length > 0 && <MediaGrid items={displayItems} />}
        {mediaItems.length > 8 && (
          <p className="text-center text-gray-400 text-sm">
            Showing 8 of {mediaItems.length} items • Use tabs above to filter by type
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Quota */}
      <StorageQuotaBar tripId={tripId} showDetails={true} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/5 backdrop-blur-sm">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="photos" className="text-xs">
            Photos
            {mediaItems.filter(item => item.media_type === 'image').length > 0 && (
              <span className="ml-1 text-[10px] opacity-70">
                ({mediaItems.filter(item => item.media_type === 'image').length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs">
            Videos
            {mediaItems.filter(item => item.media_type === 'video').length > 0 && (
              <span className="ml-1 text-[10px] opacity-70">
                ({mediaItems.filter(item => item.media_type === 'video').length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs">
            Files
            {mediaItems.filter(item => item.media_type === 'document').length > 0 && (
              <span className="ml-1 text-[10px] opacity-70">
                ({mediaItems.filter(item => item.media_type === 'document').length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="urls" className="text-xs">
            URLs
            {urlsCount > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({urlsCount})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderAllItems()}
        </TabsContent>
        
        <TabsContent value="photos" className="mt-6">
          <MediaSubTabs items={mediaItems.filter(item => item.media_type === 'image')} type="photos" />
        </TabsContent>
        
        <TabsContent value="videos" className="mt-6">
          <MediaSubTabs items={mediaItems.filter(item => item.media_type === 'video')} type="videos" />
        </TabsContent>
        
        <TabsContent value="files" className="mt-6">
          <MediaSubTabs items={mediaItems.filter(item => 
            item.media_type === 'document' || 
            (item.media_type === 'image' && (item.metadata?.isSchedule || item.metadata?.isReceipt))
          )} type="files" />
        </TabsContent>

        <TabsContent value="urls" className="mt-6">
          <MediaUrlsPanel tripId={tripId} onPromoteToTripLink={onPromoteToTripLink} />
        </TabsContent>
      </Tabs>

    </div>
  );
};