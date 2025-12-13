import React from 'react';
import { Camera, Video, FileText, Loader2, Link, ExternalLink, Globe, Trash2 } from 'lucide-react';
import { useMediaSync } from '@/hooks/useMediaSync';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MediaGrid } from './MediaGrid';
import { MediaFilters } from './MediaFilters';
import { Button } from '@/components/ui/button';

interface MediaTabsProps {
  tripId: string;
  onAddMedia?: (type: 'image' | 'video' | 'file') => void;
}

export function MediaTabs({ tripId, onAddMedia }: MediaTabsProps) {
  const {
    images,
    videos,
    files,
    links,
    mediaCounts,
    isLoading,
    isDeleting,
    error,
    refreshMedia,
    deleteMedia,
    deleteFile,
    deleteLink,
  } = useMediaSync(tripId);
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
        <MediaFilters activeFilter={activeTab} onFilterChange={(filter) => setActiveTab(filter)} />
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
                <MediaGrid
                  items={filteredImages}
                  onDeleteItem={deleteMedia}
                  isDeleting={isDeleting}
                />
              </section>
            )}

            {filteredVideos.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Video size={20} />
                  Videos ({filteredVideos.length})
                </h3>
                <MediaGrid
                  items={filteredVideos}
                  onDeleteItem={deleteMedia}
                  isDeleting={isDeleting}
                />
              </section>
            )}
            
            {filteredFiles.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Files ({filteredFiles.length})
                </h3>
                <div className="space-y-2">
                  {filteredFiles.map((file) => (
                    <FileItem
                      key={file.id}
                      file={file}
                      onDelete={deleteFile}
                      isDeleting={isDeleting}
                    />
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
                  {filteredLinks.map((link) => (
                    <LinkItem
                      key={link.id}
                      link={link}
                      onDelete={deleteLink}
                      isDeleting={isDeleting}
                    />
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
            <MediaGrid
              items={filteredImages}
              onDeleteItem={deleteMedia}
              isDeleting={isDeleting}
            />
          ) : (
            <EmptyState type="photos" onAddMedia={onAddMedia} />
          )}
        </TabsContent>

        {/* Videos only */}
        <TabsContent value="videos" className="mt-6">
          {filteredVideos.length > 0 ? (
            <MediaGrid
              items={filteredVideos}
              onDeleteItem={deleteMedia}
              isDeleting={isDeleting}
            />
          ) : (
            <EmptyState type="videos" onAddMedia={onAddMedia} />
          )}
        </TabsContent>

        {/* Files only */}
        <TabsContent value="files" className="mt-6">
          {filteredFiles.length > 0 ? (
            <div className="space-y-2">
              {filteredFiles.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  onDelete={deleteFile}
                  isDeleting={isDeleting}
                />
              ))}
            </div>
          ) : (
            <EmptyState type="files" onAddMedia={onAddMedia} />
          )}
        </TabsContent>

        {/* Links only */}
        <TabsContent value="links" className="mt-6">
          {filteredLinks.length > 0 ? (
            <div className="space-y-3">
              {filteredLinks.map((link) => (
                <LinkItem
                  key={link.id}
                  link={link}
                  onDelete={deleteLink}
                  isDeleting={isDeleting}
                />
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

// File item component with delete button
function FileItem({
  file,
  onDelete,
  isDeleting,
}: {
  file: { id: string; name?: string; created_at: string };
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}) {
  const [showConfirm, setShowConfirm] = React.useState(false);

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="text-gray-400 flex-shrink-0" size={20} />
          <div className="min-w-0">
            <p className="font-medium truncate">{file.name || 'File'}</p>
            <p className="text-sm text-gray-400">
              {new Date(file.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/files/${file.id}`}
            download
            className="text-blue-400 hover:text-blue-300"
          >
            Download
          </a>
          {onDelete && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Delete file"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-white font-semibold">Delete file?</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              This will permanently remove &quot;{file.name || 'this file'}&quot; from the trip.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onDelete?.(file.id);
                }}
                className="bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 flex items-center justify-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Link item component with delete button
function LinkItem({
  link,
  onDelete,
  isDeleting,
}: {
  link: {
    id: string;
    url?: string;
    domain?: string;
    og_title?: string;
    og_description?: string;
    created_at: string;
  };
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}) {
  const [showConfirm, setShowConfirm] = React.useState(false);

  const getDomainIcon = (domain: string) => {
    if (domain?.includes('youtube')) return '🎬';
    if (domain?.includes('instagram')) return '📸';
    if (domain?.includes('maps.google') || domain?.includes('googlemaps')) return '📍';
    if (domain?.includes('booking') || domain?.includes('airbnb')) return '🏨';
    return null;
  };

  const domainIcon = getDomainIcon(link.domain ?? '');
  const displayTitle = link.og_title || link.domain || 'Link';

  return (
    <>
      <div className="flex items-start justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            {domainIcon ? (
              <span className="text-lg">{domainIcon}</span>
            ) : (
              <Globe className="text-gray-400" size={18} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{displayTitle}</p>
            {link.og_description && (
              <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                {link.og_description}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1 truncate">
              {link.domain} • {new Date(link.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(link.url, '_blank')}
            className="text-blue-400 hover:text-blue-300"
          >
            <ExternalLink size={16} />
          </Button>
          {onDelete && (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="Delete link"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-4 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <h3 className="text-white font-semibold">Delete link?</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              This will permanently remove &quot;{displayTitle}&quot; from the trip.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="bg-white/10 text-white py-3 rounded-xl font-medium hover:bg-white/20"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  onDelete?.(link.id);
                }}
                className="bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 flex items-center justify-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
  
  const Icon = type ? icons[type as keyof typeof icons] || Link : Camera;
  const message = type === 'links'
    ? 'No links yet. Share URLs in the chat and they\'ll appear here!'
    : type 
      ? `No ${type} yet. Share some in the chat!`
      : 'No media yet. Start sharing photos, videos, and files in the chat!';

  return (
    <div className="text-center py-12">
      <Icon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
      <p className="text-gray-400">{message}</p>
      {onAddMedia && type && type !== 'links' && (
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