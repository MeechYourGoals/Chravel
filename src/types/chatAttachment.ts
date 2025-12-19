/**
 * Rich Chat Attachment Types for WhatsApp/iMessage-like Media Sharing
 */

export interface RichChatAttachment {
  /** Storage path: "<tripId>/<userId>/<clientMessageId>/<filename>" */
  path: string;
  /** MIME type: "image/jpeg", "video/mp4", etc. */
  mime: string;
  /** File size in bytes */
  bytes: number;
  /** Image/video width in pixels */
  width?: number;
  /** Image/video height in pixels */
  height?: number;
  /** Video duration in milliseconds */
  durationMs?: number;
  /** Optional thumbnail path for videos */
  thumbnailPath?: string;
  /** Original filename */
  originalName: string;
}

export interface RichLinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
  favicon?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface OptimisticMessage {
  clientMessageId: string;
  tripId: string;
  content: string;
  authorName: string;
  userId: string;
  messageType: 'text' | 'image' | 'video' | 'file' | 'link';
  attachments?: RichChatAttachment[];
  linkPreview?: RichLinkPreview | null;
  status: MessageStatus;
  createdAt: string;
  error?: string;
}

export interface UploadProgress {
  clientMessageId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}
