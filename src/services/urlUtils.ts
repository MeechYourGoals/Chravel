/**
 * URL utilities for extracting, normalizing, and processing URLs
 * Used by Media URLs feature to aggregate links from chat
 */

/**
 * Regex to match URLs in text (handles http/https, bare domains, paths)
 * Captures: protocol-optional domains with valid TLDs and optional paths
 */
export const URL_REGEX =
  /\b((?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"'`()$[\]{}]*)?)/gi;

/**
 * Extract all URLs from a text string
 * @param text - Input text to search for URLs
 * @returns Array of URL strings (normalized to include https://)
 */
export function findUrls(text: string): string[] {
  if (!text) return [];
  
  const raw = [...text.matchAll(URL_REGEX)].map(m => m[1]);
  
  return raw
    .map(u => (u.startsWith('http') ? u : `https://${u}`))
    .filter(Boolean);
}

/**
 * Normalize a URL by:
 * - Removing tracking parameters (utm_*, fbclid, gclid, etc.)
 * - Removing hash fragments
 * - Removing trailing slashes (except root)
 * - Lowercasing hostname
 * 
 * @param input - URL string to normalize
 * @returns Normalized URL string
 */
export function normalizeUrl(input: string): string {
  try {
    const u = new URL(input);
    
    // Remove hash
    u.hash = '';
    
    // Strip UTM + common tracking params
    [...u.searchParams.keys()]
      .filter(k => /^utm_|^fbclid$|^gclid$|^igshid$|^si$|^mc_cid$|^mc_eid$/.test(k))
      .forEach(k => u.searchParams.delete(k));
    
    // Remove trailing slash (except for root path)
    if (u.pathname !== '/' && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    
    // Lowercase hostname for consistency
    u.hostname = u.hostname.toLowerCase();
    
    return u.toString();
  } catch {
    // If URL parsing fails, return original
    return input;
  }
}

/**
 * Extract clean domain from URL
 * @param input - URL string
 * @returns Domain without www prefix
 */
export function getDomain(input: string): string {
  try {
    return new URL(input).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Check if two URLs are effectively the same after normalization
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns true if normalized URLs match
 */
export function urlsMatch(url1: string, url2: string): boolean {
  try {
    return normalizeUrl(url1) === normalizeUrl(url2);
  } catch {
    return false;
  }
}

/**
 * Truncate URL for display purposes
 * @param url - URL to truncate
 * @param maxLength - Maximum length (default 60)
 * @returns Truncated URL with ellipsis in middle
 */
export function truncateUrl(url: string, maxLength: number = 60): string {
  if (url.length <= maxLength) return url;
  
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname + urlObj.search;
    
    if (domain.length >= maxLength - 3) {
      return domain.substring(0, maxLength - 3) + '...';
    }
    
    const remainingLength = maxLength - domain.length - 6; // 6 for ".../" and "..."
    const pathStart = path.substring(0, Math.floor(remainingLength / 2));
    const pathEnd = path.substring(path.length - Math.floor(remainingLength / 2));
    
    return `${domain}/...${pathEnd}`;
  } catch {
    // Fallback to simple truncation
    const half = Math.floor(maxLength / 2) - 2;
    return url.substring(0, half) + '...' + url.substring(url.length - half);
  }
}
