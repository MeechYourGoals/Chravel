import React, { useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaManagement } from '@/hooks/useMediaManagement';
import { MediaSubTabs } from './MediaSubTabs';
import { MediaGrid } from './media/MediaGrid';
import { StorageQuotaBar } from './StorageQuotaBar';
import { Badge } from '@/components/ui/badge';
import { MediaUrlsPanel, PromotePrefill } from '@/components/media/MediaUrlsPanel';

interface UnifiedMediaHubProps {
  tripId: string;
  onPromoteToTripLink?: (prefill: PromotePrefill) => void;
}

export const UnifiedMediaHub = ({ tripId, onPromoteToTripLink }: UnifiedMediaHubProps) => {
  const [activeTab, setActiveTab] = useState('all');
  const [urlsCount, setUrlsCount] = useState(0);
  
  const {
    mediaItems,
    loading
  } = useMediaManagement(tripId);

  const filterMediaByType = (type: string) => {
    if (type === 'all') return mediaItems;
    if (type === 'photos') return mediaItems.filter(item => item.media_type === 'image');
    if (type === 'videos') return mediaItems.filter(item => item.media_type === 'video');
    if (type === 'files') return mediaItems.filter(item => item.media_type === 'document');
    return mediaItems;
  };

  const counts = useMemo(() => {
    const photos = mediaItems.filter(item => item.media_type === 'image').length;
    const videos = mediaItems.filter(item => item.media_type === 'video').length;
    const files = mediaItems.filter(item => item.media_type === 'document' || (item.media_type === 'image' && (item.metadata?.isSchedule || item.metadata?.isReceipt))).length;
    const urls = urlsCount;
    const all = photos + videos + files + urls;
    return { photos, videos, files, urls, all };
  }, [mediaItems, urlsCount]);

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
          <TabsTrigger value="all" className="text-xs flex items-center gap-1">
            <span>All</span>
            <Badge variant="outline" className="text-[10px] px-1">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs flex items-center gap-1">
            <span>Photos</span>
            <Badge variant="outline" className="text-[10px] px-1">{counts.photos}</Badge>
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs flex items-center gap-1">
            <span>Videos</span>
            <Badge variant="outline" className="text-[10px] px-1">{counts.videos}</Badge>
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs flex items-center gap-1">
            <span>Files</span>
            <Badge variant="outline" className="text-[10px] px-1">{counts.files}</Badge>
          </TabsTrigger>
          {import.meta.env.VITE_FEATURE_MEDIA_URLS !== 'false' && (
            <TabsTrigger value="urls" className="text-xs flex items-center gap-1">
              <span>URLs</span>
              <Badge variant="outline" className="text-[10px] px-1">{counts.urls}</Badge>
            </TabsTrigger>
          )}
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

        {import.meta.env.VITE_FEATURE_MEDIA_URLS !== 'false' && (
          <TabsContent value="urls" className="mt-6">
            <MediaUrlsPanel tripId={tripId} onPromoteToTripLink={onPromoteToTripLink} onCount={setUrlsCount} />
          </TabsContent>
        )}
      </Tabs>

    </div>
  );
};