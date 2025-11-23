// Media & File Types

export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  mimeType?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  location?: {
    lat: number;
    lng: number;
    name?: string;
  };
  tags?: string[];
  aiGenerated?: boolean;
  source?: 'chat' | 'upload' | 'import';
  caption?: string;
}

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'file';
  filename: string;
  metadata: MediaMetadata;
  thumbnail?: string;
  createdAt: string;
}

export interface MediaGalleryItem extends MediaItem {
  selected?: boolean;
  loading?: boolean;
}

export interface MediaUploadOptions {
  tripId: string;
  source?: 'chat' | 'upload' | 'import';
  metadata?: Partial<MediaMetadata>;
  onProgress?: (progress: number) => void;
}

export interface MediaGridProps {
  items: MediaItem[];
  type: 'image' | 'video' | 'file' | 'all';
  onItemClick?: (item: MediaItem) => void;
  onItemSelect?: (item: MediaItem) => void;
  selectable?: boolean;
  columns?: number;
}

export interface FileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
  mediaItem?: MediaItem;
}
