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
  bundledWebRuntime: false,
};

export default config;

