import React, { useState, useRef } from 'react';
import { Camera, Video, FileText, Link, Play, Download, MessageCircle, ExternalLink, DollarSign, Users, Loader2, X, Trash2 } from 'lucide-react';
import { mediaService } from '@/services/mediaService';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { PaymentMethodIcon } from './receipts/PaymentMethodIcon';
import { generatePaymentDeeplink } from '../utils/paymentDeeplinks';
import { AddLinkModal } from './AddLinkModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';
import { useResolvedTripMediaUrl } from '@/hooks/useResolvedTripMediaUrl';

interface MediaItem {
  id: string;
  media_url: string;
  filename: string;
  media_type: 'image' | 'video' | 'document';
  metadata: any;
  created_at: string;
  source: 'chat' | 'upload';
  file_size?: number;
  mime_type?: string;
}

interface LinkItem {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  image_url?: string;
  created_at: string;
  source: 'chat' | 'manual' | 'places';
  tags?: string[];
}

interface MediaSubTabsProps {
  items: MediaItem[] | LinkItem[];
  type: 'photos' | 'videos' | 'files' | 'urls';
  searchQuery?: string;
}

interface MediaSubTabsExtendedProps extends MediaSubTabsProps {
  tripId?: string;
  onMediaUploaded?: () => void;
  onDeleteItem?: (id: string) => Promise<void> | void;
}

const MediaGridTile: React.FC<{
  item: MediaItem;
  onOpenVideo: (item: MediaItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  isDeleting: boolean;
}> = ({ item, onOpenVideo, onDelete, isDeleting }) => {
  const resolvedUrl = useResolvedTripMediaUrl({ url: item.media_url, metadata: item.metadata });

  return (
    <div
      className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        if (item.media_type === 'video') onOpenVideo(item);
      }}
    >
      {item.media_type === 'image' ? (
        <img
          src={resolvedUrl ?? item.media_url}
          alt={item.filename}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <div className="relative w-full h-full bg-black flex items-center justify-center">
          <video
            src={resolvedUrl ?? item.media_url}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <Play className="w-12 h-12 text-white" />
          </div>
          {item.metadata?.duration && (
            <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded pointer-events-none">
              {Math.floor(item.metadata.duration / 60)}:
              {(item.metadata.duration % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      {/* Delete button - always visible */}
      <button
        onClick={(e) => onDelete(item.id, e)}
        disabled={isDeleting}
        className="absolute top-2 right-2 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-destructive transition-colors"
      >
        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      </button>

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1">
            {item.source === 'chat' ? (
              <MessageCircle className="w-4 h-4 text-white bg-black/50 rounded p-0.5" />
            ) : (
              <ExternalLink className="w-4 h-4 text-white bg-black/50 rounded p-0.5" />
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-sm font-medium truncate">{item.filename}</p>
          <p className="text-white/80 text-xs">
            {item.source === 'chat' ? 'From chat' : 'Uploaded'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const MediaSubTabs = ({ items, type, searchQuery, tripId, onMediaUploaded, onDeleteItem }: MediaSubTabsExtendedProps) => {
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeVideoItem, setActiveVideoItem] = useState<MediaItem | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const resolvedActiveVideoUrl = useResolvedTripMediaUrl({
    url: activeVideoItem?.media_url ?? null,
    metadata: activeVideoItem?.metadata,
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (deletingIds.has(id)) return;
    
    setDeletingIds(prev => new Set(prev).add(id));
    
    try {
      // Prefer the parent-provided delete handler (single source of truth).
      if (onDeleteItem) {
        await onDeleteItem(id);
        onMediaUploaded?.(); // Trigger refetch if provided
        return;
      }

      // Fallback (should be rare): local delete implementation.
      if (isDemoMode) {
        toast.success('Item deleted (demo mode)');
        return;
      }

      await mediaService.deleteMedia(id);
      toast.success('Item deleted');
      onMediaUploaded?.(); // Trigger refetch
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete item');
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getMediaTypeFromMime = (mimeType: string): 'image' | 'video' | 'document' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  };

  const handleFileUpload = async (files: FileList | null, activeTabType: 'photos' | 'videos' | 'files') => {
    if (!files || files.length === 0) return;
    if (!tripId) {
      toast.error('Trip ID is required for uploads');
      return;
    }

    if (isDemoMode) {
      toast.success(`${files.length} file(s) uploaded (demo mode)`);
      return;
    }

    if (!user) {
      toast.error('Please sign in to upload files');
      return;
    }

    setIsUploading(true);
    try {
      let uploadedCount = 0;
      
      for (const file of Array.from(files)) {
        const detectedType = getMediaTypeFromMime(file.type);
        
        // Validation & Routing Logic
        let finalMediaType: 'image' | 'video' | 'document' = detectedType;
        
        if (activeTabType === 'photos') {
          if (detectedType !== 'image') {
            if (detectedType === 'video') {
              // Auto-route video to videos tab (allow but warn)
              toast.info(`Video "${file.name}" will be saved to Videos tab`);
              finalMediaType = 'video';
            } else {
              toast.error(`"${file.name}" is not a photo`);
              continue;
            }
          }
        } else if (activeTabType === 'videos') {
          if (detectedType !== 'video') {
            if (detectedType === 'image') {
               // Auto-route photo to photos tab (allow but warn)
               toast.info(`Photo "${file.name}" will be saved to Photos tab`);
               finalMediaType = 'image';
            } else {
              toast.error(`"${file.name}" is not a video`);
              continue;
            }
          }
        } else if (activeTabType === 'files') {
          // Files tab logic: reject standard media to keep it organized, unless it's a specific "document" intent
          // But technically users might want to upload a "chart" image as a file.
          // However, sticking to the plan: "rejects or warns on pure images/videos"
          if (detectedType === 'image' || detectedType === 'video') {
             toast.error(`Please upload photos/videos in the ${detectedType === 'image' ? 'Photos' : 'Videos'} tab`);
             continue;
          }
          finalMediaType = 'document';
        }

        const fileName = `${tripId}/${user.id}/${Date.now()}-${file.name}`;
        
        // Upload to Supabase Storage with explicit contentType
        // CRITICAL: iOS Safari requires correct Content-Type headers to decode video
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('trip-media')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'application/octet-stream',
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('trip-media')
          .getPublicUrl(fileName);

        // Insert into trip_media_index
        const { error: dbError } = await supabase
          .from('trip_media_index')
          .insert({
            trip_id: tripId,
            media_url: urlData.publicUrl,
            filename: file.name,
            media_type: finalMediaType, // Use the detected/validated type
            file_size: file.size,
            mime_type: file.type,
            metadata: {
              upload_path: fileName,
              uploaded_by: user.id
            }
          });

        if (dbError) {
          console.error('Database error:', dbError);
          toast.error(`Failed to save ${file.name} metadata`);
        } else {
          uploadedCount++;
        }
      }

      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} file(s) uploaded successfully!`);
        // Small delay to ensure DB write propagates before callback
        await new Promise(resolve => setTimeout(resolve, 600));
        onMediaUploaded?.();
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handlePaymentClick = (item: MediaItem) => {
    if (item.metadata?.preferredMethod && item.metadata?.perPersonAmount) {
      const deeplink = generatePaymentDeeplink(
        item.metadata.preferredMethod,
        item.metadata.perPersonAmount,
        'Trip Member'
      );
      
      if (deeplink) {
        window.open(deeplink, '_blank');
      }
    }
  };

  if (type === 'urls') {
    const linkItems = items as LinkItem[];

    return (
      <div className="space-y-4">
        {/* Header with Add Link Button */}
        <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg">
          <h3 className="text-lg font-semibold text-foreground">
            All Links ({linkItems.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAddLinkModalOpen(true)}
            className="text-xs"
          >
            <Link className="w-4 h-4 mr-1" />
            + Add Link
          </Button>
        </div>

        {/* Links Display */}
        {linkItems.length === 0 ? (
          <div className="text-center py-8">
            <Link className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">
              Links shared in chat will appear here automatically
            </p>
          </div>
        ) : null}

        {/* Links Display */}
        {linkItems.length > 0 && linkItems.map((item) => (
          <div key={item.id} className="bg-card border rounded-lg p-4 hover:bg-card/80 transition-colors">
            <div className="flex gap-4">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-foreground font-medium text-sm mb-1 truncate">{item.title}</h4>
                <p className="text-muted-foreground text-xs mb-2 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{item.domain}</span>
                    <span>{formatDate(item.created_at)}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.source === 'chat' ? 'From chat' : item.source === 'places' ? 'From Places' : 'Manual'}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(item.url, '_blank')}
                    className="text-xs"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <AddLinkModal
          isOpen={isAddLinkModalOpen}
          onClose={() => setIsAddLinkModalOpen(false)}
        />

        {/* Video Player Modal */}
        {activeVideoItem && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setActiveVideoItem(null)}
          >
            <button
              className="absolute top-4 right-4 z-10 text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors"
              onClick={() => setActiveVideoItem(null)}
            >
              <X className="w-6 h-6" />
            </button>
            {/* iOS CRITICAL: muted required for autoplay, user can unmute via controls */}
            <video
              src={resolvedActiveVideoUrl ?? activeVideoItem.media_url}
              controls
              autoPlay
              playsInline
              muted
              controlsList="nodownload"
              preload="metadata"
              className="max-w-full max-h-full"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                width: 'auto',
                height: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  const mediaItems = items as MediaItem[];

  // Grid layout for photos and videos with click-to-play videos
  if (type === 'photos' || type === 'videos') {
    return (
      <div className="space-y-4">
        {/* Hidden file inputs */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files, 'photos')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files, 'videos')}
        />
        
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">
            {type === 'photos' ? 'Photos' : 'Videos'} ({mediaItems.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (type === 'photos') {
                photoInputRef.current?.click();
              } else {
                videoInputRef.current?.click();
              }
            }}
            disabled={isUploading}
            className="text-xs"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : type === 'photos' ? (
              <Camera className="w-4 h-4 mr-1" />
            ) : (
              <Video className="w-4 h-4 mr-1" />
            )}
            + Add {type === 'photos' ? 'Photo' : 'Video'}
          </Button>
        </div>
        
        {mediaItems.length === 0 ? (
          <div className="text-center py-8">
            {type === 'photos' ? <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" /> : <Video className="mx-auto h-8 w-8 text-muted-foreground mb-2" />}
            <p className="text-muted-foreground text-sm">
              {searchQuery ? (
                <>No {type} found matching "{searchQuery}". Try a different search term.</>
              ) : (
                <>{type.charAt(0).toUpperCase() + type.slice(1)} shared in chat will appear here</>
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaItems.map((item) => (
              <MediaGridTile
                key={item.id}
                item={item}
                onOpenVideo={(it) => setActiveVideoItem(it)}
                onDelete={handleDelete}
                isDeleting={deletingIds.has(item.id)}
              />
            ))}
          </div>
        )}

        {/* Video Player Modal */}
        {activeVideoItem && (
          <div
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
            onClick={() => setActiveVideoItem(null)}
          >
            <button
              className="absolute top-4 right-4 z-10 text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors"
              onClick={() => setActiveVideoItem(null)}
            >
              <X className="w-6 h-6" />
            </button>
            {/* iOS CRITICAL: muted required for autoplay, user can unmute via controls */}
            <video
              src={resolvedActiveVideoUrl ?? activeVideoItem.media_url}
              controls
              autoPlay
              playsInline
              muted
              controlsList="nodownload"
              preload="metadata"
              className="max-w-full max-h-full"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                width: 'auto',
                height: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    );
  }

  // Special handling for Files tab - show documents and file-type images
  if (type === 'files') {
    const fileItems = mediaItems.filter(item => 
      item.media_type === 'document' || 
      (item.media_type === 'image' && (item.metadata?.isSchedule || item.metadata?.isReceipt || item.metadata?.isTicket))
    );


    return (
      <div className="space-y-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files, 'files')}
        />
        
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">
            Files ({fileItems.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-xs"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-1" />
            )}
            + Add File
          </Button>
        </div>
        
        {fileItems.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-sm">
              {searchQuery ? (
                <>No files found matching "{searchQuery}". Try a different search term.</>
              ) : (
                <>Documents, receipts, and schedules shared in chat will appear here</>
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {fileItems.map((item: MediaItem) => (
            <div key={item.id} className="bg-card border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {item.metadata?.isReceipt ? (
                    <div className="flex-shrink-0">
                      <img
                        src={item.media_url}
                        alt={item.filename}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>
                  ) : item.metadata?.isSchedule ? (
                    <div className="flex-shrink-0">
                      <img
                        src={item.media_url}
                        alt={item.filename}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0">
                      <FileText className="text-blue-400" size={20} />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium truncate">{item.filename}</p>
                      {item.metadata?.isReceipt && (
                        <Badge variant="outline" className="text-green-400 border-green-400/50">
                          Receipt
                        </Badge>
                      )}
                      {item.metadata?.isTicket && (
                        <Badge variant="outline" className="text-blue-400 border-blue-400/50">
                          Ticket
                        </Badge>
                      )}
                      {item.metadata?.isSchedule && (
                        <Badge variant="outline" className="text-orange-400 border-orange-400/50">
                          Schedule
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1">
                      <span>{formatFileSize(item.file_size)}</span>
                      <span>{item.source === 'chat' ? 'From chat' : 'Uploaded'}</span>
                      <span>{formatDate(item.created_at)}</span>
                      {item.metadata?.extractedEvents && (
                        <Badge variant="outline" className="text-orange-400 border-orange-400/50">
                          {item.metadata.extractedEvents} events
                        </Badge>
                      )}
                    </div>

                    {/* Receipt-specific info */}
                    {item.metadata?.isReceipt && item.metadata?.totalAmount && (
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-green-400" />
                          <span className="text-foreground text-sm font-medium">
                            ${item.metadata.totalAmount.toFixed(2)}
                          </span>
                        </div>
                        
                        {item.metadata.splitCount && item.metadata.perPersonAmount && (
                          <div className="flex items-center gap-1">
                            <Users size={14} className="text-blue-400" />
                            <span className="text-muted-foreground text-sm">
                              ${item.metadata.perPersonAmount.toFixed(2)} each ({item.metadata.splitCount} people)
                            </span>
                          </div>
                        )}
                        
                        {item.metadata.preferredMethod && (
                          <div className="flex items-center gap-2">
                            <PaymentMethodIcon method={item.metadata.preferredMethod} size={14} />
                            <span className="text-muted-foreground text-sm capitalize">
                              {item.metadata.preferredMethod}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Receipt payment button */}
                  {item.metadata?.isReceipt && item.metadata?.perPersonAmount && (
                    <Button
                      onClick={() => handlePaymentClick(item)}
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                    >
                      Pay ${item.metadata.perPersonAmount.toFixed(2)}
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(item.media_url, '_blank')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Download size={16} />
                  </Button>
                  
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDelete(item.id, e)}
                    disabled={deletingIds.has(item.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {deletingIds.has(item.id) ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            ))}
          </div>
      )}
    </div>
  );
};
};