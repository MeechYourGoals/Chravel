/**
 * Platform-agnostic sharing
 * Web: Uses Web Share API with clipboard and prompt fallbacks
 * Mobile: Implemented by the native shell (e.g., via Capacitor plugins)
 */

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface ShareResult {
  success: boolean;
  error?: string;
  /** If true, the URL was shown in a prompt for manual copy (last resort fallback) */
  fallbackPrompt?: boolean;
}

class WebSharing {
  async canShare(options: ShareOptions): Promise<boolean> {
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
    // Build share text for fallbacks
    const shareText = [options.url, options.text, options.title]
      .filter(Boolean)
      .join('\n');

    // 1. Try native Web Share API
    if (navigator.share) {
      try {
        await navigator.share(options);
        return { success: true };
      } catch (error) {
        // User cancelled - not an error
        if ((error as Error).name === 'AbortError') {
          return { success: false, error: 'Sharing cancelled' };
        }
        // Fall through to clipboard fallback
        console.warn('Web Share API failed, trying clipboard:', error);
      }
    }

    // 2. Try clipboard fallback
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(shareText);
        return { success: true };
      } catch (error) {
        console.warn('Clipboard API failed, using prompt fallback:', error);
      }
    }

    // 3. Try execCommand fallback (older browsers)
    try {
      const textarea = document.createElement('textarea');
      textarea.value = shareText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        return { success: true };
      }
    } catch (error) {
      console.warn('execCommand copy failed:', error);
    }

    // 4. Last resort: Show prompt with URL for manual copy
    const urlToShow = options.url || shareText;
    window.prompt('Copy this link to share:', urlToShow);
    return { success: true, fallbackPrompt: true };
  }
}

export const platformSharing = new WebSharing();
