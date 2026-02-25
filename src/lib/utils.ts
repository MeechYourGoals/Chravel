import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes image MIME types for Supabase Storage compatibility.
 * Some browsers report image/jpg instead of image/jpeg; Supabase allowed_mime_types
 * typically only includes image/jpeg, causing uploads to fail.
 */
export function normalizeImageMimeType(mimeType: string): string {
  const normalized: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'image/pjpeg': 'image/jpeg',
  };
  return normalized[mimeType.toLowerCase()] ?? mimeType;
}
