import { errorTracking } from '@/services/errorTracking';

type AuthDebugData = Record<string, unknown>;

function safeGetLocalStorageItem(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeSetLocalStorageItem(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemoveLocalStorageItem(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // ignore
  }
}

function hasAuthDebugQueryParam(): boolean {
  try {
    if (typeof globalThis.location === 'undefined') return false;
    return new URLSearchParams(globalThis.location.search).get('authDebug') === '1';
  } catch {
    return false;
  }
}

export function isAuthDebugEnabled(): boolean {
  // Dev should always be noisy; prod should require explicit opt-in.
  if (import.meta.env.DEV) return true;
  if (hasAuthDebugQueryParam()) return true;
  return safeGetLocalStorageItem('chravel_auth_debug') === '1';
}

export function setAuthDebugEnabled(enabled: boolean): void {
  if (enabled) {
    safeSetLocalStorageItem('chravel_auth_debug', '1');
  } else {
    safeRemoveLocalStorageItem('chravel_auth_debug');
  }
}

/**
 * Auth debug logger:
 * - Never logs tokens, refresh tokens, emails, or raw IDs.
 * - Visible in browser DevTools Console.
 * - Also stored as breadcrumbs in `errorTracking` for quick inspection.
 */
export function authDebug(message: string, data?: AuthDebugData): void {
  if (!isAuthDebugEnabled()) return;

  const safeData = data ? JSON.parse(JSON.stringify(data)) : undefined;

  // Console (primary place you'll read this)

  console.info('[AuthDebug]', message, safeData ?? '');

  // Breadcrumbs for later inspection
  errorTracking.addBreadcrumb({
    category: 'state-change',
    message: `[AuthDebug] ${message}`,
    level: 'info',
    data: safeData,
  });
}

declare global {
  var chravelAuthDebug:
    | {
        enable: () => void;
        disable: () => void;
        breadcrumbs: (limit?: number) => unknown[];
      }
    | undefined;
}

// Convenience helpers for production debugging:
// In DevTools console you can run:
//   chravelAuthDebug.enable(); location.reload();
//   chravelAuthDebug.breadcrumbs(50);
if (typeof globalThis !== 'undefined') {
  globalThis.chravelAuthDebug = {
    enable: () => setAuthDebugEnabled(true),
    disable: () => setAuthDebugEnabled(false),
    breadcrumbs: (limit: number = 25) => errorTracking.getBreadcrumbs(limit),
  };
}
