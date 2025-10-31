/**
 * Chat URL Extractor Service
 * Normalizes URLs posted in trip chat for the Media > URLs tab.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { findUrls, normalizeUrl, getDomain } from './urlUtils';
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
  title?: string;      // from link_preview if present
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

export async function extractUrlsFromTripChat(tripId: string): Promise<NormalizedUrl[]> {
  try {
    // Demo / mock mode
    if (MockDataService.isUsingMockData()) return getMockUrls(tripId);

    const { data, error } = await supabase
      .from('trip_link_index')
      .select('id, url, created_at, og_title, domain')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[chatUrlExtractor] Supabase error:', error);
      return [];
    }
    if (!data?.length) return [];

    return data.map(link => ({
      url: link.url,
      rawUrl: link.url,
      domain: link.domain,
      firstSeenAt: link.created_at,
      lastSeenAt: link.created_at,
      messageId: link.id.toString(),
      postedBy: undefined, // user_id column doesn't exist in trip_link_index
      title: link.og_title || undefined,
    }));
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
