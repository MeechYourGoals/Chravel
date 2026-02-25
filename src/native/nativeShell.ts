import { Capacitor } from '@capacitor/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

type KeyboardEventDetail = {
  visible: boolean;
  height: number;
};

declare global {
  interface WindowEventMap {
    'chravel:keyboard': CustomEvent<KeyboardEventDetail>;
  }
}

function isLightTheme(): boolean {
  // Chravel uses a dark-first design system; `.light` switches to light mode.
  return document.documentElement.classList.contains('light');
}

async function syncStatusBarStyle(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const platform = Capacitor.getPlatform();
  const isLight = isLightTheme();

  try {
    if (platform === 'ios') {
      // iOS: overlay web view and set style
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({
        // iOS naming is confusing: Style.Dark = dark text, Style.Light = light text.
        style: isLight ? StatusBarStyle.Dark : StatusBarStyle.Light,
      });
    } else if (platform === 'android') {
      // Android: requires explicit background color + style
      await StatusBar.setBackgroundColor({
        color: isLight ? '#FFFFFF' : '#000000',
      });
      await StatusBar.setStyle({
        style: isLight ? StatusBarStyle.Dark : StatusBarStyle.Light,
      });
    }
  } catch {
    // StatusBar plugin may not be available in all environments (e.g., web).
  }
}

function dispatchKeyboardEvent(detail: KeyboardEventDetail): void {
  window.dispatchEvent(new CustomEvent<KeyboardEventDetail>('chravel:keyboard', { detail }));
}

/**
 * Initialize native-shell-specific behaviors (iOS polish).
 *
 * - Status bar style sync (dark/light)
 * - Keyboard insets as CSS variables + app-wide event for React hooks
 */
export async function initializeNativeShell(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) {
    return () => {};
  }

  // Status bar: apply immediately and keep in sync with theme toggles.
  await syncStatusBarStyle();

  const classObserver = new MutationObserver(() => {
    void syncStatusBarStyle();
  });
  classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  // Keyboard: keep a single app-wide listener (avoid per-screen plugin listeners).
  const showSub = await Keyboard.addListener('keyboardWillShow', info => {
    const height = Math.max(0, info.keyboardHeight ?? 0);
    document.body.classList.add('keyboard-visible');
    document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
    dispatchKeyboardEvent({ visible: true, height });
  });

  const hideSub = await Keyboard.addListener('keyboardWillHide', () => {
    document.body.classList.remove('keyboard-visible');
    document.documentElement.style.removeProperty('--keyboard-height');
    dispatchKeyboardEvent({ visible: false, height: 0 });
  });

  return () => {
    classObserver.disconnect();
    showSub.remove();
    hideSub.remove();
  };
}
