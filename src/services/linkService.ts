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
    // Use the fetch-og-metadata edge function to get rich previews
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      // Fallback to basic URL parsing
      const urlObj = new URL(url);
      return {
        domain: urlObj.hostname,
        title: urlObj.hostname,
      };
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
      throw new Error(`Failed to fetch OG metadata: ${response.statusText}`);
    }

    const metadata = await response.json();
    
    return {
      domain: metadata.siteName || new URL(url).hostname,
      title: metadata.title,
      image: metadata.image,
      description: metadata.description,
    };
  } catch (error) {
    console.error('Failed to fetch OG metadata:', error);
    // Fallback to basic URL parsing
    try {
      const urlObj = new URL(url);
      return {
        domain: urlObj.hostname,
        title: urlObj.hostname,
      };
    } catch {
      return { domain: 'unknown' };
    }
  }
}