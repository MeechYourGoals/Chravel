import { useState, useEffect, useRef } from 'react';
import { fetchOGMetadata, type OGMetadata } from '@/services/ogMetadataService';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  domain?: string;
}

/** Extract the first URL from message text */
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/i;

function extractUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match ? match[0] : null;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Client-side link preview enrichment for messages.
 * Detects URLs in message content and fetches OG metadata via the
 * existing fetch-og-metadata edge function.
 *
 * Returns a map of messageId → LinkPreview for messages that have URLs
 * and whose previews have been fetched.
 */
export function useLinkPreviews(
  messages: Array<{ id: string; text: string; linkPreview?: unknown }>,
): Record<string, LinkPreview> {
  const [previews, setPreviews] = useState<Record<string, LinkPreview>>({});
  const fetchedUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (messages.length === 0) return;

    // Find messages with URLs that don't already have link previews
    const messagesToFetch: Array<{ id: string; url: string }> = [];

    for (const msg of messages) {
      // Skip if this message already has a DB-stored link preview
      if (msg.linkPreview) continue;
      // Skip if we already fetched for this message
      if (previews[msg.id]) continue;

      const url = extractUrl(msg.text);
      if (!url) continue;
      // Skip if we already fetched this URL (dedup across messages)
      if (fetchedUrlsRef.current.has(url)) continue;

      messagesToFetch.push({ id: msg.id, url });
      fetchedUrlsRef.current.add(url);
    }

    if (messagesToFetch.length === 0) return;

    // Fetch OG metadata for new URLs (max 3 concurrent)
    const fetchAll = async () => {
      const results: Record<string, LinkPreview> = {};

      // Process in small batches to avoid overwhelming the edge function
      const BATCH_SIZE = 3;
      for (let i = 0; i < messagesToFetch.length; i += BATCH_SIZE) {
        const batch = messagesToFetch.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async ({ id, url }) => {
          const metadata: OGMetadata = await fetchOGMetadata(url);
          if (!metadata.error) {
            results[id] = {
              url,
              title: metadata.title,
              description: metadata.description,
              image: metadata.image,
              domain: getDomain(url),
            };
          }
        });
        await Promise.all(promises);
      }

      if (Object.keys(results).length > 0) {
        setPreviews(prev => ({ ...prev, ...results }));
      }
    };

    fetchAll();
  }, [messages, previews]);

  return previews;
}
