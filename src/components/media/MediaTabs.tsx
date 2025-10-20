import React from 'react';
import { Camera, Video, FileText, Link, Loader2 } from 'lucide-react';
import { useMediaSync } from '@/hooks/useMediaSync';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MediaGrid } from './MediaGrid';
import { MediaFilters } from './MediaFilters';

interface MediaTabsProps {
  tripId: string;
  onAddMedia?: (type: 'image' | 'video' | 'file' | 'link') => void;
}

export function MediaTabs({ tripId, onAddMedia }: MediaTabsProps) {
  const { images, videos, files, links, mediaCounts, isLoading, error, refreshMedia } = useMediaSync(tripId);
  const [activeTab, setActiveTab] = React.useState<'all' | 'photos' | 'videos' | 'files' | 'links'>('all');
  const [filterQuery, setFilterQuery] = React.useState('');

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-red-500 mb-4">Failed to load media: {error}</p>
        <button 
          onClick={refreshMedia}
          className="text-blue-500 hover:text-blue-400 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isLoading && mediaCounts.all === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-gray-500" size={24} />
      </div>
    );
  }

  // Filter items based on search query
  const filterItems = (items: any[]) => {
    if (!filterQuery) return items;
    const query = filterQuery.toLowerCase();
    return items.filter(item => {
      const filename = item.filename?.toLowerCase() || '';
      const name = item.name?.toLowerCase() || '';
      const title = item.title?.toLowerCase() || '';
      const url = item.url?.toLowerCase() || '';
      return filename.includes(query) || name.includes(query) || title.includes(query) || url.includes(query);
    });
  };

  const filteredImages = filterItems(images);
  const filteredVideos = filterItems(videos);
  const filteredFiles = filterItems(files);
  const filteredLinks = filterItems(links);

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-semibold">Media Gallery</h2>
        <MediaFilters onSearch={setFilterQuery} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all" className="flex items-center gap-2">
            All
            {mediaCounts.all > 0 && (
              <Badge variant="secondary" className="ml-1">{mediaCounts.all}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Camera size={16} />
            Photos
            {mediaCounts.photos > 0 && (
              <Badge variant="secondary" className="ml-1">{mediaCounts.photos}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video size={16} />
            Videos
            {mediaCounts.videos > 0 && (
              <Badge variant="secondary" className="ml-1">{mediaCounts.videos}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileText size={16} />
            Files
            {mediaCounts.files > 0 && (
              <Badge variant="secondary" className="ml-1">{mediaCounts.files}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center gap-2">
            <Link size={16} />
            Links
            {mediaCounts.links > 0 && (
              <Badge variant="secondary" className="ml-1">{mediaCounts.links}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All content */}
        <TabsContent value="all" className="mt-6">
          <div className="space-y-8">
            {filteredImages.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Camera size={20} />
                  Photos ({filteredImages.length})
                </h3>
                <MediaGrid items={filteredImages} type="image" />
              </section>
            )}
            
            {filteredVideos.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Video size={20} />
                  Videos ({filteredVideos.length})
                </h3>
                <MediaGrid items={filteredVideos} type="video" />
              </section>
            )}
            
            {filteredFiles.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Files ({filteredFiles.length})
                </h3>
                <div className="space-y-2">
                  {filteredFiles.map(file => (
                    <FileItem key={file.id} file={file} />
                  ))}
                </div>
              </section>
            )}
            
            {filteredLinks.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Link size={20} />
                  Links ({filteredLinks.length})
                </h3>
                <div className="space-y-2">
                  {filteredLinks.map(link => (
                    <LinkItem key={link.id} link={link} />
                  ))}
                </div>
              </section>
            )}
            
            {mediaCounts.all === 0 && (
              <EmptyState onAddMedia={onAddMedia} />
            )}
          </div>
        </TabsContent>

        {/* Photos only */}
        <TabsContent value="photos" className="mt-6">
          {filteredImages.length > 0 ? (
            <MediaGrid items={filteredImages} type="image" />
          ) : (
            <EmptyState type="photos" onAddMedia={onAddMedia} />
          )}
        </TabsContent>

        {/* Videos only */}
        <TabsContent value="videos" className="mt-6">
          {filteredVideos.length > 0 ? (
            <MediaGrid items={filteredVideos} type="video" />
          ) : (
            <EmptyState type="videos" onAddMedia={onAddMedia} />
          )}
        </TabsContent>

        {/* Files only */}
        <TabsContent value="files" className="mt-6">
          {filteredFiles.length > 0 ? (
            <div className="space-y-2">
              {filteredFiles.map(file => (
                <FileItem key={file.id} file={file} />
              ))}
            </div>
          ) : (
            <EmptyState type="files" onAddMedia={onAddMedia} />
          )}
        </TabsContent>

        {/* Links only */}
        <TabsContent value="links" className="mt-6">
          {filteredLinks.length > 0 ? (
            <div className="space-y-2">
              {filteredLinks.map(link => (
                <LinkItem key={link.id} link={link} />
              ))}
            </div>
          ) : (
            <EmptyState type="links" onAddMedia={onAddMedia} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// File item component
function FileItem({ file }: { file: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
      <div className="flex items-center gap-3">
        <FileText className="text-gray-400" size={20} />
        <div>
          <p className="font-medium">{file.name}</p>
          <p className="text-sm text-gray-400">
            {new Date(file.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <a
        href={`/api/files/${file.id}`}
        download
        className="text-blue-400 hover:text-blue-300"
      >
        Download
      </a>
    </div>
  );
}

// Link item component
function LinkItem({ link }: { link: any }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
    >
      <div className="flex items-start gap-3">
        {link.og_image_url && (
          <img
            src={link.og_image_url}
            alt={link.og_title || 'Link preview'}
            className="w-20 h-20 rounded object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{link.og_title || link.domain}</h4>
          {link.og_description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{link.og_description}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">{link.domain}</p>
        </div>
        <Link className="text-gray-400 flex-shrink-0" size={16} />
      </div>
    </a>
  );
}

// Empty state component
function EmptyState({ type, onAddMedia }: { type?: string; onAddMedia?: any }) {
  const icons = {
    photos: Camera,
    videos: Video,
    files: FileText,
    links: Link,
  };
  
  const Icon = type ? icons[type as keyof typeof icons] : Camera;
  const message = type 
    ? `No ${type} yet. Share some in the chat!`
    : 'No media yet. Start sharing photos, videos, files, or links in the chat!';

  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
      <p className="text-gray-400">{message}</p>
      {onAddMedia && type && (
        <button
          onClick={() => onAddMedia(type as any)}
          className="mt-4 text-blue-400 hover:text-blue-300"
        >
          Add {type}
        </button>
      )}
    </div>
  );
}