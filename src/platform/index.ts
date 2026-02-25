/**
 * Platform Abstraction Layer
 *
 * Provides platform-agnostic APIs that work across web and mobile.
 * Future mobile implementations should provide alternative implementations
 * of these modules while maintaining the same interface.
 */

export * from './storage';
export * from './sharing';
export * from './media';
export * from './clipboard';
export * from './navigation';
export * from './utils';
export * from './pushNotifications';
