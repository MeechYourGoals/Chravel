/**
 * Hook for accessing app version information
 *
 * Fetches and caches app version, build number, and platform info
 * for display in settings and about screens.
 */

import { useState, useEffect } from 'react';
import { getAppVersion, formatVersionDisplay, type AppVersion } from '@/native/appInfo';

interface UseAppVersionResult {
  version: AppVersion | null;
  displayString: string;
  isLoading: boolean;
  error: string | null;
}

export function useAppVersion(): UseAppVersionResult {
  const [version, setVersion] = useState<AppVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadVersion() {
      try {
        const appVersion = await getAppVersion();
        if (mounted) {
          setVersion(appVersion);
          setIsLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load version');
          setIsLoading(false);
        }
      }
    }

    loadVersion();

    return () => {
      mounted = false;
    };
  }, []);

  const displayString = version ? formatVersionDisplay(version) : 'Loading...';

  return {
    version,
    displayString,
    isLoading,
    error,
  };
}
