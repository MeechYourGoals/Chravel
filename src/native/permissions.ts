import { Capacitor } from '@capacitor/core';
import * as NativePush from '@/native/push';

export type PermissionId = 'notifications' | 'photos_files' | 'location' | 'microphone';

export type PermissionState =
  | 'granted'
  | 'denied'
  | 'prompt'
  | 'unknown'
  | 'unavailable'
  | 'not_applicable';

export interface PermissionStatus {
  id: PermissionId;
  state: PermissionState;
  /** True when we can trigger a just-in-time prompt from JS */
  canRequest: boolean;
  /** True when we can deep link to OS Settings */
  canOpenSettings: boolean;
  /** Human-friendly details for edge cases */
  detail?: string;
}

function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

function isIOSNative(): boolean {
  return isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

function normalizePermissionState(state: unknown): PermissionState {
  if (state === 'granted') return 'granted';
  if (state === 'denied') return 'denied';
  if (state === 'prompt') return 'prompt';
  return 'unknown';
}

async function queryGeolocationPermission(): Promise<PermissionState> {
  // Prefer the Permissions API if present (does not prompt).
  const permissions = (navigator as unknown as { permissions?: Permissions }).permissions;
  if (!permissions?.query) return 'unknown';

  try {
    // `geolocation` is not always included in TS lib DOM types across configs.
    const result = await permissions.query({ name: 'geolocation' as PermissionName });
    return normalizePermissionState(result.state);
  } catch {
    return 'unknown';
  }
}

async function requestGeolocationPermission(): Promise<PermissionState> {
  if (!('geolocation' in navigator)) return 'unavailable';

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err: GeolocationPositionError) => {
        // Code 1 is PERMISSION_DENIED.
        if (err.code === 1) resolve('denied');
        else resolve('unknown');
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  });
}

async function queryMicrophonePermission(): Promise<PermissionState> {
  const permissions = (navigator as unknown as { permissions?: Permissions }).permissions;
  if (!permissions?.query) return 'unknown';

  try {
    const result = await permissions.query({ name: 'microphone' as PermissionName });
    return normalizePermissionState(result.state);
  } catch {
    return 'unknown';
  }
}

async function requestMicrophonePermission(): Promise<PermissionState> {
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.getUserMedia) return 'unavailable';

  try {
    const stream = await mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return 'granted';
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') return 'denied';
      if (error.name === 'NotFoundError') return 'unavailable';
    }
    return 'unknown';
  }
}

/**
 * Opens the native iOS settings screen for this app.
 * Only works when running inside a native shell (Capacitor).
 */
export async function openAppSettings(): Promise<boolean> {
  if (!isIOSNative()) return false;

  try {
    // Prefer Capacitor App plugin if present, but avoid hard dependency at call sites.
    if (Capacitor.isPluginAvailable('App')) {
      const { App } = await import('@capacitor/app');
      // @ts-expect-error - openUrl exists in Capacitor App plugin
      await App.openUrl?.({ url: 'app-settings:' });
      return true;
    }
  } catch {
    // Fall through to best-effort URL open below.
  }

  try {
    window.location.assign('app-settings:');
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort file picker to trigger iOS Photos/Files access.
 * Note: iOS decides whether/when to show a prompt; we do not (and cannot) pre-grant this.
 */
export async function openPhotosOrFilesPicker(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<boolean> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options?.accept ?? '*/*';
    input.multiple = options?.multiple ?? false;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';

    let resolved = false;
    const cleanup = () => {
      input.remove();
      window.removeEventListener('focus', onFocus);
    };

    const finish = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(value);
    };

    const onFocus = () => {
      // If user cancels the picker, many browsers only restore focus without firing `change`.
      // Give the browser a tick to populate `files` if it will.
      window.setTimeout(() => {
        if (resolved) return;
        finish(Boolean(input.files && input.files.length > 0));
      }, 300);
    };

    input.addEventListener('change', () => finish(Boolean(input.files && input.files.length > 0)));
    window.addEventListener('focus', onFocus, { once: false });

    document.body.appendChild(input);
    input.click();
  });
}

export async function getPermissionStatus(id: PermissionId): Promise<PermissionStatus> {
  switch (id) {
    case 'notifications': {
      if (!NativePush.isNativePush()) {
        return {
          id,
          state: 'not_applicable',
          canRequest: false,
          canOpenSettings: false,
          detail: 'Native push permissions apply only in the iOS app.',
        };
      }

      const state = await NativePush.checkPermissions();
      return {
        id,
        state,
        canRequest: state === 'prompt',
        canOpenSettings: state === 'denied' && isIOSNative(),
      };
    }

    case 'location': {
      const state = await queryGeolocationPermission();
      return {
        id,
        state,
        // Only request when user initiates a location feature.
        canRequest: state === 'prompt' || state === 'unknown',
        canOpenSettings: state === 'denied' && isIOSNative(),
        detail:
          state === 'unknown'
            ? 'iOS may only reveal status after the first request.'
            : undefined,
      };
    }

    case 'photos_files': {
      // Browsers/iOS do not reliably expose a “Photos/Files permission” state.
      // Access is requested at the moment a user selects a file.
      return {
        id,
        state: 'unknown',
        canRequest: true,
        canOpenSettings: isIOSNative(),
        detail: 'Requested only when you upload a photo, video, or document.',
      };
    }

    case 'microphone': {
      const state = await queryMicrophonePermission();
      return {
        id,
        state,
        canRequest: state === 'prompt' || state === 'unknown',
        canOpenSettings: state === 'denied' && isIOSNative(),
        detail:
          state === 'unknown'
            ? 'Microphone status may only be available after your first voice request.'
            : undefined,
      };
    }

    default: {
      const exhaustiveCheck: never = id;
      return {
        id: exhaustiveCheck,
        state: 'unknown',
        canRequest: false,
        canOpenSettings: false,
      };
    }
  }
}

export async function requestPermission(id: PermissionId): Promise<PermissionState> {
  switch (id) {
    case 'notifications': {
      if (!NativePush.isNativePush()) return 'not_applicable';
      return NativePush.requestPermissions();
    }
    case 'location': {
      return requestGeolocationPermission();
    }
    case 'photos_files': {
      // There is no standalone permission request; opening the picker is the JIT trigger.
      const selected = await openPhotosOrFilesPicker({ multiple: false });
      return selected ? 'granted' : 'unknown';
    }
    case 'microphone': {
      return requestMicrophonePermission();
    }
    default: {
      const exhaustiveCheck: never = id;
      return exhaustiveCheck;
    }
  }
}

