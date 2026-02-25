/**
 * MIME helpers
 *
 * Why: `File.type` is frequently empty (especially iOS / Files app). If we upload with
 * `application/octet-stream` and Storage serves responses with `X-Content-Type-Options: nosniff`,
 * browsers will refuse to decode/play media (notably `<video>`).
 *
 * This module provides a best-effort, extension-based fallback for contentType.
 */

const MIME_BY_EXTENSION: Record<string, string> = {
  // Video
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  // Documents (common)
  pdf: 'application/pdf',
};

export function inferMimeTypeFromFilename(filename: string): string | null {
  const lower = (filename || '').toLowerCase();
  const ext = lower.includes('.') ? lower.split('.').pop() : null;
  if (!ext) return null;
  return MIME_BY_EXTENSION[ext] ?? null;
}

export function getUploadContentType(file: File): string {
  // Prefer the browser-provided type.
  if (file.type && file.type.length > 0) return file.type;
  // Fall back to extension inference.
  return inferMimeTypeFromFilename(file.name) ?? 'application/octet-stream';
}
