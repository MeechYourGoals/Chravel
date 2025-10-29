/**
 * Cross-platform Blob download helper with iOS Safari support.
 * - Uses Web Share API with files when available (best UX on mobile)
 * - On iOS Safari, prefers navigating a pre-opened window to a blob URL
 * - Otherwise falls back to anchor download with a safe cleanup
 */

export interface DownloadOptions {
  preOpenedWindow?: Window | null;
  mimeType?: string;
}

function isProbablyIOS(): boolean {
  // iPhone, iPad, iPod or iPadOS masquerading as Mac
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const iDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iDevice || iPadOS;
}

function isSafariLike(): boolean {
  const ua = navigator.userAgent || '';
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  return isSafari;
}

export async function openOrDownloadBlob(
  blob: Blob,
  filename: string,
  options: DownloadOptions = {}
): Promise<void> {
  const { preOpenedWindow, mimeType } = options;
  const type = blob.type || mimeType || 'application/octet-stream';

  // Prefer Web Share API with files when available (mobile-friendly)
  try {
    const anyNavigator = navigator as any;
    const file = new File([blob], filename, { type });
    if (anyNavigator?.canShare && anyNavigator?.share && anyNavigator.canShare({ files: [file] })) {
      await anyNavigator.share({ files: [file], title: filename });
      return;
    }
  } catch {
    // fall through to other strategies
  }

  const url = URL.createObjectURL(blob);
  const cleanup = () => {
    // Give the browser time to consume the blob before revoking
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  };

  // iOS Safari has limited support for a[download] and blob downloads.
  // If a window was pre-opened during the user gesture, navigate it to the blob URL.
  if (isProbablyIOS() && isSafariLike()) {
    if (preOpenedWindow) {
      try {
        preOpenedWindow.location.href = url;
        cleanup();
        return;
      } catch {
        // If navigation fails, fallback below
      }
    }

    // Fallback: open a new tab directly (may still be blocked if not user-initiated)
    const win = window.open(url, '_blank');
    if (win) {
      cleanup();
      return;
    }
    // If blocked, continue to anchor approach as a last resort
  }

  // Standard anchor download flow
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  cleanup();
}
