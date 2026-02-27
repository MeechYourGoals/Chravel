
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// SSRF Protection
const isPrivateIP = (hostname: string) => {
  if (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('0.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    (hostname.startsWith('172.') && // Check 172.16.x.x to 172.31.x.x
      parseInt(hostname.split('.')[1], 10) >= 16 &&
      parseInt(hostname.split('.')[1], 10) <= 31) ||
    hostname.endsWith('.local')
  ) {
    return true;
  }
  return false;
};

// Simple URL Hash
async function sha256(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async req => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Basic URL validation
    let validUrl: URL;
    try {
      validUrl = new URL(url);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // SSRF Check
    if (validUrl.protocol !== 'http:' && validUrl.protocol !== 'https:') {
      return new Response(JSON.stringify({ error: 'Only HTTP/HTTPS allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (isPrivateIP(validUrl.hostname)) {
      return new Response(JSON.stringify({ error: 'Private IPs not allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash the normalized URL for caching
    const normalizedUrl = validUrl.href;
    const urlHash = await sha256(normalizedUrl);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check Cache
    const { data: cached, error: cacheError } = await supabase
      .from('link_previews')
      .select('*')
      .eq('url_hash', urlHash)
      .single();

    if (cached && !cacheError) {
      const now = new Date();
      if (new Date(cached.expires_at) > now) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // If expired, we proceed to re-fetch, but could optionally use stale-while-revalidate strategy here if needed.
    }

    // 2. Fetch Metadata
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    let fetchResponse;
    try {
      fetchResponse = await fetch(normalizedUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; ChravelBot/1.0; +https://chravel.com)',
        },
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      // Cache failure briefly (1 hour)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await supabase.from('link_previews').upsert(
        {
          url: normalizedUrl,
          url_hash: urlHash,
          status: 'error',
          error_reason: String(err),
          expires_at: expiresAt,
        },
        { onConflict: 'url' },
      );
      return new Response(JSON.stringify({ error: 'Fetch failed', details: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    clearTimeout(timeoutId);

    if (!fetchResponse.ok) {
       // Cache failure briefly
       const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
       await supabase.from('link_previews').upsert(
         {
           url: normalizedUrl,
           url_hash: urlHash,
           status: 'error',
           error_reason: `HTTP ${fetchResponse.status}`,
           expires_at: expiresAt,
         },
         { onConflict: 'url' },
       );
       return new Response(
        JSON.stringify({ error: `HTTP ${fetchResponse.status}` }),
        {
           status: fetchResponse.status,
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
       );
    }

    // Check content type
    const contentType = fetchResponse.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
        // Not HTML, create a basic file card or skip
        // For now, we return minimal info for non-HTML
        const preview = {
            url: normalizedUrl,
            url_hash: urlHash,
            title: normalizedUrl.split('/').pop() || normalizedUrl,
            description: contentType,
            content_type: contentType,
            status: 'ok',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        };
        await supabase.from('link_previews').upsert(preview, { onConflict: 'url' });
        return new Response(JSON.stringify(preview), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const html = await fetchResponse.text();

    // 3. Parse Metadata (Regex)
    // Using Regex is simpler/faster for Deno Edge Functions without heavy DOM parsers
    // Updated to handle attributes in any order (property first or content first)
    const getMeta = (prop: string, name?: string) => {
        const propName = name ? `(?:${prop}|${name})` : prop;
        // Matches: <meta ... property="og:title" ... content="Title" ... >
        // OR: <meta ... content="Title" ... property="og:title" ... >
        const pattern = new RegExp(
            `<meta[^>]+(?:property|name)=["']${propName}["'][^>]*content=["']([^"']+)["']|` +
            `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${propName}["']`,
            'i'
        );
        const match = html.match(pattern);
        return match ? (match[1] || match[2]) : null;
    };

    const title =
        getMeta('og:title', 'twitter:title') ||
        html.match(/<title>([^<]+)<\/title>/i)?.[1] ||
        validUrl.hostname;

    const description =
        getMeta('og:description', 'twitter:description') ||
        getMeta('description');

    let imageUrl =
        getMeta('og:image', 'twitter:image');

    const siteName =
        getMeta('og:site_name') ||
        validUrl.hostname;

    // Resolve relative URLs
    if (imageUrl && !imageUrl.startsWith('http')) {
        imageUrl = new URL(imageUrl, normalizedUrl).href;
    }

    // Favicon heuristic (simple)
    // <link rel="icon" href="..."> or just /favicon.ico
    let faviconUrl = html.match(/<link\s+rel=["'](?:shortcut )?icon["']\s+href=["']([^"']+)["']/i)?.[1];
    if (faviconUrl && !faviconUrl.startsWith('http')) {
        faviconUrl = new URL(faviconUrl, normalizedUrl).href;
    } else if (!faviconUrl) {
        faviconUrl = new URL('/favicon.ico', normalizedUrl).href;
    }

    const previewData = {
        url: normalizedUrl,
        url_hash: urlHash,
        title: title ? title.trim() : null,
        description: description ? description.trim() : null,
        image_url: imageUrl,
        favicon_url: faviconUrl,
        site_name: siteName ? siteName.trim() : null,
        resolved_url: fetchResponse.url, // Handle redirects
        content_type: 'text/html',
        status: 'ok',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    // 4. Save to Cache
    const { error: upsertError } = await supabase
        .from('link_previews')
        .upsert(previewData, { onConflict: 'url' });

    if (upsertError) {
        console.error('Failed to cache preview:', upsertError);
    }

    return new Response(JSON.stringify(previewData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
