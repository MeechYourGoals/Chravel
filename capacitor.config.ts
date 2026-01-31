import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration
 *
 * TODO(mobile): confirm these values before App Store submission
 * - `appId` should match the App ID / Bundle ID in Apple Developer portal
 * - `appName` should match the product name shown on device
 */
const config: CapacitorConfig = {
  // Prefer env-driven values for CI/local overrides. Defaults match `.env.production.example`.
  appId: process.env.IOS_BUNDLE_ID ?? 'com.chravel.app',
  appName: process.env.IOS_APP_NAME ?? 'Chravel',
  webDir: 'dist',
  plugins: {
    /**
     * iOS native shell UX polish:
     * - `overlaysWebView: true` lets the web UI draw behind the status bar.
     *   We rely on CSS safe-area insets (`env(safe-area-inset-*)`) for layout.
     * - Style is finalized at runtime (theme-aware) in `src/native/nativeShell.ts`.
     */
    StatusBar: {
      overlaysWebView: true,
      // Default on cold start (Chravel ships dark-first); updated dynamically at runtime.
      style: 'LIGHT',
    },
    /**
     * Keyboard: ensure the WebView/body resizes so the composer is never covered.
     * Runtime keyboard insets are also exposed via CSS variables for fine-tuning.
     */
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
    /**
     * Splash screen behavior (assets live in iOS asset catalogs; see docs).
     * Keep defaults unless we find a concrete flash/flicker to address.
     */
    SplashScreen: {
      launchAutoHide: true,
    },
  },
};

export default config;
