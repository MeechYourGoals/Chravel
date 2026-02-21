/**
 * Image Search Service - Fetches inline images for AI Concierge
 *
 * Calls the ai-images edge function (Google Custom Search).
 * Feature-flagged server-side; returns [] when disabled.
 * Does NOT block or affect the main concierge text flow.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ConciergeImage {
  thumbnailUrl: string;
  imageUrl: string;
  title: string;
  sourceUrl: string;
  sourceDomain: string;
}

export interface ImageSearchResponse {
  images: ConciergeImage[];
}

/**
 * Fetch images for a given query. Used after text response is shown.
 * On error or when feature disabled, returns empty array (never throws).
 */
export async function fetchConciergeImages(
  query: string,
  options?: { count?: number; locale?: string },
): Promise<ConciergeImage[]> {
  const trimmed = (query || '').trim();
  if (trimmed.length < 3) return [];

  try {
    const { data, error } = await supabase.functions.invoke<ImageSearchResponse>('ai-images', {
      body: {
        query: trimmed,
        count: options?.count ?? 6,
        locale: options?.locale,
      },
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.warn('[imageSearchService] ai-images error:', error.message);
      }
      return [];
    }

    return data?.images ?? [];
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[imageSearchService] Unexpected error:', err);
    }
    return [];
  }
}
