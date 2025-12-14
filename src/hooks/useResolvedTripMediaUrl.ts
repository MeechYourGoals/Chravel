import { useEffect, useState } from 'react';
import { resolveTripMediaUrl } from '@/services/tripMediaUrlResolver';

export function useResolvedTripMediaUrl(params: {
  url: string | null | undefined;
  metadata?: unknown;
}): string | null {
  const { url, metadata } = params;
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(url ?? null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!url) {
        setResolvedUrl(null);
        return;
      }

      // Optimistic: show the stored URL immediately (helps thumbnail paint).
      setResolvedUrl(url);

      try {
        const signed = await resolveTripMediaUrl({ mediaUrl: url, metadata });
        if (!cancelled) setResolvedUrl(signed);
      } catch {
        // Keep the original URL on failure.
        if (!cancelled) setResolvedUrl(url);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [url, metadata]);

  return resolvedUrl;
}

