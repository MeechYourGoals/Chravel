import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, FileText, Image as ImageIcon, Link2, Loader2, Upload, Video } from 'lucide-react';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { hapticService } from '../../services/hapticService';
import { StorageQuotaBar } from '../StorageQuotaBar';
import { useMediaManagement } from '../../hooks/useMediaManagement';
import { useDemoMode } from '../../hooks/useDemoMode';
import { MediaGridItem } from './MediaGridItem';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { createTripLink } from '@/services/tripLinksService';
import { toast } from 'sonner';

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

type MobileMediaTab = 'all' | 'photos' | 'videos' | 'files' | 'urls';

const VIDEO_ACCEPT = [
  'video/*',
  'video/mp4',
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  '.mp4',
  '.mov',
  '.m4v',
  '.avi',
].join(',');

const IMAGE_ACCEPT = ['image/*', 'image/heic', 'image/heif', '.jpg', '.jpeg', '.png', '.heic', '.heif'].join(
  ',',
);

const DOCUMENT_ACCEPT = [
  // PDFs + Office
  'application/pdf',
  '.pdf',
  'application/msword',
  '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.docx',
  'application/vnd.ms-excel',
  '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xlsx',
  'application/vnd.ms-powerpoint',
  '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.pptx',
  // Text + CSV
  'text/plain',
  '.txt',
  'text/csv',
  '.csv',
  'application/rtf',
  '.rtf',
  // Archives
  'application/zip',
  '.zip',
  'application/x-zip-compressed',
  // Apple iWork
  'application/vnd.apple.pages',
  '.pages',
  'application/vnd.apple.numbers',
  '.numbers',
  'application/vnd.apple.keynote',
  '.key',
].join(',');

export const MobileUnifiedMediaHub = ({ tripId }: MobileUnifiedMediaHubProps) => {
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const { mediaItems: realMediaItems, linkItems, loading, refetch } = useMediaManagement(tripId);
  const [selectedTab, setSelectedTab] = useState<MobileMediaTab>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkDescription, setNewLinkDescription] = useState('');
  const [demoLocalMedia, setDemoLocalMedia] = useState<MediaItem[]>([]);
  const [demoLocalLinks, setDemoLocalLinks] = useState<
    Array<{
      id: string;
      url: string;
      title: string;
      description: string;
      domain: string;
      image_url?: string;
      created_at: string;
      source: 'manual';
      tags?: string[];
    }>
  >([]);

  const photoCaptureInputRef = useRef<HTMLInputElement>(null);
  const photoLibraryInputRef = useRef<HTMLInputElement>(null);
  const videoCaptureInputRef = useRef<HTMLInputElement>(null);
  const videoLibraryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isPulling, isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    }
  });

  const revokeQueueRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup any blob URLs we created (demo mode).
      for (const url of revokeQueueRef.current) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // no-op
        }
      }
      revokeQueueRef.current = [];
    };
  }, []);

  const mediaItems: MediaItem[] = useMemo(() => {
    const fromDb: MediaItem[] = realMediaItems
      .filter(item => item.media_type === 'image' || item.media_type === 'video' || item.media_type === 'document')
      .map(item => ({
        id: item.id,
        type: item.media_type === 'video' ? 'video' : item.media_type === 'document' ? 'file' : 'image',
        url: item.media_url,
        uploadedBy: 'User',
        uploadedAt: new Date(item.created_at),
        filename: item.filename,
        fileSize: undefined,
      }));

    // In demo mode, allow the user to “upload” and see items immediately without server persistence.
    return isDemoMode ? [...demoLocalMedia, ...fromDb] : fromDb;
  }, [demoLocalMedia, isDemoMode, realMediaItems]);

  const combinedLinks = useMemo(() => {
    return isDemoMode ? [...demoLocalLinks, ...linkItems] : linkItems;
  }, [demoLocalLinks, isDemoMode, linkItems]);

  // Calculate counts for each tab
  const photosCount = mediaItems.filter(item => item.type === 'image').length;
  const videosCount = mediaItems.filter(item => item.type === 'video').length;
  const filesCount = mediaItems.filter(item => item.type === 'file').length;
  const urlsCount = combinedLinks.length;
  const allCount = mediaItems.length + combinedLinks.length;

  const filteredMedia = mediaItems.filter(item => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'photos') return item.type === 'image';
    if (selectedTab === 'videos') return item.type === 'video';
    if (selectedTab === 'files') return item.type === 'file';
    return true;
  });

  const filteredLinks = selectedTab === 'urls' || selectedTab === 'all' ? combinedLinks : [];

  const normalizeUrl = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const u = new URL(withProtocol);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
      return u.toString();
    } catch {
      return null;
    }
  };

  const ensureUploadPreconditions = (): { ok: true; userId?: string } | { ok: false } => {
    if (isDemoMode) return { ok: true };
    if (!user?.id) {
      toast.error('Please sign in to upload');
      return { ok: false };
    }
    return { ok: true, userId: user.id };
  };

  const uploadFiles = async (files: FileList | null, target: 'photos' | 'videos' | 'files') => {
    if (!files || files.length === 0) return;
    const pre = ensureUploadPreconditions();
    if (!pre.ok) return;

    setIsUploading(true);
    await hapticService.medium();
    try {
      if (isDemoMode) {
        const now = new Date();
        const newItems: MediaItem[] = [];

        for (const file of Array.from(files)) {
          const kind: MediaItem['type'] =
            target === 'photos' ? 'image' : target === 'videos' ? 'video' : 'file';

          // Basic validation for UX consistency
          if (kind === 'video' && !(file.type || '').startsWith('video/')) {
            toast.error(`"${file.name}" is not a video`);
            continue;
          }
          if (kind === 'image' && !(file.type || '').startsWith('image/')) {
            toast.error(`"${file.name}" is not a photo`);
            continue;
          }

          const url = URL.createObjectURL(file);
          revokeQueueRef.current.push(url);
          newItems.push({
            id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            type: kind,
            url,
            uploadedBy: 'Demo User',
            uploadedAt: now,
            filename: file.name,
            fileSize: `${Math.round(file.size / 1024)} KB`,
          });
        }

        if (newItems.length > 0) {
          setDemoLocalMedia(prev => [...newItems, ...prev]);
          toast.success(`${newItems.length} upload(s) added (demo)`);
        }
        return;
      }

      // Authenticated mode: upload to Supabase Storage + index in trip_media_index
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const mime = file.type || '';
        const detected: 'image' | 'video' | 'document' =
          mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : 'document';

        const finalType: 'image' | 'video' | 'document' =
          target === 'photos' ? 'image' : target === 'videos' ? 'video' : 'document';

        // Validate to prevent “why isn’t it showing up?” issues.
        if (finalType === 'image' && detected !== 'image') {
          toast.error(`"${file.name}" is not a photo`);
          continue;
        }
        if (finalType === 'video' && detected !== 'video') {
          toast.error(`"${file.name}" is not a video`);
          continue;
        }

        const safeName = file.name.replaceAll('/', '-');
        const storagePath = `${tripId}/${pre.userId}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from('trip-media')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('[MobileUnifiedMediaHub] Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(storagePath);
        const publicUrl = urlData.publicUrl;
        uploadedUrls.push(publicUrl);

        const { error: dbError } = await supabase.from('trip_media_index').insert({
          trip_id: tripId,
          media_url: publicUrl,
          filename: file.name,
          media_type: finalType,
          file_size: file.size,
          mime_type: file.type,
          metadata: {},
        });

        if (dbError) {
          console.error('[MobileUnifiedMediaHub] DB error:', dbError);
          toast.error(`Failed to save ${file.name}`);
        }
      }

      if (uploadedUrls.length > 0) {
        toast.success(`${uploadedUrls.length} file(s) uploaded`);
        await refetch();
      }
    } catch (error) {
      console.error('[MobileUnifiedMediaHub] Upload flow error:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const openCapture = async () => {
    await hapticService.medium();
    if (isUploading) return;

    if (selectedTab === 'videos') {
      videoCaptureInputRef.current?.click();
      return;
    }
    if (selectedTab === 'files') {
      fileInputRef.current?.click();
      return;
    }
    if (selectedTab === 'urls') {
      setIsAddLinkOpen(true);
      return;
    }
    // Default: photos + all
    photoCaptureInputRef.current?.click();
  };

  const openLibrary = async () => {
    await hapticService.medium();
    if (isUploading) return;

    if (selectedTab === 'videos') {
      videoLibraryInputRef.current?.click();
      return;
    }
    if (selectedTab === 'files') {
      fileInputRef.current?.click();
      return;
    }
    if (selectedTab === 'urls') {
      setIsAddLinkOpen(true);
      return;
    }
    photoLibraryInputRef.current?.click();
  };

  const actionLeft = useMemo(() => {
    if (selectedTab === 'videos') return { label: 'Take Video', Icon: Video };
    if (selectedTab === 'files') return { label: 'Upload File', Icon: FileText };
    if (selectedTab === 'urls') return { label: 'Add Link', Icon: Link2 };
    return { label: 'Take Photo', Icon: Camera };
  }, [selectedTab]);

  const actionRight = useMemo(() => {
    if (selectedTab === 'urls') return { label: 'Add Link', Icon: Link2 };
    return { label: 'Upload', Icon: Upload };
  }, [selectedTab]);

  const handleAddLink = async () => {
    const normalized = normalizeUrl(newLinkUrl);
    if (!normalized) {
      toast.error('Please enter a valid URL');
      return;
    }

    const title = newLinkTitle.trim() || new URL(normalized).hostname;
    const description = newLinkDescription.trim() || undefined;

    if (isDemoMode) {
      const now = new Date().toISOString();
      setDemoLocalLinks(prev => [
        {
          id: `demo-link-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          url: normalized,
          title,
          description: description ?? '',
          domain: new URL(normalized).hostname,
          created_at: now,
          source: 'manual',
          tags: [],
        },
        ...prev,
      ]);
      toast.success('Link added (demo)');
      setIsAddLinkOpen(false);
      setNewLinkUrl('');
      setNewLinkTitle('');
      setNewLinkDescription('');
      return;
    }

    if (!user?.id) {
      toast.error('Please sign in to add links');
      return;
    }

    const created = await createTripLink(
      {
        tripId,
        url: normalized,
        title,
        description,
        category: 'other',
        addedBy: user.id,
      },
      false,
    );

    if (created) {
      setIsAddLinkOpen(false);
      setNewLinkUrl('');
      setNewLinkTitle('');
      setNewLinkDescription('');
      await refetch();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black relative">
      {/* Hidden inputs (capture vs library) */}
      <input
        ref={photoCaptureInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={e => uploadFiles(e.target.files, 'photos')}
      />
      <input
        ref={photoLibraryInputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={e => uploadFiles(e.target.files, 'photos')}
      />
      <input
        ref={videoCaptureInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        capture="environment"
        className="hidden"
        onChange={e => uploadFiles(e.target.files, 'videos')}
      />
      <input
        ref={videoLibraryInputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        className="hidden"
        onChange={e => uploadFiles(e.target.files, 'videos')}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        className="hidden"
        onChange={e => uploadFiles(e.target.files, 'files')}
      />

      <PullToRefreshIndicator
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={80}
      />

      {/* Action Buttons */}
      <div className="px-4 py-4 border-b border-white/10 safe-container">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openCapture}
            disabled={isUploading}
            className="native-button flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-xl font-medium shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <actionLeft.Icon size={20} />}
            <span>{actionLeft.label}</span>
          </button>
          <button
            onClick={openLibrary}
            disabled={isUploading}
            className="native-button flex items-center justify-center gap-2 bg-white/10 text-white px-4 py-3 rounded-xl font-medium backdrop-blur-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isUploading ? <Loader2 size={20} className="animate-spin" /> : <actionRight.Icon size={20} />}
            <span>{actionRight.label}</span>
          </button>
        </div>
      </div>

      {/* Storage Quota Bar */}
      <div className="px-4 py-3 border-b border-white/10 safe-container">
        <StorageQuotaBar tripId={tripId} showDetails={true} />
      </div>

      {/* Filter Tabs with Counters */}
      <div className="flex gap-2 px-4 py-3 border-b border-white/10 safe-container overflow-x-auto native-scroll scrollbar-hide">
        {([
          { id: 'all', label: 'All', count: allCount },
          { id: 'photos', label: 'Photos', count: photosCount },
          { id: 'videos', label: 'Videos', count: videosCount },
          { id: 'files', label: 'Files', count: filesCount },
          { id: 'urls', label: 'Links', count: urlsCount }
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={async () => {
              await hapticService.light();
              setSelectedTab(tab.id);
            }}
            className={`
              native-tab px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap flex-shrink-0
              ${
                selectedTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white/10 text-gray-300'
              }
            `}
          >
            {tab.label} {tab.count > 0 && (
              <span className={selectedTab === tab.id ? 'text-blue-200' : 'text-gray-500'}>
                ({tab.count})
              </span>
            )}
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
        ) : filteredMedia.length === 0 && filteredLinks.length === 0 ? (
          <div className="text-center py-12 animate-fade-in">
            <div className="ios-bounce">
              <ImageIcon size={48} className="text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2 font-medium">
                {selectedTab === 'urls' ? 'No links yet' : 'No media yet'}
              </p>
              <p className="text-sm text-gray-500">
                {selectedTab === 'urls' 
                  ? 'Links from chat appear here — or add one quietly'
                  : selectedTab === 'videos'
                  ? 'Tap “Take Video” to record or upload from your library'
                  : selectedTab === 'files'
                  ? 'Tap “Upload File” to add PDFs, docs, spreadsheets, and more'
                  : 'Tap “Take Photo” to add photos'
                }
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Media Grid for photos/videos/files */}
            {selectedTab !== 'urls' && filteredMedia.length > 0 && (
              <div className="media-grid animate-fade-in mb-4">
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
                      }}
                      onLongPress={() => {
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Files list */}
            {selectedTab === 'files' && filteredMedia.length > 0 && (
              <div className="space-y-3 px-2 animate-fade-in mb-4">
                {filteredMedia
                  .filter((item): item is MediaItem & { type: 'file' } => item.type === 'file')
                  .map((item, index) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors active:scale-98"
                      style={{
                        animationDelay: `${index * 30}ms`,
                        animation: 'fade-in 0.3s ease-out both',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={18} className="text-blue-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-sm font-medium truncate">
                            {item.filename || 'File'}
                          </p>
                          <p className="text-gray-500 text-xs truncate">{item.url}</p>
                        </div>
                      </div>
                    </a>
                  ))}
              </div>
            )}

            {/* URLs List */}
            {(selectedTab === 'urls' || selectedTab === 'all') && filteredLinks.length > 0 && (
              <div className="space-y-3 px-2 animate-fade-in">
                {filteredLinks.map((link, index) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors active:scale-98"
                    style={{ 
                      animationDelay: `${index * 30}ms`,
                      animation: 'fade-in 0.3s ease-out both'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {link.image_url && (
                        <img 
                          src={link.image_url} 
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm mb-1 line-clamp-2">
                          {link.title}
                        </h4>
                        <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                          {link.description}
                        </p>
                        <p className="text-blue-400 text-xs truncate">
                          {link.domain}
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Link Modal (mobile, quiet share) */}
      {isAddLinkOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-semibold">Add Link</h3>
              <button
                onClick={() => setIsAddLinkOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">URL *</label>
                <input
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  type="url"
                  placeholder="https://..."
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Title (optional)</label>
                <input
                  value={newLinkTitle}
                  onChange={e => setNewLinkTitle(e.target.value)}
                  type="text"
                  placeholder="e.g., Late night tacos"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Note (optional)</label>
                <textarea
                  value={newLinkDescription}
                  onChange={e => setNewLinkDescription(e.target.value)}
                  rows={3}
                  placeholder="Add context for the group…"
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setIsAddLinkOpen(false)}
                  className="native-button bg-white/10 text-white px-4 py-3 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddLink}
                  className="native-button bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-xl font-medium shadow-lg"
                >
                  Save
                </button>
              </div>

              <p className="text-[11px] text-gray-500 pt-1">
                This saves the link to the trip without posting a chat message.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
