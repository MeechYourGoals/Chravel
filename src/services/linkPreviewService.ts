import { supabase } from '@/integrations/supabase/client';

export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
  siteName?: string;
  resolvedUrl?: string;
  contentType?: string;
  status: 'ok' | 'error' | 'pending';
  errorReason?: string;
}

const memoryCache = new Map<string, LinkPreview>();
const pendingRequests = new Map<string, Promise<LinkPreview>>();

export const linkPreviewService = {
  /**
   * Fetches link preview metadata for a URL.
   * Checks memory cache -> DB cache -> Edge Function.
   */
  async getLinkPreview(url: string): Promise<LinkPreview> {
    const normalizedUrl = new URL(url).href; // Simple normalization

    // 1. Memory Cache
    if (memoryCache.has(normalizedUrl)) {
      return memoryCache.get(normalizedUrl)!;
    }

    // Dedup pending requests
    if (pendingRequests.has(normalizedUrl)) {
      return pendingRequests.get(normalizedUrl)!;
    }

    const fetchPromise = (async () => {
      try {
        // 2. DB Cache (Client-side check to avoid Edge Function overhead if possible)
        // Note: The Edge Function also checks this, but checking here saves an invocation cost.
        // However, we need to hash the URL correctly to match the server side hash.
        // We'll skip client-side hashing for simplicity and rely on the Edge Function for now,
        // or just query by URL if indexed (our table uses URL as unique key).

        const { data: dbPreview, error: dbError } = await supabase
          .from('link_previews')
          .select('*')
          .eq('url', normalizedUrl)
          .single();

        if (dbPreview && !dbError) {
           // Check expiry
           if (new Date(dbPreview.expires_at) > new Date()) {
             const preview: LinkPreview = {
               url: dbPreview.url,
               title: dbPreview.title,
               description: dbPreview.description,
               imageUrl: dbPreview.image_url,
               faviconUrl: dbPreview.favicon_url,
               siteName: dbPreview.site_name,
               resolvedUrl: dbPreview.resolved_url,
               contentType: dbPreview.content_type,
               status: dbPreview.status as 'ok' | 'error' | 'pending',
               errorReason: dbPreview.error_reason,
             };
             memoryCache.set(normalizedUrl, preview);
             return preview;
           }
        }

        // 3. Edge Function (Fetch fresh)
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke('link-preview', {
          body: { url: normalizedUrl },
        });

        if (edgeError) {
            console.error('Edge Function error:', edgeError);
            throw edgeError;
        }

        const preview: LinkPreview = {
            url: edgeData.url || normalizedUrl,
            title: edgeData.title,
            description: edgeData.description,
            imageUrl: edgeData.image_url, // Maps from snake_case in DB/Edge to camelCase
            faviconUrl: edgeData.favicon_url,
            siteName: edgeData.site_name,
            resolvedUrl: edgeData.resolved_url,
            contentType: edgeData.content_type,
            status: edgeData.status || 'ok',
            errorReason: edgeData.error_reason,
        };

        memoryCache.set(normalizedUrl, preview);
        return preview;

      } catch (error) {
        console.error('Link preview fetch failed:', error);
        const errorPreview: LinkPreview = {
            url: normalizedUrl,
            status: 'error',
            errorReason: String(error),
        };
        // Cache failures briefly in memory too
        memoryCache.set(normalizedUrl, errorPreview);
        return errorPreview;
      } finally {
        pendingRequests.delete(normalizedUrl);
      }
    })();

    pendingRequests.set(normalizedUrl, fetchPromise);
    return fetchPromise;
  },

  /**
   * Clears the in-memory cache.
   */
  clearCache() {
    memoryCache.clear();
  }
};
