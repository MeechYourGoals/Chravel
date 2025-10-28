/**
 * Platform-aware PDF Export Utility
 * Handles PDF generation and saving across web, mobile browsers, and native apps (Capacitor)
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface PdfExportOptions {
  filename: string;
  blob: Blob;
}

export interface PdfExportResult {
  success: boolean;
  error?: string;
  path?: string;
}

/**
 * Exports a PDF blob to the appropriate platform
 * - Web: Downloads file directly
 * - Mobile Browser: Downloads file with share fallback
 * - Native App (Capacitor): Saves to filesystem and opens share sheet
 */
export async function exportPDF(options: PdfExportOptions): Promise<PdfExportResult> {
  const { filename, blob } = options;

  try {
    // Detect if we're running in a Capacitor native app
    const isNative = Capacitor.isNativePlatform();
    
    if (isNative) {
      return await exportPDFNative(filename, blob);
    } else {
      return await exportPDFWeb(filename, blob);
    }
  } catch (error) {
    console.error('PDF export error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export PDF'
    };
  }
}

/**
 * Export PDF for web browsers
 */
async function exportPDFWeb(filename: string, blob: Blob): Promise<PdfExportResult> {
  try {
    // Try Web Share API first (mobile browsers)
    if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: 'application/pdf' })] })) {
      const file = new File([blob], filename, { type: 'application/pdf' });
      await navigator.share({
        title: 'Trip Summary PDF',
        text: 'Here is your trip summary',
        files: [file]
      });
      return { success: true };
    }

    // Fallback: Direct download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);

    return { success: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Export PDF for native apps (iOS/Android via Capacitor)
 */
async function exportPDFNative(filename: string, blob: Blob): Promise<PdfExportResult> {
  try {
    // Convert blob to base64
    const base64Data = await blobToBase64(blob);
    
    // Remove data URL prefix if present
    const base64 = base64Data.split(',')[1] || base64Data;

    // Save to filesystem
    const result = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache, // Use cache directory for temporary files
      recursive: true
    });

    console.log('PDF saved to:', result.uri);

    // Open share sheet
    const shareResult = await Share.share({
      title: 'Trip Summary PDF',
      text: 'Here is your trip summary',
      url: result.uri,
      dialogTitle: 'Share Trip Summary'
    });

    // Note: shareResult is void on iOS, but we can assume success if no error thrown
    return { 
      success: true,
      path: result.uri
    };
  } catch (error) {
    console.error('Native PDF export error:', error);
    throw error;
  }
}

/**
 * Convert Blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if PDF export is supported on current platform
 */
export function isPDFExportSupported(): boolean {
  // Web: Always supported
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  // Native: Check if Filesystem and Share plugins are available
  try {
    return Capacitor.isPluginAvailable('Filesystem') && Capacitor.isPluginAvailable('Share');
  } catch {
    return false;
  }
}

/**
 * Get platform-specific export method name for UI
 */
export function getExportMethodName(): string {
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() === 'ios') {
      return 'Share';
    } else if (Capacitor.getPlatform() === 'android') {
      return 'Share';
    }
  }

  // Web or mobile browser
  if (navigator.share) {
    return 'Share';
  }

  return 'Download';
}
