/**
 * Chat URL Extractor Service
 * 
 * Extracts URLs from trip chat messages and normalizes them
 * for display in Media > URLs tab
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { findUrls, normalizeUrl, getDomain } from './urlUtils';
import MockDataService from './mockDataService';

type TripChatMessageForExtraction = Pick<
  Database['public']['Tables']['trip_chat_messages']['Row'],
  'id' | 'content' | 'created_at' | 'user_id' | 'author_name' | 'link_preview'
>;

function extractTitleFromLinkPreview(preview: TripChatMessageForExtraction['link_preview']): string | undefined {
  if (!preview || typeof preview !== 'object') {
    return undefined;
  }

  const record = preview as Record<string, unknown>;
  const candidates: Array<'title' | 'og_title' | 'site_name'> = [
    'title',
    'og_title',
    'site_name',
  ];

  for (const key of candidates) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

export interface NormalizedUrl {
  url: string;           // normalized URL
  rawUrl: string;        // original from message
  domain: string;        // e.g. youtube.com
  firstSeenAt: string;   // ISO timestamp from first message
  lastSeenAt: string;    // ISO timestamp from last message
  messageId: string;     // ID of the most recent message containing this URL
  postedBy?: {           // User who posted the most recent message
    id: string;
    name?: string;
    avatar_url?: string;
  };
  title?: string;        // Optional: from message metadata or OG data
}

/**
 * Extract and normalize URLs from all trip chat messages
 * @param tripId - Trip ID to fetch messages for
 * @returns Promise<NormalizedUrl[]> - Deduplicated, normalized URLs
 */
export async function extractUrlsFromTripChat(tripId: string): Promise<NormalizedUrl[]> {
  try {
    // Check if using mock data
    if (MockDataService.isUsingMockData()) {
      return getMockUrls(tripId);
    }

    // Fetch recent chat messages (limit to last 1000 for performance)
    const { data: messages, error } = await supabase
      .from('trip_chat_messages')
      .select(`
        id,
        content,
        created_at,
        user_id,
        author_name,
        link_preview
      `)
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    // Extract URLs from each message
    const urlMap = new Map<string, NormalizedUrl>();

    for (const msg of (messages as TripChatMessageForExtraction[])) {
      if (!msg.content) continue;

      const urls = findUrls(msg.content);
      const linkPreviewTitle = extractTitleFromLinkPreview(msg.link_preview);

      for (const rawUrl of urls) {
        const normalized = normalizeUrl(rawUrl);
        const domain = getDomain(normalized);

        const existing = urlMap.get(normalized);

        if (existing) {
          // Update with earlier firstSeenAt (messages are DESC ordered)
          existing.firstSeenAt = msg.created_at;
          if (!existing.title && linkPreviewTitle) {
            existing.title = linkPreviewTitle;
          }
        } else {
          // New URL entry
          urlMap.set(normalized, {
            url: normalized,
            rawUrl,
            domain,
            firstSeenAt: msg.created_at,
            lastSeenAt: msg.created_at,
            messageId: msg.id,
            postedBy:
              msg.user_id || msg.author_name
                ? {
                    id: msg.user_id ?? msg.author_name,
                    name: msg.author_name || undefined,
                  }
                : undefined,
            title: linkPreviewTitle,
          });
        }
      }
    }

    // Convert to array and sort by most recent
    const urls = Array.from(urlMap.values());
    urls.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());

    return urls;
  } catch (error) {
    console.error('Error extracting URLs from chat:', error);
    return [];
  }
}

/**
 * Mock URLs for demo/development mode
 */
function getMockUrls(tripId: string): NormalizedUrl[] {
  return [
    {
      url: 'https://www.airbnb.com/rooms/12345678',
      rawUrl: 'https://www.airbnb.com/rooms/12345678?guests=4&adults=4',
      domain: 'airbnb.com',
      firstSeenAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      lastSeenAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      messageId: 'msg-1',
      postedBy: {
        id: 'user-1',
        name: 'Sarah',
      },
      title: 'Cozy 3BR Apartment in Downtown',
    },
    {
      url: 'https://www.youtube.com/watch/abc123',
      rawUrl: 'https://www.youtube.com/watch?v=abc123&t=60s',
      domain: 'youtube.com',
      firstSeenAt: new Date(Date.now() - 86400000).toISOString(),
      lastSeenAt: new Date(Date.now() - 86400000).toISOString(),
      messageId: 'msg-2',
      postedBy: {
        id: 'user-2',
        name: 'Mike',
      },
      title: 'Best Places to Visit Guide',
    },
    {
      url: 'https://www.nytimes.com/travel/guide',
      rawUrl: 'https://www.nytimes.com/travel/guide?utm_source=twitter&utm_medium=social',
      domain: 'nytimes.com',
      firstSeenAt: new Date(Date.now() - 3600000).toISOString(),
      lastSeenAt: new Date(Date.now() - 3600000).toISOString(),
      messageId: 'msg-3',
      postedBy: {
        id: 'user-1',
        name: 'Sarah',
      },
      title: 'Ultimate Travel Guide 2024',
    },
    {
      url: 'https://maps.google.com/place/123',
      rawUrl: 'https://maps.google.com/place/123',
      domain: 'maps.google.com',
      firstSeenAt: new Date(Date.now() - 1800000).toISOString(),
      lastSeenAt: new Date(Date.now() - 1800000).toISOString(),
      messageId: 'msg-4',
      postedBy: {
        id: 'user-3',
        name: 'Alex',
      },
      title: 'Central Park',
    },
    {
      url: 'https://www.ticketmaster.com/event/abc',
      rawUrl: 'https://www.ticketmaster.com/event/abc',
      domain: 'ticketmaster.com',
      firstSeenAt: new Date(Date.now() - 900000).toISOString(),
      lastSeenAt: new Date(Date.now() - 900000).toISOString(),
      messageId: 'msg-5',
      postedBy: {
        id: 'user-2',
        name: 'Mike',
      },
      title: 'Concert Tickets - Summer Tour',
    },
  ];
}
