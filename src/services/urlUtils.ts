export const URL_REGEX = /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"]*?)?)(?=[\s.,!?;:)]|$)/gi;

export function findUrls(text: string): string[] {
  if (!text) return [];
  try {
    const raw = [...text.matchAll(URL_REGEX)].map(m => m[1]);
    return raw
      .map(u => (u.startsWith('http') ? u : `https://${u}`))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function normalizeUrl(input: string): string {
  try {
    const u = new URL(input);
    u.hash = '';
    // strip UTM + common tracking params
    [...u.searchParams.keys()]
      .filter(k => /^(utm_|fbclid$|gclid$|igshid$|si$)/i.test(k))
      .forEach(k => u.searchParams.delete(k));
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    u.hostname = u.hostname.toLowerCase();
    return u.toString();
  } catch {
    return input;
  }
}

export function getDomain(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function truncateUrlForDisplay(input: string, max = 64): string {
  if (!input) return '';
  if (input.length <= max) return input;
  try {
    const u = new URL(input);
    const path = u.pathname || '/';
    const segments = path.split('/').filter(Boolean);
    const last = segments[segments.length - 1] || '';
    const display = `${u.hostname}/${segments.length > 1 ? '…/' : ''}${last}`;
    return display.length > max ? `${display.slice(0, max - 1)}…` : display;
  } catch {
    return input.length > max ? `${input.slice(0, max - 1)}…` : input;
  }
}

export type NormalizedUrl = {
  url: string;           // normalized
  rawUrl: string;        // original from message
  domain: string;        // e.g. youtube.com
  firstSeenAt: string;   // ISO
  lastSeenAt: string;    // ISO
  messageId: string;
  postedBy?: { id: string; name?: string; avatar_url?: string };
  title?: string;
};
