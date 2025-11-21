import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const { createOptionsResponse, createErrorResponse, createSecureResponse } = await import('../_shared/securityHeaders.ts');
  
  if (req.method === 'OPTIONS') {
    return createOptionsResponse();
  }

  try {
    const { messageId, content, tripId } = await req.json();
    
    if (!messageId || !content || !tripId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract URLs from message content
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];

    // Extract media from content (basic image detection)
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
    const videoExtensions = /\.(mp4|avi|mov|wmv|flv|webm)(\?.*)?$/i;
    const audioExtensions = /\.(mp3|wav|flac|aac|ogg)(\?.*)?$/i;
    const docExtensions = /\.(pdf|doc|docx|txt|rtf|xls|xlsx|ppt|pptx)(\?.*)?$/i;

    // Process URLs
    for (const url of urls) {
      const domain = new URL(url).hostname;
      
      // Determine if it's a media file
      let mediaType = null;
      if (imageExtensions.test(url)) mediaType = 'image';
      else if (videoExtensions.test(url)) mediaType = 'video';
      else if (audioExtensions.test(url)) mediaType = 'audio';
      else if (docExtensions.test(url)) mediaType = 'document';

      if (mediaType) {
        // Insert into media index
        await supabase
          .from('trip_media_index')
          .insert({
            trip_id: tripId,
            message_id: messageId,
            media_type: mediaType,
            media_url: url,
            filename: url.split('/').pop()?.split('?')[0] || 'Unknown',
            metadata: { source: 'chat' }
          });
      } else {
        // Fetch Open Graph data for regular links
        let ogData: { title: string; description: string; image: string } = { title: '', description: '', image: '' };
        try {
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)' }
          });
          
          if (response.ok) {
            const html = await response.text();
            
            // Basic OG meta extraction
            const titleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
            const descMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"[^>]*>/i);
            const imageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*>/i);
            
            ogData = {
              title: titleMatch?.[1] || '',
              description: descMatch?.[1] || '',
              image: imageMatch?.[1] || ''
            };
          }
        } catch (error) {
          console.log(`Failed to fetch OG data for ${url}:`, error);
        }

        // Insert into link index
        await supabase
          .from('trip_link_index')
          .insert({
            trip_id: tripId,
            message_id: messageId,
            url: url,
            domain: domain,
            og_title: ogData.title,
            og_description: ogData.description,
            og_image_url: ogData.image
          });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed: { urls: urls.length }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error parsing message:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});