/**
 * Chat URL Extractor Service
 * Normalizes URLs posted in trip chat for the Media > URLs tab.
 * 
 * ENHANCED: Now includes OG metadata fetching, categorization, and deduplication
 * 
 * @module services/chatUrlExtractor
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { findUrls, normalizeUrl, getDomain } from './urlUtils';
import { fetchOGMetadata, categorizeUrl, type OGMetadata } from './ogMetadataService';
import MockDataService from './mockDataService';

type ChatRow = Pick<
  Database['public']['Tables']['trip_chat_messages']['Row'],
  'id' | 'content' | 'created_at' | 'user_id' | 'author_name' | 'link_preview'
>;

export interface NormalizedUrl {
  url: string;         // normalized URL
  rawUrl: string;      // as typed in chat
  domain: string;      // e.g., youtube.com
  firstSeenAt: string; // oldest occurrence (ISO)
  lastSeenAt: string;  // newest occurrence (ISO)
  messageId: string;   // most recent message id containing this URL
  postedBy?: { id: string; name?: string; avatar_url?: string };
  title?: string;      // from link_preview or OG metadata
  description?: string; // from OG metadata
  image?: string;      // OG image URL
  category?: 'receipt' | 'schedule' | 'booking' | 'general'; // auto-categorized
  ogMetadata?: OGMetadata; // full OG metadata
}

function parsePreview(preview: ChatRow['link_preview']): Record<string, unknown> | undefined {
  if (!preview) return undefined;
  if (typeof preview === 'object') return preview as Record<string, unknown>;
  if (typeof preview === 'string') {
    try { return JSON.parse(preview) as Record<string, unknown>; } catch { return undefined; }
  }
  return undefined;
}

function extractTitleFromLinkPreview(preview: ChatRow['link_preview']): string | undefined {
  const obj = parsePreview(preview);
  if (!obj) return undefined;
  const candidates = ['title', 'og_title', 'ogTitle', 'site_name', 'siteName', 'name'] as const;
  for (const k of candidates) {
    const v = obj[k as keyof typeof obj];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Extract URLs from trip chat with enhanced metadata and categorization
 * 
 * ENHANCED FEATURES:
 * - Fetches OG metadata for URLs missing preview data
 * - Auto-categorizes URLs (receipt/schedule/booking/general)
 * - Deduplicates normalized URLs
 * 
 * @param tripId - Trip ID to extract URLs from
 * @param fetchMetadata - Whether to fetch OG metadata for URLs (default: true)
 * @returns Array of normalized URLs with metadata
 */
export async function extractUrlsFromTripChat(
  tripId: string,
  fetchMetadata: boolean = true
): Promise<NormalizedUrl[]> {
  try {
    // Demo / mock mode
    if (MockDataService.isUsingMockData()) return getMockUrls(tripId);

    const { data, error } = await supabase
      .from('trip_link_index')
      .select('id, url, created_at, og_title, og_description, og_image_url, domain')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[chatUrlExtractor] Supabase error:', error);
      return [];
    }
    if (!data || data.length === 0) return [];

    // Normalize and deduplicate URLs
    const urlMap = new Map<string, NormalizedUrl>();

    for (const link of data) {
      const normalizedUrl = normalizeUrl(link.url || '');
      
      if (urlMap.has(normalizedUrl)) {
        // Update existing entry with latest timestamp
        const existing = urlMap.get(normalizedUrl)!;
        if (new Date(link.created_at || '') > new Date(existing.lastSeenAt)) {
          existing.lastSeenAt = link.created_at || new Date().toISOString();
          existing.messageId = link.id?.toString() || '';
        }
        continue;
      }

      const urlData: NormalizedUrl = {
        url: normalizedUrl,
        rawUrl: link.url || '',
        domain: link.domain || getDomain(link.url || ''),
        firstSeenAt: link.created_at || new Date().toISOString(),
        lastSeenAt: link.created_at || new Date().toISOString(),
        messageId: link.id?.toString() || '',
        postedBy: undefined, // user_id column doesn't exist in trip_link_index
        title: link.og_title || undefined,
        description: link.og_description || undefined,
        image: link.og_image_url || undefined,
      };

      // Fetch OG metadata if missing and requested
      if (fetchMetadata && (!urlData.title || !urlData.description)) {
        try {
          const ogMetadata = await fetchOGMetadata(normalizedUrl);
          if (ogMetadata.title && !urlData.title) urlData.title = ogMetadata.title;
          if (ogMetadata.description && !urlData.description) urlData.description = ogMetadata.description;
          if (ogMetadata.image && !urlData.image) urlData.image = ogMetadata.image;
          urlData.ogMetadata = ogMetadata;
        } catch (err) {
          console.warn('[chatUrlExtractor] Failed to fetch OG metadata for', normalizedUrl, err);
        }
      }

      // Auto-categorize URL
      urlData.category = categorizeUrl(normalizedUrl, urlData.ogMetadata);

      urlMap.set(normalizedUrl, urlData);
    }

    return Array.from(urlMap.values());
  } catch (e) {
    console.error('[chatUrlExtractor] Unexpected error:', e);
    return [];
  }
}

/** Mock data for demo mode */
function getMockUrls(_tripId: string): NormalizedUrl[] {
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();
  return [
    {
      url: 'https://www.airbnb.com/rooms/12345678',
      rawUrl: 'https://www.airbnb.com/rooms/12345678?guests=4&adults=4',
      domain: 'airbnb.com',
      firstSeenAt: iso(now - 86_400_000 * 2),
      lastSeenAt: iso(now - 86_400_000 * 2),
      messageId: 'msg-1',
      postedBy: { id: 'user-1', name: 'Sarah' },
      title: 'Cozy 3BR Apartment in Downtown',
    },
    {
      url: 'https://www.youtube.com/watch?v=abc123',
      rawUrl: 'https://www.youtube.com/watch?v=abc123&t=60s',
      domain: 'youtube.com',
      firstSeenAt: iso(now - 86_400_000),
      lastSeenAt: iso(now - 86_400_000),
      messageId: 'msg-2',
      postedBy: { id: 'user-2', name: 'Mike' },
      title: 'Best Places to Visit Guide',
    },
  ];
}
