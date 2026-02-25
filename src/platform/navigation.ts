/**
 * Platform-agnostic navigation utilities
 * Web: Uses react-router-dom
 * Mobile: Will use React Navigation or native routing
 */

export interface NavigationOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
}

export interface NavigationService {
  openURL: (url: string, external?: boolean) => void;
  canOpenURL: (url: string) => boolean;
  goBack: () => void;
}

class WebNavigation implements NavigationService {
  openURL(url: string, external = true): void {
    if (external) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = url;
    }
  }

  canOpenURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  goBack(): void {
    window.history.back();
  }
}

export const platformNavigation: NavigationService = new WebNavigation();

/**
 * Note: For in-app navigation with React Router, continue using:
 * - useNavigate() hook
 * - Link component
 * - Navigate component
 *
 * This service is for platform-level navigation utilities (external URLs, back button)
 */
