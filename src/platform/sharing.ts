/**
 * Platform-agnostic sharing
 * Web: Uses Web Share API with fallback
 * Mobile: Uses Capacitor Share API for native sharing
 */

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
  dialogTitle?: string;
}

export interface ShareResult {
  success: boolean;
  error?: string;
}

class PlatformSharing {
  async canShare(options: ShareOptions): Promise<boolean> {
    // Native apps always support sharing via Capacitor
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    // Web: check for Web Share API
    if (!navigator.share) {
      return false;
    }
    
    try {
      // Check if files are supported if files are provided
      if (options.files && options.files.length > 0) {
        return navigator.canShare?.({ files: options.files }) ?? false;
      }
      return true;
    } catch {
      return false;
    }
  }

  async share(options: ShareOptions): Promise<ShareResult> {
    try {
      // Native platforms: Use Capacitor Share
      if (Capacitor.isNativePlatform()) {
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.dialogTitle || options.title
        });
        return { success: true };
      }

      // Web: Use Web Share API
      if (!navigator.share) {
        // Fallback: copy to clipboard
        const shareText = [options.title, options.text, options.url]
          .filter(Boolean)
          .join('\n');
        
        await navigator.clipboard.writeText(shareText);
        return { success: true };
      }

      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
        files: options.files
      });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Share failed';
      console.error('Share error:', error);
      return { success: false, error: errorMessage };
    }
  }
}

export const platformSharing = new PlatformSharing();
