import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMediaManagement } from '@/hooks/useMediaManagement';
import { useDemoMode } from '@/hooks/useDemoMode';
import { MediaSubTabs } from './MediaSubTabs';
import { MediaGrid } from './media/MediaGrid';
import { StorageQuotaBar } from './StorageQuotaBar';
import { MediaUrlsPanel } from './media/MediaUrlsPanel';
import { MediaSearchBar } from './media/MediaSearchBar';
import { supabase } from '@/integrations/supabase/client';
import { mediaService } from '@/services/mediaService';
import { toast } from 'sonner';
import type { NormalizedUrl } from '@/services/chatUrlExtractor';
import type { MediaSearchResult } from '@/services/mediaSearchService';
import { filterMediaByAITags } from '@/services/mediaAITagging';

interface UnifiedMediaHubProps {
  tripId: string;
  onPromoteToTripLink?: (url: NormalizedUrl) => void;
}

export const UnifiedMediaHub = ({ tripId, onPromoteToTripLink }: UnifiedMediaHubProps) => {
  const [activeTab, setActiveTab] = useState('all');
  const [urlsCount, setUrlsCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaSearchResult[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const { isDemoMode } = useDemoMode();

  const { mediaItems, loading, refetch, hasMoreMedia, fetchNextMediaPage, isFetchingNextMedia } =
    useMediaManagement(tripId);

  // Filter out deleted items for demo mode
  const filteredMediaItems = mediaItems.filter(item => !deletedIds.has(item.id));

  const handleDeleteItem = useCallback(
    async (id: string): Promise<void> => {
      try {
        if (isDemoMode) {
          // In demo mode, just remove from local state
          setDeletedIds(prev => new Set(prev).add(id));
          toast.success('Item deleted (demo mode)');
        } else {
          await mediaService.deleteMedia(id);
          toast.success('Item deleted');
          refetch?.();
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete item');
      }
    },
    [isDemoMode, refetch],
  );

  // Fetch URLs count from trip_link_index (includes both chat and manual links)
  const fetchUrlsCount = useCallback(async () => {
    if (isDemoMode) {
      setUrlsCount(2); // demo placeholder
      return;
    }
    try {
      const { count, error } = await supabase
        .from('trip_link_index')
        .select('*', { count: 'exact', head: true })
        .eq('trip_id', tripId);

      if (!error && count !== null) {
        setUrlsCount(count);
      }
    } catch (err) {
      console.error('Error fetching URLs count:', err);
    }
  }, [tripId, isDemoMode]);

  useEffect(() => {
    fetchUrlsCount();
  }, [fetchUrlsCount]);

  // Realtime: update link count when links are added/removed
  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const channel = supabase
      .channel(`media-hub-links:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_link_index',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          fetchUrlsCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, fetchUrlsCount]);

  // Memoize search-filtered base to avoid recomputing per type
  const searchFilteredItems = useMemo(() => {
    if (searchQuery && searchResults.length > 0) {
      const resultIds = new Set(searchResults.map(r => r.id));
      return filteredMediaItems.filter(item => resultIds.has(item.id));
    } else if (searchQuery) {
      return filterMediaByAITags(filteredMediaItems, searchQuery);
    }
    return filteredMediaItems;
  }, [filteredMediaItems, searchQuery, searchResults]);

  // Memoize per-type filtered results (avoids 5+ filter passes per render)
  const filteredByType = useMemo(
    () => ({
      all: searchFilteredItems,
      photos: searchFilteredItems.filter(item => item.media_type === 'image'),
      videos: searchFilteredItems.filter(item => item.media_type === 'video'),
      files: searchFilteredItems.filter(
        item =>
          item.media_type === 'document' ||
          (item.media_type === 'image' &&
            (item.metadata?.isSchedule || item.metadata?.isReceipt || item.metadata?.isTicket)),
      ),
    }),
    [searchFilteredItems],
  );

  // Memoize badge counts from unfiltered items (not affected by search)
  const typeCounts = useMemo(
    () => ({
      photos: filteredMediaItems.filter(item => item.media_type === 'image').length,
      videos: filteredMediaItems.filter(item => item.media_type === 'video').length,
      files: filteredMediaItems.filter(item => item.media_type === 'document').length,
    }),
    [filteredMediaItems],
  );

  const renderAllItems = () => {
    const filteredItems = filteredByType.all;

    if (filteredMediaItems.length === 0) {
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

    // Show "no results" message when search is active but returns nothing
    if (searchQuery && filteredItems.length === 0) {
      return (
        <div className="text-center py-12">
          <Camera className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Results</h3>
          <p className="text-muted-foreground">
            No media found matching "{searchQuery}". Try a different search term.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredItems.length > 0 && (
          <MediaGrid
            items={filteredItems}
            onDeleteItem={handleDeleteItem}
            onLoadMore={fetchNextMediaPage}
            hasMore={hasMoreMedia}
            isLoadingMore={isFetchingNextMedia}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
        <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
          <div className="h-40 rounded-xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Quota */}
      <StorageQuotaBar tripId={tripId} showDetails={true} />

      {/* Search Bar */}
      <MediaSearchBar
        tripId={tripId}
        onSearchResults={results => {
          setSearchResults(results);
        }}
        onSearchChange={query => {
          setSearchQuery(query);
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-white/5 backdrop-blur-sm">
          <TabsTrigger value="all" className="text-xs">
            All
          </TabsTrigger>
          <TabsTrigger value="photos" className="text-xs">
            Photos
            {typeCounts.photos > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({typeCounts.photos})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs">
            Videos
            {typeCounts.videos > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({typeCounts.videos})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs">
            Files
            {typeCounts.files > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({typeCounts.files})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="urls" className="text-xs">
            Chat Links
            {urlsCount > 0 && <span className="ml-1 text-[10px] opacity-70">({urlsCount})</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {renderAllItems()}
        </TabsContent>

        <TabsContent value="photos" className="mt-6">
          <MediaSubTabs
            items={filteredByType.photos}
            type="photos"
            searchQuery={searchQuery}
            tripId={tripId}
            onMediaUploaded={refetch}
            onDeleteItem={handleDeleteItem}
          />
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <MediaSubTabs
            items={filteredByType.videos}
            type="videos"
            searchQuery={searchQuery}
            tripId={tripId}
            onMediaUploaded={refetch}
            onDeleteItem={handleDeleteItem}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <MediaSubTabs
            items={filteredByType.files}
            type="files"
            searchQuery={searchQuery}
            tripId={tripId}
            onMediaUploaded={refetch}
            onDeleteItem={handleDeleteItem}
          />
        </TabsContent>

        <TabsContent value="urls" className="mt-6">
          <MediaUrlsPanel tripId={tripId} onPromoteToTripLink={onPromoteToTripLink} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
