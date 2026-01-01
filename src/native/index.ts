/**
 * Native Module Exports
 *
 * Unified exports for all native functionality.
 * Import from '@/native' for clean access to all native features.
 */

// Despia environment detection & utilities
export * from './despia';
export * as despiaUtils from './despia';

// Haptics - tactile feedback
export * from './haptics';
export * as haptics from './haptics';

// Biometrics - Face ID, Touch ID, fingerprint
export * from './biometrics';
export * as biometrics from './biometrics';

// App Info - version, UUID, store location
export * from './appInfo';
export * as appInfo from './appInfo';

// Screenshot - capture and save images
export * from './screenshot';
export * as screenshot from './screenshot';

// Push Notifications
export * from './push';

// Deep Link Routing
export * from './pushRouting';

// App Lifecycle
export * from './lifecycle';

// Native Shell (status bar, keyboard)
export * from './nativeShell';

// Permissions
export * from './permissions';

// Sharing
export * from './share';
