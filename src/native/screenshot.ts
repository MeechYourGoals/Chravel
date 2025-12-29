/**
 * Native Screenshot & Image Utilities
 *
 * Provides screenshot capture and image saving functionality
 * for sharing trip recaps and moments.
 *
 * Uses Despia bridge on Lovable native apps, with html2canvas web fallback.
 */

import { Capacitor } from '@capacitor/core';
import { despia } from '@/lib/despia';

export interface ScreenshotResult {
  success: boolean;
  error?: string;
}

export interface SaveImageResult {
  success: boolean;
  savedPath?: string;
  error?: string;
}

/**
 * Check if running in Despia native environment
 */
function isDespiaEnvironment(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('despia');
}

/**
 * Take a screenshot of the current screen
 *
 * On native: Uses system screenshot API
 * On web: Falls back to html2canvas (if available)
 */
export async function takeScreenshot(): Promise<ScreenshotResult> {
  // Despia environment - use native screenshot
  if (isDespiaEnvironment()) {
    try {
      await despia('takescreenshot://');
      return { success: true };
    } catch (error) {
      console.error('[Screenshot] Native screenshot failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed',
      };
    }
  }

  // Web fallback - use html2canvas if available
  if (!Capacitor.isNativePlatform()) {
    try {
      // Dynamically import html2canvas (already in dependencies)
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: window.devicePixelRatio || 1,
      });

      // Convert to blob and trigger download
      canvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `chravel-screenshot-${Date.now()}.png`;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

      return { success: true };
    } catch (error) {
      console.error('[Screenshot] Web screenshot failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Screenshot failed',
      };
    }
  }

  return {
    success: false,
    error: 'Screenshot not available on this platform',
  };
}

/**
 * Take a screenshot of a specific element
 *
 * @param element - DOM element to capture
 * @param filename - Optional filename for download
 */
export async function captureElement(
  element: HTMLElement,
  filename?: string,
): Promise<ScreenshotResult> {
  try {
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: window.devicePixelRatio || 1,
    });

    // Convert to blob and trigger download
    canvas.toBlob(blob => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `chravel-capture-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }
    }, 'image/png');

    return { success: true };
  } catch (error) {
    console.error('[Screenshot] Element capture failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Capture failed',
    };
  }
}

/**
 * Save an image from URL to device photo library
 *
 * @param imageUrl - URL of image to save
 */
export async function saveImageToPhotos(imageUrl: string): Promise<SaveImageResult> {
  // Despia environment - use native save
  if (isDespiaEnvironment()) {
    try {
      await despia(`savethisimage://?url=${encodeURIComponent(imageUrl)}`);
      return { success: true };
    } catch (error) {
      console.error('[Screenshot] Native save failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Save failed',
      };
    }
  }

  // Web fallback - trigger download
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `chravel-image-${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
    link.click();

    URL.revokeObjectURL(url);
    return { success: true };
  } catch (error) {
    console.error('[Screenshot] Web download failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Share a screenshot (combines capture + share)
 *
 * @param element - Optional element to capture (defaults to full page)
 */
export async function shareScreenshot(element?: HTMLElement): Promise<ScreenshotResult> {
  try {
    const html2canvas = (await import('html2canvas')).default;

    const target = element || document.body;
    const canvas = await html2canvas(target, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: window.devicePixelRatio || 1,
    });

    // Convert to blob
    const blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

    if (!blob) {
      return { success: false, error: 'Failed to create image' };
    }

    // Try Web Share API if available
    if (navigator.share && navigator.canShare) {
      const file = new File([blob], 'chravel-screenshot.png', { type: 'image/png' });
      const shareData = { files: [file] };

      if (navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return { success: true };
      }
    }

    // Fallback to download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chravel-screenshot-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    // User cancelled share is not an error
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: true };
    }

    console.error('[Screenshot] Share failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Share failed',
    };
  }
}
