/**
 * Fetch OG Metadata Edge Function
 * 
 * Fetches Open Graph metadata from URLs to avoid CORS issues
 * Used by Media > URLs tab to show rich previews
 * 
 * @module supabase/functions/fetch-og-metadata
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

interface OGMetadata {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
  url?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChravelBot/1.0; +https://chravel.com)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const metadata: OGMetadata = {};

    // Extract OG tags using regex (simple but effective)
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<title>([^<]+)<\/title>/i);
    if (ogTitleMatch) metadata.title = ogTitleMatch[1].trim();

    const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                                html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i) ||
                                html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    if (ogDescriptionMatch) metadata.description = ogDescriptionMatch[1].trim();

    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      const imageUrl = ogImageMatch[1].trim();
      // Resolve relative URLs
      metadata.image = imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, url).toString();
    }

    const ogSiteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
    if (ogSiteNameMatch) metadata.siteName = ogSiteNameMatch[1].trim();

    const ogTypeMatch = html.match(/<meta\s+property=["']og:type["']\s+content=["']([^"']+)["']/i);
    if (ogTypeMatch) metadata.type = ogTypeMatch[1].trim();

    metadata.url = url;

    return new Response(
      JSON.stringify(metadata),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[fetch-og-metadata] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
