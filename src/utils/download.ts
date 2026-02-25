/**
 * Cross-platform Blob download helper with iOS Safari and PWA support.
 * - Uses Web Share API with files when available (best UX on mobile)
 * - On iOS Safari/PWA, prefers navigating a pre-opened window to a blob URL
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
  // Include Safari and Safari-based WebViews (including PWA standalone mode)
  // PWA on iOS uses WKWebView which may not have "Safari" in the UA
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  // Also check for AppleWebKit without Chrome/Firefox (covers PWA WebView)
  const isWebKit = /AppleWebKit/.test(ua) && !/Chrome|CriOS|Firefox|FxiOS|EdgA|EdgiOS/.test(ua);
  return isSafari || isWebKit;
}

function isStandalonePWA(): boolean {
  // Detect if running as installed PWA (standalone mode)
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export async function openOrDownloadBlob(
  blob: Blob,
  filename: string,
  options: DownloadOptions = {},
): Promise<void> {
  const { preOpenedWindow, mimeType } = options;
  const type = blob.type || mimeType || 'application/octet-stream';
  const isIOSDevice = isProbablyIOS();
  const isPWA = isStandalonePWA();

  // Try Web Share API first - this provides the native iOS share sheet
  // (Message, Save to Files, Copy, AirDrop, etc.)
  try {
    const anyNavigator = navigator as any;
    const file = new File([blob], filename, { type });
    if (anyNavigator?.canShare && anyNavigator?.share && anyNavigator.canShare({ files: [file] })) {
      // Add timeout to prevent indefinite hanging (especially in PWA mode)
      const sharePromise = anyNavigator.share({ files: [file], title: filename });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Share timeout')), 15000),
      );
      await Promise.race([sharePromise, timeoutPromise]);
      return;
    }
  } catch (error) {
    // User cancelled share, or share timed out, or not supported
    // Fall through to blob download strategies
    console.log('Web Share API unavailable or failed, using fallback:', error);
  }

  const url = URL.createObjectURL(blob);
  const cleanup = () => {
    // Give the browser time to consume the blob before revoking
    setTimeout(() => URL.revokeObjectURL(url), 8000);
  };

  // iOS Safari/PWA has limited support for a[download] and blob downloads.
  // For PWA standalone mode, we need special handling.
  if (isIOSDevice && (isSafariLike() || isPWA)) {
    if (preOpenedWindow) {
      try {
        preOpenedWindow.location.href = url;
        cleanup();
        return;
      } catch {
        // If navigation fails, fallback below
      }
    }

    // For PWA mode, try opening in same window context which often works better
    if (isPWA) {
      // Create a download link and simulate click
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      // Use _self for PWA to avoid popup blocking issues
      a.target = '_self';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      // Small delay before cleanup for PWA
      setTimeout(() => document.body.removeChild(a), 100);
      cleanup();
      return;
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
