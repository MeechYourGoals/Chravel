import { errorTracking } from '@/services/errorTracking';

type AuthDebugData = Record<string, unknown>;

type AuthDebugEvent = {
  ts: string;
  message: string;
  data?: AuthDebugData;
};

const AUTH_DEBUG_ENABLED_KEY = 'chravel_auth_debug';
const AUTH_DEBUG_LOG_KEY = 'chravel_auth_debug_log';
const AUTH_DEBUG_MAX_EVENTS = 200;

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
  return safeGetLocalStorageItem(AUTH_DEBUG_ENABLED_KEY) === '1';
}

export function setAuthDebugEnabled(enabled: boolean): void {
  if (enabled) {
    safeSetLocalStorageItem(AUTH_DEBUG_ENABLED_KEY, '1');
  } else {
    safeRemoveLocalStorageItem(AUTH_DEBUG_ENABLED_KEY);
  }
}

function appendAuthDebugEvent(event: AuthDebugEvent): void {
  try {
    const raw = safeGetLocalStorageItem(AUTH_DEBUG_LOG_KEY);
    const current = raw ? (JSON.parse(raw) as AuthDebugEvent[]) : [];
    const next = [...current, event].slice(-AUTH_DEBUG_MAX_EVENTS);
    safeSetLocalStorageItem(AUTH_DEBUG_LOG_KEY, JSON.stringify(next));
  } catch {
    // ignore (storage may be unavailable)
  }
}

export function getAuthDebugEvents(limit: number = 50): AuthDebugEvent[] {
  try {
    const raw = safeGetLocalStorageItem(AUTH_DEBUG_LOG_KEY);
    const events = raw ? (JSON.parse(raw) as AuthDebugEvent[]) : [];
    return events.slice(-Math.max(1, limit));
  } catch {
    return [];
  }
}

export function clearAuthDebugEvents(): void {
  safeRemoveLocalStorageItem(AUTH_DEBUG_LOG_KEY);
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
  const event: AuthDebugEvent = {
    ts: new Date().toISOString(),
    message,
    data: safeData,
  };

  // Console (primary place you'll read this)

  console.info('[AuthDebug]', message, safeData ?? '');

  // Breadcrumbs for later inspection
  errorTracking.addBreadcrumb({
    category: 'state-change',
    message: `[AuthDebug] ${message}`,
    level: 'info',
    data: safeData,
  });

  // Persist across reloads/navigation for debugging “come back later” cases.
  appendAuthDebugEvent(event);
}

declare global {
  var chravelAuthDebug:
    | {
        enable: () => void;
        disable: () => void;
        breadcrumbs: (limit?: number) => unknown[];
        dump: (limit?: number) => unknown[];
        clear: () => void;
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
    dump: (limit: number = 50) => getAuthDebugEvents(limit),
    clear: () => clearAuthDebugEvents(),
  };
}
