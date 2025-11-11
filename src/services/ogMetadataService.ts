/**
 * OG Metadata Service
 * 
 * Fetches Open Graph metadata (title, description, image) for URLs
 * Used to enhance URL previews in Media > URLs tab
 * 
 * @module services/ogMetadataService
 */

export interface OGMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
  url?: string;
  error?: string;
}

/**
 * Fetches OG metadata from a URL
 * Uses a CORS proxy or edge function to avoid CORS issues
 * 
 * @param url - URL to fetch metadata for
 * @returns Promise with OG metadata or error
 */
export async function fetchOGMetadata(url: string): Promise<OGMetadata> {
  try {
    // Use Supabase edge function to fetch metadata (avoids CORS)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-og-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[ogMetadataService] Error fetching metadata:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Categorizes a URL based on domain and metadata
 * 
 * @param url - URL to categorize
 * @param metadata - Optional OG metadata
 * @returns Category: 'receipt' | 'schedule' | 'booking' | 'general'
 */
export function categorizeUrl(url: string, metadata?: OGMetadata): 'receipt' | 'schedule' | 'booking' | 'general' {
  const domain = new URL(url).hostname.toLowerCase();
  const title = metadata?.title?.toLowerCase() || '';
  const description = metadata?.description?.toLowerCase() || '';

  // Receipt indicators
  const receiptDomains = ['venmo.com', 'paypal.com', 'square.com', 'stripe.com', 'receipt', 'invoice'];
  const receiptKeywords = ['receipt', 'invoice', 'payment', 'paid', 'transaction', 'confirmation'];

  // Schedule/Calendar indicators
  const scheduleDomains = ['calendar.google.com', 'outlook.com', 'calendly.com', 'doodle.com'];
  const scheduleKeywords = ['calendar', 'schedule', 'appointment', 'meeting', 'event', 'reservation'];

  // Booking indicators
  const bookingDomains = [
    'airbnb.com', 'booking.com', 'expedia.com', 'hotels.com', 
    'kayak.com', 'priceline.com', 'tripadvisor.com',
    'opentable.com', 'resy.com', 'tock.com'
  ];
  const bookingKeywords = ['book', 'reservation', 'check-in', 'check-out', 'hotel', 'flight', 'restaurant'];

  // Check domain matches
  if (receiptDomains.some(d => domain.includes(d))) return 'receipt';
  if (scheduleDomains.some(d => domain.includes(d))) return 'schedule';
  if (bookingDomains.some(d => domain.includes(d))) return 'booking';

  // Check metadata keywords
  const combinedText = `${title} ${description}`;
  
  if (receiptKeywords.some(k => combinedText.includes(k))) return 'receipt';
  if (scheduleKeywords.some(k => combinedText.includes(k))) return 'schedule';
  if (bookingKeywords.some(k => combinedText.includes(k))) return 'booking';

  return 'general';
}

/**
 * Batch fetch OG metadata for multiple URLs
 * 
 * @param urls - Array of URLs to fetch metadata for
 * @param concurrency - Max concurrent requests (default: 3)
 * @returns Promise with array of metadata results
 */
export async function batchFetchOGMetadata(
  urls: string[],
  concurrency: number = 3
): Promise<Map<string, OGMetadata>> {
  const results = new Map<string, OGMetadata>();
  
  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const promises = batch.map(async (url) => {
      const metadata = await fetchOGMetadata(url);
      return { url, metadata };
    });
    
    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ url, metadata }) => {
      results.set(url, metadata);
    });
  }
  
  return results;
}
