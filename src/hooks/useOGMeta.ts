/**
 * Dynamic OG Meta Tag Hook
 *
 * Updates document <head> meta tags for Open Graph and Twitter cards.
 * While OG crawlers use our Vercel edge functions (not the SPA), this hook
 * ensures that:
 * 1. Document title matches the current page
 * 2. SPA-rendered pages have correct meta for bookmarking / tab titles
 * 3. Fallback meta tags are present if a crawler does hit the SPA
 *
 * Usage:
 *   useOGMeta({ title: 'My Trip', description: '...', image: '...' });
 */

import { useEffect } from 'react';

interface OGMetaOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const DEFAULT_TITLE = 'ChravelApp';
const DEFAULT_DESCRIPTION = 'The Group Chat Travel App';
const DEFAULT_IMAGE = 'https://chravel.app/chravelapp-social-20251219.png';

function setMetaTag(property: string, content: string): void {
  // Try property attribute first (og:*), then name attribute (twitter:*)
  let element = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement | null;
  }

  if (element) {
    element.setAttribute('content', content);
  } else {
    const meta = document.createElement('meta');
    if (property.startsWith('og:')) {
      meta.setAttribute('property', property);
    } else {
      meta.setAttribute('name', property);
    }
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }
}

export function useOGMeta(options: OGMetaOptions): void {
  useEffect(() => {
    const title = options.title ? `${options.title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
    const description = options.description || DEFAULT_DESCRIPTION;
    const image = options.image || DEFAULT_IMAGE;
    const url = options.url || window.location.href;
    const type = options.type || 'website';

    // Set document title
    document.title = title;

    // Set OG meta tags
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);
    setMetaTag('og:image', image);
    setMetaTag('og:url', url);
    setMetaTag('og:type', type);

    // Set Twitter meta tags
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);

    // Cleanup: restore defaults on unmount
    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag('og:title', DEFAULT_TITLE);
      setMetaTag('og:description', DEFAULT_DESCRIPTION);
      setMetaTag('og:image', DEFAULT_IMAGE);
      setMetaTag('og:url', window.location.origin);
      setMetaTag('twitter:title', DEFAULT_TITLE);
      setMetaTag('twitter:description', DEFAULT_DESCRIPTION);
      setMetaTag('twitter:image', DEFAULT_IMAGE);
    };
  }, [options.title, options.description, options.image, options.url, options.type]);
}

export default useOGMeta;
