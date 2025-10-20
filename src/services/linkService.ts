import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Tables = Database['public']['Tables'];

export async function insertLinkIndex(params: {
  tripId: string;
  url: string;
  ogTitle?: string | null;
  ogImage?: string | null;
  ogDescription?: string | null;
  domain?: string | null;
  messageId?: string | null;
  submittedBy?: string | null;
}) {
  const { data, error } = await supabase
    .from('trip_link_index')
    .insert({
      trip_id: params.tripId,
      url: params.url,
      og_title: params.ogTitle ?? null,
      og_image_url: params.ogImage ?? null,
      og_description: params.ogDescription ?? null,
      domain: params.domain ?? (new URL(params.url)).hostname,
      message_id: params.messageId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchOpenGraphData(url: string): Promise<{
  title?: string;
  image?: string;
  description?: string;
  domain: string;
}> {
  try {
    // Try to extract metadata from the URL
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // For now, we'll use a simple approach - you can integrate with an OG parser API later
    // or use an edge function to fetch and parse the metadata
    return {
      domain,
      title: urlObj.hostname,
      // These would be populated by an actual OG parser
      image: undefined,
      description: undefined,
    };
  } catch (error) {
    console.error('Failed to parse URL:', error);
    return { domain: 'unknown' };
  }
}