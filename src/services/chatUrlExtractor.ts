import { unifiedMessagingService } from './unifiedMessagingService';
import { demoModeService } from './demoModeService';
import { findUrls, normalizeUrl, getDomain, NormalizedUrl } from './urlUtils';

export async function extractUrlsFromTripChat(tripId: string): Promise<NormalizedUrl[]> {
  // Fetch recent messages (fallback to demo if needed)
  let messages: any[] = [];
  try {
    messages = await unifiedMessagingService.getMessages(tripId, 200);
  } catch (e) {
    try {
      const mock = await demoModeService.getMockMessages('consumer-trip');
      messages = mock.map(m => ({
        id: m.id,
        content: m.message_content,
        author_name: m.sender_name,
        created_at: new Date(Date.now() - (m.timestamp_offset_days || 0) * 86400000).toISOString(),
      }));
    } catch {
      messages = [];
    }
  }

  const map = new Map<string, NormalizedUrl>();

  for (const msg of messages) {
    const text: string = msg.content || '';
    const urls = findUrls(text);
    if (!urls || urls.length === 0) continue;

    for (const raw of urls) {
      const normalized = normalizeUrl(raw);
      const key = normalized;
      const existing = map.get(key);
      const createdAt = msg.created_at || new Date().toISOString();

      if (!existing) {
        map.set(key, {
          url: normalized,
          rawUrl: raw,
          domain: getDomain(normalized),
          firstSeenAt: createdAt,
          lastSeenAt: createdAt,
          messageId: msg.id,
          postedBy: msg.user_id || msg.author_name ? { id: msg.user_id || msg.author_name, name: msg.author_name } : undefined,
          title: (msg.link_preview && (msg.link_preview.title || msg.link_preview.og_title)) || undefined,
        });
      } else {
        // Update last seen if newer
        if (new Date(createdAt).getTime() > new Date(existing.lastSeenAt).getTime()) {
          existing.lastSeenAt = createdAt;
          existing.messageId = msg.id;
        }
        // Preserve earliest firstSeenAt
        if (new Date(createdAt).getTime() < new Date(existing.firstSeenAt).getTime()) {
          existing.firstSeenAt = createdAt;
        }
      }
    }
  }

  // Sort by most recent occurrence
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  );
}
